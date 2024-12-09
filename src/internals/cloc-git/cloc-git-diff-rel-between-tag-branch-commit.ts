import path from "path"
import { map, concatMap, catchError, of, Observable, mergeMap, tap, toArray, reduce, forkJoin, from } from "rxjs"

import json2md from 'json2md'

import { toCsvObs } from "@enrico.piccinin/csv-tools"
import { readLinesObs, writeFileObs } from "observable-fs"

import { ComparisonEnd, comparisonEndString, buildFileGitUrl, gitDiff$ } from "../git/git-diffs"
import { explainGitDiffs$ } from "../chat/explain-diffs"
import { getDefaultPromptTemplates, PromptTemplates } from "../prompt-templates/prompt-templates"
import { summarizeDiffs$ } from "./summarize-diffs"
import { ClocGitDiffRec, ComparisonParams, hasCodeAddedRemovedModified, comparisonResultFromClocDiffRelOrGitDiffForProject$, hasClocInfoDetails } from "./cloc-diff-rel"
import { DefaultMessageWriter, MessageToClient, MessageWriter, newInfoMessage } from "../message-writer/message-writer"

//********************************************************************************************************************** */
//****************************   APIs                               **************************************************** */
//********************************************************************************************************************** */

// FileDiffWithGitDiffsAndFileContent defines the objects containing:
// - the cloc git diff information
// - the git diff information (the diffLines returned by git diff command and the status of the file, deleted, added, copied, renamed -
//   the status is determined by the second line of the git diff command output)
// - the file content
export type FileStatus = {
    deleted: null | boolean,
    added: null | boolean,
    copied: null | boolean,
    renamed: null | boolean,
}
export type FileGitInfo = {
    fileGitUrl: string
}
export type FileDiffWithGitDiffsAndFileContent = ClocGitDiffRec & FileStatus & FileGitInfo & {
    diffLines: string,
    fileContent: string,
}

export function allDiffsForProject$(
    comparisonParams: ComparisonParams,
    executedCommands: string[],
    languages?: string[],
    messageWriter: MessageWriter = DefaultMessageWriter
): Observable<FileDiffWithGitDiffsAndFileContent> {
    let count = 0
    let totNumFiles = 0
    return comparisonResultFromClocDiffRelOrGitDiffForProject$(comparisonParams, executedCommands, languages).pipe(
        // toArray to calculate the total number of files
        toArray(),
        tap(comapareResults => {
            totNumFiles = comapareResults.length
            const msg = newInfoMessage(`Total number of files: ${totNumFiles}`)
            messageWriter.write(msg)
        }),
        // mergeMap to emit each file diff record and start the stream of git diff for each file again
        mergeMap((compareResult) => compareResult),
        // we MUST use concatMap here to ensure that gitDiff$ is not streaming concurrently but only sequentially
        // in other words gitDiff$ must return the bufferDiffLines value before starting for the next one
        // gitDiffs$ eventually calls the command "git diff" which outputs on the stdout - gitDiffs$ Observable accumulates the output
        // sent to the stdout and returns it as a buffer string (diffLinesString)
        // Using concatMap (which just mergeMap with concurrency set to 1) ensures that the command "git diff" 
        // is not executed concurrently for different projects
        concatMap(rec => {
            const msgText = `Calculating git diff for ${rec.fullFilePath} (${++count}/${totNumFiles})`
            const msg: MessageToClient = newInfoMessage(msgText)
            messageWriter.write(msg)
            return gitDiff$(
                rec.projectDir!,
                comparisonParams.from_tag_branch_commit,
                comparisonParams.to_tag_branch_commit,
                rec.File,
                !!comparisonParams.use_ssh, // the double negarion converts to boolean in case it is undefined
                executedCommands
            ).pipe(
                map(diffLinesString => {
                    const diffLines = diffLinesString.toString()
                    const _lines = diffLines.split('\n')
                    const fileGitUrl = buildFileGitUrl(
                        comparisonParams.url_to_repo, 
                        comparisonParams.from_tag_branch_commit.tag_branch_commit, 
                        rec.File
                    )
                    const _rec: FileDiffWithGitDiffsAndFileContent = {
                        ...rec, diffLines, fileContent: '', deleted: null, added: null, copied: null, renamed: null, fileGitUrl
                    }
                    if (_lines.length < 2) {
                        console.log(`No diff found for file ${rec.fullFilePath}`)
                        executedCommands.push(`===>>> No diff found for file ${rec.fullFilePath}`)
                        return { ..._rec, diffLines }
                    }
                    const secondLine = _lines[1]
                    if (secondLine.startsWith('deleted file mode')) {
                        _rec.deleted = true
                    } else if (secondLine.startsWith('new file mode')) {
                        _rec.added = true
                    } else if (secondLine.startsWith('copy ')) {
                        _rec.copied = true
                    } else if (secondLine.startsWith('rename ')) {
                        _rec.renamed = true
                    }
                    const __rec: FileDiffWithGitDiffsAndFileContent = { ..._rec, diffLines }
                    return __rec
                })
            )
        }),
        concatMap((rec) => {
            return readLinesObs(rec.fullFilePath!).pipe(
                map(lines => {
                    const _rec: FileDiffWithGitDiffsAndFileContent = { ...rec, fileContent: lines.join('\n') }
                    return _rec
                }),
                catchError(err => {
                    if (err.code === 'ENOENT') {
                        const _rec: FileDiffWithGitDiffsAndFileContent = { ...rec, fileContent: 'file not found' }
                        return of(_rec)
                    }
                    throw err
                })
            )
        }),
    )
}

