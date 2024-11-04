import { map, concatMap, catchError, of, Observable, mergeMap, tap, toArray, reduce, forkJoin } from "rxjs"
import { explainGitDiffs$ } from "../git/explain-diffs"
import { getDefaultPromptTemplates, PromptTemplates } from "../prompt-templates/prompt-templates"
import { summarizeDiffs$ } from "./summarize-diffs"
    return comparisonResultFromClocDiffRelForProject$(comparisonParams, executedCommands, languages).pipe(
                    url_to_remote_repo: comparisonParams.url_to_second_repo
    model: string,
    return allDiffsForProject$(comparisonParams, executedCommands, languages).pipe(
            return explainGitDiffs$(comparisonResult, promptTemplates, model, executedCommands)
    model: string,
    return allDiffsForProjectWithExplanation$(comparisonParams, promptTemplates, model, executedCommands, languages).pipe(
export type GenerateMdReportParams = {
    llmModel: string,
}
export function writeAllDiffsForProjectWithExplanationToMarkdown$(params: GenerateMdReportParams) {
    const comparisonParams = params.comparisonParams
    const promptTemplates = params.promptTemplates
    const outdir = params.outdir
    const llmModel = params.llmModel
    const languages = params.languages

    const repoUrl = comparisonParams.url_to_repo
    const gitWebClientCommandUrl = gitWebClientCommand(
        repoUrl, 
        comparisonParams.from_tag_branch_commit, 
        comparisonParams.to_tag_branch_commit, 
        comparisonParams.url_to_second_repo
    )
    const mdJson = initializeMarkdown(comparisonParams, gitWebClientCommandUrl, languages)
    return allDiffsForProjectWithExplanation$(comparisonParams, promptTemplates, llmModel, executedCommands, languages).pipe(
        concatMap((diffsWithExplanation) => {
            appendNumFilesWithDiffsToMdJson(mdJson, diffsWithExplanation.length)
            const promptForSummaryTemplate = promptTemplates?.summary?.prompt
            return summarizeDiffs$(
                diffsWithExplanation, languages, projectDirName, llmModel, promptForSummaryTemplate, executedCommands
            ).pipe(
                    return diffsWithExplanation
            const _promptTemplates = promptTemplates || getDefaultPromptTemplates()
            appendPromptsToMdJson(mdJson, _promptTemplates)
            const outMarkdownFile = path.join(outdir, `${projectDirName}-compare-with-explanations-${timeStampYYYYMMDDHHMMSS}.md`);
            const outExecutedCommandsFile = path.join(outdir, `${projectDirName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
            return forkJoin([
                writeCompareResultsToMarkdown$(mdJson, projectDirName, outMarkdownFile),
                writeExecutedCommands$(executedCommands, projectDirName, outExecutedCommandsFile),
            ]).pipe(
                map(([markdownFilePath, executedCommandFilePath]) => {
                    return { markdownFilePath, executedCommandFilePath }
                })
            )
    gitWebClientCommandUrl: string,
    const projectDir = comparisonParams.projectDir
    const inRemoteRepoMsg = comparisonParams.url_to_second_repo ?
        ` in remote repo ${comparisonParams.url_to_second_repo}` :
        { p: ` Git Web Client Command: [${gitWebClientCommandUrl}](${gitWebClientCommandUrl})` },
}

function gitWebClientCommand(
    repoUrl: string, fromTagBranchCommit: string, toTagBranchCommit: string, _secondRepoUrl?: string
) {
    if (fromTagBranchCommit.includes('/')) {
        const fromTagBranchCommitParts = fromTagBranchCommit.split('/')
        fromTagBranchCommit = fromTagBranchCommitParts[fromTagBranchCommitParts.length - 1]
    }
    if (toTagBranchCommit.includes('/')) {
        const toTagBranchCommitParts = toTagBranchCommit.split('/')
        toTagBranchCommit = toTagBranchCommitParts[toTagBranchCommitParts.length - 1]
    }
    return `${repoUrl}/compare/${fromTagBranchCommit}...${toTagBranchCommit}`;