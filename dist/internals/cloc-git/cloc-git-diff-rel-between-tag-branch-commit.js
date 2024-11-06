const prompt_templates_1 = require("../prompt-templates/prompt-templates");
const message_writer_1 = require("../message-writer/message-writer");
function allDiffsForProject$(comparisonParams, executedCommands, languages, messageWriter = message_writer_1.DefaultMessageWriter) {
        const msgText = `Calculating git diff for ${rec.fullFilePath}`;
        const msg = (0, message_writer_1.newInfoMessage)(msgText);
        messageWriter.write(msg);
        return (0, git_diffs_1.gitDiff$)(rec.projectDir, comparisonParams.from_tag_branch_commit, comparisonParams.to_tag_branch_commit, rec.File, !!comparisonParams.use_ssh, // the double negarion converts to boolean in case it is undefined
        executedCommands).pipe((0, rxjs_1.map)(diffLinesString => {
function allDiffsForProjectWithExplanation$(comparisonParams, promptTemplates, model, executedCommands, languages, messageWriter = message_writer_1.DefaultMessageWriter, concurrentLLMCalls = 5) {
    return allDiffsForProject$(comparisonParams, executedCommands, languages, messageWriter).pipe((0, rxjs_1.mergeMap)(comparisonResult => {
        return (0, explain_diffs_1.explainGitDiffs$)(comparisonResult, promptTemplates, model, executedCommands, messageWriter);
function writeAllDiffsForProjectWithExplanationToMarkdown$(params, messageWriter) {
    const gitWebClientCommandUrl = gitWebClientCommand(repoUrl, comparisonParams.from_tag_branch_commit, comparisonParams.to_tag_branch_commit);
    return allDiffsForProjectWithExplanation$(comparisonParams, promptTemplates, llmModel, executedCommands, languages, messageWriter).pipe((0, rxjs_1.toArray)(), (0, rxjs_1.concatMap)((diffsWithExplanation) => {
        var _a;
        const promptForSummaryTemplate = (_a = promptTemplates === null || promptTemplates === void 0 ? void 0 : promptTemplates.summary) === null || _a === void 0 ? void 0 : _a.prompt;
        return (0, summarize_diffs_1.summarizeDiffs$)(diffsWithExplanation, languages, projectDirName, llmModel, promptForSummaryTemplate, executedCommands, messageWriter).pipe((0, rxjs_1.map)(summary => {
        const _promptTemplates = promptTemplates || (0, prompt_templates_1.getDefaultPromptTemplates)();
        }), (0, rxjs_1.concatMap)(({ markdownFilePath, executedCommandFilePath }) => {
            return (0, observable_fs_1.readLinesObs)(markdownFilePath).pipe((0, rxjs_1.tap)({
                next: lines => {
                    const mdContent = lines.join('\n');
                    const msg = (0, message_writer_1.newInfoMessage)(mdContent);
                    msg.id = 'report-generated';
                    messageWriter.write(msg);
                }
            }), (0, rxjs_1.map)(() => ({ markdownFilePath, executedCommandFilePath })));
    const fromTagBranchCommit = (0, git_diffs_1.comparisonEndString)(comparisonParams.from_tag_branch_commit);
    const toTagBranchCommit = (0, git_diffs_1.comparisonEndString)(comparisonParams.to_tag_branch_commit);
        { h1: `Comparing ${comparisonParams.from_tag_branch_commit.tag_branch_commit} with ${comparisonParams.to_tag_branch_commit.tag_branch_commit}` },
        { h4: `From Tag Branch or Commit: ${fromTagBranchCommit}` },
        { h4: `To Tag Branch or Commit: ${toTagBranchCommit}` },
    mdJson.push({ p: '==========================================================================' });
function gitWebClientCommand(repoUrl, from_tag_branch_commit, to_tag_branch_commit) {
    let fromTagBranchCommit = from_tag_branch_commit.tag_branch_commit;
    if (from_tag_branch_commit.url_to_repo !== repoUrl) {
        const fromUrlParts = from_tag_branch_commit.url_to_repo.split('/');
        const urlRepoName = fromUrlParts[fromUrlParts.length - 1];
        fromTagBranchCommit = `${urlRepoName}:${urlRepoName}:${fromTagBranchCommit}`;
    let toTagBranchCommit = to_tag_branch_commit.tag_branch_commit;
    if (to_tag_branch_commit.url_to_repo !== repoUrl) {
        const toUrlParts = to_tag_branch_commit.url_to_repo.split('/');
        const urlRepoName = toUrlParts[toUrlParts.length - 1];
        toTagBranchCommit = `${urlRepoName}:${urlRepoName}:${toTagBranchCommit}`;