export type FileDiffWithExplanation = FileDiffWithGitDiffsAndFileContent & {
    explanation: string,
    linesOfCodeString: string,
}
export function allDiffsForProjectWithExplanation$(
    comparisonParams: ComparisonParams,
    promptTemplates: PromptTemplates,
    model: string,
    executedCommands: string[],
    diffsKey: string,
    languages?: string[],
    messageWriter: MessageWriter = DefaultMessageWriter,
    outDirForChatLog?: string,
    concurrentLLMCalls = 5
): Observable<FileDiffWithExplanation> {
    const startingMsg = newInfoMessage(`Starting all diffs with explanations`)
    messageWriter.write(startingMsg)

    const startExecTime = new Date()

    // search in the store for diffs with the key diffsKey and the from_tag_branch_commit and to_tag_branch_commit values
    // if the diffs are found in the store, we reuse them, otherwise we calculate the diffs and store them in the store
    const diffs = DiffsStore.getStore().getDiffs(diffsKey, comparisonParams.from_tag_branch_commit, comparisonParams.to_tag_branch_commit)
    // if diffsKey is defined, it means that it has been passed by the client, which means that it was already
    // generated in the first round of prompts and we can reuse it to fetch the diffs from the store
    // otherwise we calculate the file diffs, store the diffs, generate a new key and send the key back to the client
    const diffs$ = diffs ? from(diffs) : allDiffsForProject$(comparisonParams, executedCommands, languages, messageWriter).pipe(
            toArray(),
            concatMap((compareResults) => {
                const store = DiffsStore.getStore()
                const newDiffsKey = store.storeDiffs(
                    compareResults, 
                    comparisonParams.from_tag_branch_commit, 
                    comparisonParams.to_tag_branch_commit
                )
                const msg = newInfoMessage(newDiffsKey)
                msg.id = 'diffs-stored'
                messageWriter.write(msg)
                return from(compareResults)
            })
        )
    
    return diffs$.pipe(
        mergeMap((comparisonResult: FileDiffWithGitDiffsAndFileContent) => {
            return buildExplanation(
                comparisonResult, promptTemplates, model, executedCommands, messageWriter, outDirForChatLog
            )
        }, concurrentLLMCalls),
        tap({
            complete: () => {
                console.log(`\n\nCompleted all diffs with explanations in ${new Date().getTime() - startExecTime.getTime()} ms\n\n`)
            }
        })
    )
}

