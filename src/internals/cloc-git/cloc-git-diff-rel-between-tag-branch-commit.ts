import path from "path"
import { map, concatMap, catchError, of, Observable, mergeMap, tap, toArray, reduce, forkJoin } from "rxjs"

import json2md from 'json2md'

import { toCsvObs } from "@enrico.piccinin/csv-tools"
import { readLinesObs, writeFileObs } from "observable-fs"

import { ComparisonEnd, comparisonEndString, gitDiff$ } from "../git/git-diffs"
import { explainGitDiffs$ } from "../git/explain-diffs"
import { getDefaultPromptTemplates, PromptTemplates } from "../prompt-templates/prompt-templates"
import { summarizeDiffs$ } from "./summarize-diffs"
import { comparisonResultFromClocDiffRelForProject$, ClocGitDiffRec, ComparisonParams } from "./cloc-diff-rel"
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
export type FileDiffWithGitDiffsAndFileContent = ClocGitDiffRec & FileStatus & {
    diffLines: string,
    fileContent: string,
}

export function allDiffsForProject$(
    comparisonParams: ComparisonParams,
    executedCommands: string[],
    languages?: string[],
    messageWriter: MessageWriter = DefaultMessageWriter
): Observable<FileDiffWithGitDiffsAndFileContent> {
    return comparisonResultFromClocDiffRelForProject$(comparisonParams, executedCommands, languages).pipe(
        // we MUST use concatMap here to ensure that gitDiff$ is not streaming concurrently but only sequentially
        // in other words gitDiff$ must return the bufferDiffLines value before starting for the next one
        // gitDiffs$ eventually calls the command "git diff" which outputs on the stdout - gitDiffs$ Obsrvable accumulates the output
        // sent to the stdout and returns it as a buffer string (diffLinesString)
        // Using concatMap (which just mergeMap with concurrency set to 1) ensures that the command "git diff" 
        // is not executed concurrently for different projects
        concatMap(rec => {
            const msgText = `Calculating git diff for ${rec.fullFilePath}`
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
                    const _rec: FileDiffWithGitDiffsAndFileContent = {
                        ...rec, diffLines, fileContent: '', deleted: null, added: null, copied: null, renamed: null
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
                    return { ..._rec, diffLines }
                })
            )
        }),
        concatMap((rec: FileDiffWithGitDiffsAndFileContent & { diffLines: string }) => {
            return readLinesObs(rec.fullFilePath!).pipe(
                map(lines => {
                    return { ...rec, fileContent: lines.join('\n') } as FileDiffWithGitDiffsAndFileContent
                }),
                catchError(err => {
                    if (err.code === 'ENOENT') {
                        return of({ ...rec, fileContent: 'file not found' } as FileDiffWithGitDiffsAndFileContent)
                    }
                    throw err
                })
            )
        }),
    )
}

export type FileDiffWithExplanation = ClocGitDiffRec & FileStatus & {
    explanation: string,
}
export function allDiffsForProjectWithExplanation$(
    comparisonParams: ComparisonParams,
    promptTemplates: PromptTemplates,
    model: string,
    executedCommands: string[],
    languages?: string[],
    messageWriter: MessageWriter = DefaultMessageWriter,
    concurrentLLMCalls = 5
): Observable<FileDiffWithExplanation> {
    const startExecTime = new Date()
    return allDiffsForProject$(comparisonParams, executedCommands, languages, messageWriter).pipe(
        mergeMap(comparisonResult => {
            return explainGitDiffs$(comparisonResult, promptTemplates, model, executedCommands, messageWriter)
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
    languages?: string[]
) {
    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    const executedCommands: string[] = []

    const projectDirName = path.basename(comparisonParams.projectDir)

    return allDiffsForProjectWithExplanation$(comparisonParams, promptTemplates, model, executedCommands, languages).pipe(
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
    languages?: string[]
}
export function writeAllDiffsForProjectWithExplanationToMarkdown$(
    params: GenerateMdReportParams, messageWriter: MessageWriter
) {
    const comparisonParams = params.comparisonParams
    const promptTemplates = params.promptTemplates
    const outdir = params.outdir
    const llmModel = params.llmModel
    const languages = params.languages

    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    const executedCommands: string[] = []

    const projectDirName = path.basename(comparisonParams.projectDir)

    const repoUrl = comparisonParams.url_to_repo
    const gitWebClientCommandUrl = gitWebClientCommand(
        repoUrl, 
        comparisonParams.from_tag_branch_commit, 
        comparisonParams.to_tag_branch_commit,
    )
    const mdJson = initializeMarkdown(comparisonParams, gitWebClientCommandUrl, languages)

    return allDiffsForProjectWithExplanation$(
        comparisonParams, promptTemplates, llmModel, executedCommands, languages, messageWriter
    ).pipe(
        toArray(),
        concatMap((diffsWithExplanation) => {
            appendNumFilesWithDiffsToMdJson(mdJson, diffsWithExplanation.length)
            const promptForSummaryTemplate = promptTemplates?.summary?.prompt
            return summarizeDiffs$(
                diffsWithExplanation, 
                languages, 
                projectDirName, 
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
        concatMap(diffs => diffs),
        reduce((mdJson, diffWithExplanation) => {
            appendCompResultToMdJson(mdJson, diffWithExplanation)
            return mdJson
        }, mdJson),
        tap(mdJson => {
            const _promptTemplates = promptTemplates || getDefaultPromptTemplates()
            appendPromptsToMdJson(mdJson, _promptTemplates)
        }),
        concatMap((mdJson) => {
            const outMarkdownFile = path.join(outdir, `${projectDirName}-compare-with-explanations-${timeStampYYYYMMDDHHMMSS}.md`);
            const outExecutedCommandsFile = path.join(outdir, `${projectDirName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
            return forkJoin([
                writeCompareResultsToMarkdown$(mdJson, projectDirName, outMarkdownFile),
                writeExecutedCommands$(executedCommands, projectDirName, outExecutedCommandsFile),
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

function appendCompResultToMdJson(
    mdJson: any[],
    compareResult: FileDiffWithExplanation
) {
    const linesOfCodeInfo = `lines of code: ${compareResult.code_same} same, ${compareResult.code_modified} modified, ${compareResult.code_added} added, ${compareResult.code_removed} removed`

    mdJson.push({ p: '------------------------------------------------------------------------------------------------' })
    mdJson.push({ h3: compareResult.File })
    mdJson.push({ p: compareResult.explanation })
    mdJson.push({ p: '' })
    mdJson.push({ p: linesOfCodeInfo })
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
        const urlRepoName = fromUrlParts[fromUrlParts.length - 1]
        fromTagBranchCommit = `${urlRepoName}:${urlRepoName}:${fromTagBranchCommit}`
    }
    let toTagBranchCommit = to_tag_branch_commit.tag_branch_commit
    if (to_tag_branch_commit.url_to_repo !== repoUrl) {
        const toUrlParts = to_tag_branch_commit.url_to_repo.split('/')
        const urlRepoName = toUrlParts[toUrlParts.length - 1]
        toTagBranchCommit = `${urlRepoName}:${urlRepoName}:${toTagBranchCommit}`
    }
    return `${repoUrl}/compare/${fromTagBranchCommit}...${toTagBranchCommit}`;
}