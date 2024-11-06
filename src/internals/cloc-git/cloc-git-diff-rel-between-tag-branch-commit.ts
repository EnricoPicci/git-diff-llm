import { ComparisonEnd, comparisonEndString, gitDiff$ } from "../git/git-diffs"
import { DefaultMessageWriter, MessageToClient, MessageWriter, newInfoMessage } from "../message-writer/message-writer"
    languages?: string[],
    messageWriter: MessageWriter = DefaultMessageWriter
            const msgText = `Calculating git diff for ${rec.fullFilePath}`
            const msg: MessageToClient = newInfoMessage(msgText)
            messageWriter.write(msg)
                comparisonParams.from_tag_branch_commit,
                comparisonParams.to_tag_branch_commit,
                !!comparisonParams.use_ssh, // the double negarion converts to boolean in case it is undefined
    messageWriter: MessageWriter = DefaultMessageWriter,
    return allDiffsForProject$(comparisonParams, executedCommands, languages, messageWriter).pipe(
            return explainGitDiffs$(comparisonResult, promptTemplates, model, executedCommands, messageWriter)
export function writeAllDiffsForProjectWithExplanationToMarkdown$(
    params: GenerateMdReportParams, messageWriter: MessageWriter
) {
        comparisonParams.to_tag_branch_commit,
    return allDiffsForProjectWithExplanation$(
        comparisonParams, promptTemplates, llmModel, executedCommands, languages, messageWriter
    ).pipe(
                diffsWithExplanation, 
                languages, 
                projectDirName, 
                llmModel, 
                promptForSummaryTemplate, 
                executedCommands,
                messageWriter
                }),
                concatMap(({ markdownFilePath, executedCommandFilePath }) => { 
                    return readLinesObs(markdownFilePath).pipe(
                        tap({
                            next: lines => {
                                const mdContent = lines.join('\n');
                                const msg = newInfoMessage(mdContent)
                                msg.id = 'report-generated'
                                messageWriter.write(msg)
                            }
                        }),
                        map(() => ({ markdownFilePath, executedCommandFilePath }))
                    )
                }),
    const fromTagBranchCommit = comparisonEndString(comparisonParams.from_tag_branch_commit)
    const toTagBranchCommit = comparisonEndString(comparisonParams.to_tag_branch_commit)
        { h1: `Comparing ${comparisonParams.from_tag_branch_commit.tag_branch_commit} with ${comparisonParams.to_tag_branch_commit.tag_branch_commit}` },
        { h4: `From Tag Branch or Commit: ${fromTagBranchCommit}` },
        { h4: `To Tag Branch or Commit: ${toTagBranchCommit}` },
    mdJson.push({ p: '==========================================================================' })
    repoUrl: string,
    from_tag_branch_commit: ComparisonEnd,
    to_tag_branch_commit: ComparisonEnd
    let fromTagBranchCommit = from_tag_branch_commit.tag_branch_commit
    if (from_tag_branch_commit.url_to_repo !== repoUrl) {
        const fromUrlParts = from_tag_branch_commit.url_to_repo.split('/')
        const urlRepoName = fromUrlParts[fromUrlParts.length - 1]
        fromTagBranchCommit = `${urlRepoName}:${urlRepoName}:${fromTagBranchCommit}`
    let toTagBranchCommit = to_tag_branch_commit.tag_branch_commit
    if (to_tag_branch_commit.url_to_repo !== repoUrl) {
        const toUrlParts = to_tag_branch_commit.url_to_repo.split('/')
        const urlRepoName = toUrlParts[toUrlParts.length - 1]
        toTagBranchCommit = `${urlRepoName}:${urlRepoName}:${toTagBranchCommit}`