export function writeAllDiffsForProjectWithExplanationToCsv$(
    comparisonParams: ComparisonParams,
    promptTemplates: PromptTemplates,
    outdir: string,
    model: string,
    diffsKey: string,
    languages?: string[]
) {
    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    const executedCommands: string[] = []

    const projectDirName = path.basename(comparisonParams.projectDir)

    return allDiffsForProjectWithExplanation$(
        comparisonParams, 
        promptTemplates, 
        model, 
        executedCommands, 
        diffsKey,
        languages, 
        DefaultMessageWriter, 
        outdir
    ).pipe(
        // replace any ',' in the explanation with a '-'
        map((diffWithExplanation) => {
            diffWithExplanation.explanation = diffWithExplanation.explanation.replace(/,/g, '-')
            diffWithExplanation.explanation = diffWithExplanation.explanation.replace(/;/g, ' ')
            return diffWithExplanation
        }),
        toCsvObs(),
        toArray(),
        concatMap((compareResult) => {
            const outFile = path.join(outdir, `${projectDirName}-compare-with-explanations-${timeStampYYYYMMDDHHMMSS}.csv`);
            return writeCompareResultsToCsv$(compareResult, projectDirName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${projectDirName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeExecutedCommands$(executedCommands, projectDirName, outFile)
        })
    )
}

export type GenerateMdReportParams = {
    comparisonParams: ComparisonParams,
    promptTemplates: PromptTemplates,
    outdir: string,
    llmModel: string,
    diffsKey: string,
    languages?: string[]
}
export function writeAllDiffsForProjectWithExplanationToMarkdown$(
    params: GenerateMdReportParams, messageWriter: MessageWriter
) {
    const comparisonParams = params.comparisonParams
    const promptTemplates = params.promptTemplates
    const outdir = params.outdir
    const llmModel = params.llmModel
    const diffsKey = params.diffsKey
    const languages = params.languages

    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    const executedCommands: string[] = []

    const projectName = path.basename(comparisonParams.projectDir)

    const repoUrl = comparisonParams.url_to_repo
    const gitWebClientCommandUrl = gitWebClientCommand(
        repoUrl, 
        comparisonParams.from_tag_branch_commit, 
        comparisonParams.to_tag_branch_commit,
    )
    const mdJson = initializeMarkdown(comparisonParams, gitWebClientCommandUrl, languages)

    return allDiffsForProjectWithExplanation$(
        comparisonParams, promptTemplates, llmModel, executedCommands, diffsKey, languages, messageWriter, outdir
    ).pipe(
        toArray(),
        concatMap((diffsWithExplanation: FileDiffWithExplanation[]) => {
            appendNumFilesWithDiffsToMdJson(mdJson, diffsWithExplanation.length)
            if (diffsWithExplanation.length > 0 && hasClocInfoDetails(diffsWithExplanation[0])) {
                appendNumLinesOfCode(mdJson, diffsWithExplanation)
            }
            const promptForSummaryTemplate = promptTemplates?.summary?.prompt
            return summarizeDiffs$(
                diffsWithExplanation, 
                languages, 
                projectName, 
                llmModel, 
                promptForSummaryTemplate, 
                executedCommands,
                messageWriter
            ).pipe(
                map(summary => {
                    appendSummaryToMdJson(mdJson, summary)
                    return diffsWithExplanation
                })
            )
        }),
        map((diffWithExplanation) => {
            // sum the lines of code modified, added, removed for each file and sort the files in descending order of the sum of these lines
            diffWithExplanation.sort((a, b) => {
                const sumA = parseInt(a.code_modified) + parseInt(a.code_added) + parseInt(a.code_removed)
                const sumB = parseInt(b.code_modified) + parseInt(b.code_added) + parseInt(b.code_removed)
                return sumB - sumA
            })
            return diffWithExplanation
        }),
        tap(diffs => {   
            const msg = newInfoMessage(diffs)
            msg.id = 'diffs-generated'
            messageWriter.write(msg)
        }),
        concatMap(diffs => diffs),
        reduce((mdJson, diffWithExplanation: FileDiffWithExplanation) => {
            appendCompResultToMdJson(mdJson, diffWithExplanation)
            return mdJson
        }, mdJson),
        tap(mdJson => {
            const _promptTemplates = promptTemplates || getDefaultPromptTemplates()
            appendPromptsToMdJson(mdJson, _promptTemplates)
        }),
        concatMap((mdJson) => {
            const outMarkdownFile = path.join(outdir, `${projectName}-compare-with-explanations-${timeStampYYYYMMDDHHMMSS}.md`);
            const outExecutedCommandsFile = path.join(outdir, `${projectName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
            return forkJoin([
                writeCompareResultsToMarkdown$(mdJson, projectName, outMarkdownFile),
                writeExecutedCommands$(executedCommands, projectName, outExecutedCommandsFile),
            ]).pipe(
                map(([markdownFilePath, executedCommandFilePath]) => {
                    return { markdownFilePath, executedCommandFilePath }
                }),
            )
        }),
    )
}


//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes

// DiffsStore is a singleton class to store the diffs calculated during a run of the program
// It is used to enable to prompt the LLM with different prompts for the same set of file diffs
// The idea is that:
// - for the first round the diffs are calculated and the LLM is prompted with the first prompt
// - for subsequent rounds we just receive a new prompt from the client but we reuse the diffs calculated in the first round
// in this way we avoid to recalculate the diffs for each prompt round
// This requires that for the first round a unique identifier is generated and is used as the key to store the diffs
// The unique identifier is then returned to the client and is used to refer to the diffs in subsequent rounds
// Therefore the client must keep track of the unique identifier and send it back to the server in subsequent rounds
type StoreValue = {
    diffs: FileDiffWithGitDiffsAndFileContent[],
    fromTagBranchCommit: ComparisonEnd,
    toTagBranchCommit: ComparisonEnd
}
class DiffsStore {
    private static instance: DiffsStore;
    private store: Map<string, StoreValue>;

    private constructor() {
        this.store = new Map<string, StoreValue>();
    }

    public static getStore(): DiffsStore {
        if (!DiffsStore.instance) {
            DiffsStore.instance = new DiffsStore();
        }
        return DiffsStore.instance;
    }

    public storeDiffs(
        diffs: FileDiffWithGitDiffsAndFileContent[],
        fromTagBranchCommit: ComparisonEnd,
        toTagBranchCommit: ComparisonEnd
    ) {
        // generate a unique identifier for the diffs
        const key = new Date().getTime().toString()
        const value: StoreValue = { diffs, fromTagBranchCommit, toTagBranchCommit }
        this.store.set(key, value);
        return key
    }

    public getDiffs(
        key: string,
        fromTagBranchCommit: ComparisonEnd,
        toTagBranchCommit: ComparisonEnd
    ) {
        const storeValue = this.store.get(key)
        if (!storeValue) {
            return undefined
        }
        if (storeValue.fromTagBranchCommit.tag_branch_commit !== fromTagBranchCommit.tag_branch_commit) {
            return undefined
        }
        if (storeValue.toTagBranchCommit.tag_branch_commit !== toTagBranchCommit.tag_branch_commit) {
            return undefined
        }
        return storeValue.diffs
    }
}

function buildExplanation(
    comparisonResult: FileDiffWithGitDiffsAndFileContent,
    promptTemplates: PromptTemplates,
    model: string,
    executedCommands: string[],
    messageWriter: MessageWriter = DefaultMessageWriter,
    outDirForChatLog?: string
) {
    const linesOfCodeString = buildLinesOfCodeInfoString(comparisonResult)
    // there can be diffs which are returned by git diff but have no code changes
    // (the code chaged lines are calculated by cloc)
    // in these cases there is no point in calling LLM to explain the diffs
    if (!hasCodeAddedRemovedModified(comparisonResult)) {
        console.log(`No code changes for file ${comparisonResult.fullFilePath}`)
        executedCommands.push(`===>>> No code changes for file ${comparisonResult.fullFilePath}`)
        return of({ ...comparisonResult, explanation: 'No code changes', linesOfCodeString })
    }
    return explainGitDiffs$(comparisonResult, promptTemplates, model,  executedCommands, messageWriter, outDirForChatLog,).pipe(
        map((explanationRec) => {
            return { ...explanationRec, linesOfCodeString }
        })
    )
}

const writeCompareResultsToMarkdown$ = (mdJson: any[], projectDirName: string, outFile: string) => {
    const mdAsString = json2md(mdJson)
    return writeFileObs(outFile, [mdAsString])
        .pipe(
            tap({
                next: () => console.log(`====>>>> Compare result for project ${projectDirName} written in markdown file: ${outFile}`),
            }),
        );
}

const writeCompareResultsToCsv$ = (compareResults: string[], projectDirName: string, outFile: string) => {
    return writeFileObs(outFile, compareResults)
        .pipe(
            tap({
                next: () => console.log(`====>>>> Compare result for project ${projectDirName} written in csv file: ${outFile}`),
            }),
        );
}

const writeExecutedCommands$ = (executedCommands: string[], projectDirName: string, outFile: string) => {
    return writeFileObs(outFile, executedCommands)
        .pipe(
            tap({
                next: () => console.log(`====>>>> Commands executed to calculate comparisons for project "${projectDirName}" written in txt file: ${outFile}`),
            }),
        );
}


function initializeMarkdown(
    comparisonParams: ComparisonParams,
    gitWebClientCommandUrl: string,
    languages?: string[]
) {
    const fromTagBranchCommit = comparisonEndString(comparisonParams.from_tag_branch_commit)
    const toTagBranchCommit = comparisonEndString(comparisonParams.to_tag_branch_commit)

    const mdJson = [
        { h1: `Comparing ${comparisonParams.from_tag_branch_commit.tag_branch_commit} with ${comparisonParams.to_tag_branch_commit.tag_branch_commit}` },
        { h4: `From Tag Branch or Commit: ${fromTagBranchCommit}` },
        { h4: `To Tag Branch or Commit: ${toTagBranchCommit}` },
        { h4: `Languages considered: ${languages?.join(', ')}` },
        { p: ` Git Web Client Command: [${gitWebClientCommandUrl}](${gitWebClientCommandUrl})` },
        { p: '' },
        { p: '------------------------------------------------------------------------------------------------' },
    ]

    return mdJson
}

function appendNumFilesWithDiffsToMdJson(
    mdJson: any[],
    numFilesWithDiffs: number
) {
    mdJson.push({ h3: `Files with differences: ${numFilesWithDiffs}` })
}

function appendNumLinesOfCode(
    mdJson: any[],
    fileDiffsWithExplanation: FileDiffWithExplanation[]
) {
    // sum the lines of code same, modified, added, removed for all files
    const totalLinesOfCode = fileDiffsWithExplanation.reduce((acc, curr) => {
        acc.code_same += Number(curr.code_same)
        acc.code_modified += Number(curr.code_modified)
        acc.code_added += Number(curr.code_added)
        acc.code_removed += Number(curr.code_removed)
        return acc
    }, { code_same: 0, code_modified: 0, code_added: 0, code_removed: 0 })

    const linesOfCodeInfo = `lines of code: ${totalLinesOfCode.code_same} same, ${totalLinesOfCode.code_modified} modified, ${totalLinesOfCode.code_added} added, ${totalLinesOfCode.code_removed} removed`
    mdJson.push({ p: linesOfCodeInfo })
}

function appendCompResultToMdJson(
    mdJson: any[],
    compareResult: FileDiffWithExplanation
) {
    mdJson.push({ p: '------------------------------------------------------------------------------------------------' })
    const compFileWithUrl = `[${compareResult.File}](${compareResult.fileGitUrl})`
    mdJson.push({ h3: compFileWithUrl })
    mdJson.push({ p: compareResult.explanation })
    mdJson.push({ p: '' })
    if (hasClocInfoDetails(compareResult)) {
        const linesOfCodeInfo = buildLinesOfCodeInfoString(compareResult)
        mdJson.push({ p: linesOfCodeInfo })
    }
}

function buildLinesOfCodeInfoString(compareResult: ClocGitDiffRec) {
    return `lines of code: ${compareResult.code_same} same, ${compareResult.code_modified} modified, ${compareResult.code_added} added, ${compareResult.code_removed} removed`
}

function appendPromptsToMdJson(
    mdJson: any[],
    promptTemplates: PromptTemplates
) {
    const promptSectionTitle = [
        { p: '===========================================================================' },
        { h2: 'Prompt Templates' }
    ]
    mdJson.push(...promptSectionTitle)

    const promptTemplatesMdJson: any[] = []

    Object.values(promptTemplates).forEach((promptWithDescription) => {
        promptTemplatesMdJson.push({ h2: promptWithDescription.description })
        promptTemplatesMdJson.push({ p: promptWithDescription.prompt })
    })

    mdJson.push(...promptTemplatesMdJson)
}

function appendSummaryToMdJson(
    mdJson: any[],
    summary: string
) {
    mdJson.push({ p: '==========================================================================' })
    mdJson.push({ h2: 'Summary of all diffs' })
    mdJson.push({ p: summary })
    mdJson.push({ p: '==========================================================================' })
    mdJson.push({ p: '==================  Differences in files' })
    mdJson.push({ p: '==========================================================================' })
}
function gitWebClientCommand(
    repoUrl: string,
    from_tag_branch_commit: ComparisonEnd,
    to_tag_branch_commit: ComparisonEnd
) {
    let fromTagBranchCommit = from_tag_branch_commit.tag_branch_commit
    if (from_tag_branch_commit.url_to_repo !== repoUrl) {
        const fromUrlParts = from_tag_branch_commit.url_to_repo.split('/')
        const repoOwner = fromUrlParts[fromUrlParts.length - 2]
        const urlRepoName = fromUrlParts[fromUrlParts.length - 1]
        fromTagBranchCommit = `${repoOwner}:${urlRepoName}:${fromTagBranchCommit}`
    }
    let toTagBranchCommit = to_tag_branch_commit.tag_branch_commit
    if (to_tag_branch_commit.url_to_repo !== repoUrl) {
        const toUrlParts = to_tag_branch_commit.url_to_repo.split('/')
        const repoOwner = toUrlParts[toUrlParts.length - 2]
        const urlRepoName = toUrlParts[toUrlParts.length - 1]
        toTagBranchCommit = `${repoOwner}:${urlRepoName}:${toTagBranchCommit}`
    }
    return `${repoUrl}/compare/${toTagBranchCommit}...${fromTagBranchCommit}`;
}
