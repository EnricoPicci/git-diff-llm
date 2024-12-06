"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allDiffsForProject$ = allDiffsForProject$;
exports.allDiffsForProjectWithExplanation$ = allDiffsForProjectWithExplanation$;
exports.writeAllDiffsForProjectWithExplanationToCsv$ = writeAllDiffsForProjectWithExplanationToCsv$;
exports.writeAllDiffsForProjectWithExplanationToMarkdown$ = writeAllDiffsForProjectWithExplanationToMarkdown$;
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const json2md_1 = __importDefault(require("json2md"));
const csv_tools_1 = require("@enrico.piccinin/csv-tools");
const observable_fs_1 = require("observable-fs");
const git_diffs_1 = require("../git/git-diffs");
const explain_diffs_1 = require("../chat/explain-diffs");
const prompt_templates_1 = require("../prompt-templates/prompt-templates");
const summarize_diffs_1 = require("./summarize-diffs");
const cloc_diff_rel_1 = require("./cloc-diff-rel");
const message_writer_1 = require("../message-writer/message-writer");
function allDiffsForProject$(comparisonParams, executedCommands, languages, messageWriter = message_writer_1.DefaultMessageWriter) {
    let count = 0;
    let totNumFiles = 0;
    return (0, cloc_diff_rel_1.comparisonResultFromClocDiffRelOrGitDiffForProject$)(comparisonParams, executedCommands, languages).pipe(
    // toArray to calculate the total number of files
    (0, rxjs_1.toArray)(), (0, rxjs_1.tap)(comapareResults => {
        totNumFiles = comapareResults.length;
        const msg = (0, message_writer_1.newInfoMessage)(`Total number of files: ${totNumFiles}`);
        messageWriter.write(msg);
    }), 
    // mergeMap to emit each file diff record and start the stream of git diff for each file again
    (0, rxjs_1.mergeMap)((compareResult) => compareResult), 
    // we MUST use concatMap here to ensure that gitDiff$ is not streaming concurrently but only sequentially
    // in other words gitDiff$ must return the bufferDiffLines value before starting for the next one
    // gitDiffs$ eventually calls the command "git diff" which outputs on the stdout - gitDiffs$ Observable accumulates the output
    // sent to the stdout and returns it as a buffer string (diffLinesString)
    // Using concatMap (which just mergeMap with concurrency set to 1) ensures that the command "git diff" 
    // is not executed concurrently for different projects
    (0, rxjs_1.concatMap)(rec => {
        const msgText = `Calculating git diff for ${rec.fullFilePath} (${++count}/${totNumFiles})`;
        const msg = (0, message_writer_1.newInfoMessage)(msgText);
        messageWriter.write(msg);
        return (0, git_diffs_1.gitDiff$)(rec.projectDir, comparisonParams.from_tag_branch_commit, comparisonParams.to_tag_branch_commit, rec.File, !!comparisonParams.use_ssh, // the double negarion converts to boolean in case it is undefined
        executedCommands).pipe((0, rxjs_1.map)(diffLinesString => {
            const diffLines = diffLinesString.toString();
            const _lines = diffLines.split('\n');
            const fileGitUrl = (0, git_diffs_1.buildFileGitUrl)(comparisonParams.url_to_repo, comparisonParams.from_tag_branch_commit.tag_branch_commit, rec.File);
            const _rec = Object.assign(Object.assign({}, rec), { diffLines, fileContent: '', deleted: null, added: null, copied: null, renamed: null, fileGitUrl });
            if (_lines.length < 2) {
                console.log(`No diff found for file ${rec.fullFilePath}`);
                executedCommands.push(`===>>> No diff found for file ${rec.fullFilePath}`);
                return Object.assign(Object.assign({}, _rec), { diffLines });
            }
            const secondLine = _lines[1];
            if (secondLine.startsWith('deleted file mode')) {
                _rec.deleted = true;
            }
            else if (secondLine.startsWith('new file mode')) {
                _rec.added = true;
            }
            else if (secondLine.startsWith('copy ')) {
                _rec.copied = true;
            }
            else if (secondLine.startsWith('rename ')) {
                _rec.renamed = true;
            }
            const __rec = Object.assign(Object.assign({}, _rec), { diffLines });
            return __rec;
        }));
    }), (0, rxjs_1.concatMap)((rec) => {
        return (0, observable_fs_1.readLinesObs)(rec.fullFilePath).pipe((0, rxjs_1.map)(lines => {
            const _rec = Object.assign(Object.assign({}, rec), { fileContent: lines.join('\n') });
            return _rec;
        }), (0, rxjs_1.catchError)(err => {
            if (err.code === 'ENOENT') {
                const _rec = Object.assign(Object.assign({}, rec), { fileContent: 'file not found' });
                return (0, rxjs_1.of)(_rec);
            }
            throw err;
        }));
    }));
}
function allDiffsForProjectWithExplanation$(comparisonParams, promptTemplates, model, executedCommands, languages, messageWriter = message_writer_1.DefaultMessageWriter, outDirForChatLog, concurrentLLMCalls = 5) {
    const startingMsg = (0, message_writer_1.newInfoMessage)(`Starting all diffs with explanations`);
    messageWriter.write(startingMsg);
    const startExecTime = new Date();
    return allDiffsForProject$(comparisonParams, executedCommands, languages, messageWriter).pipe((0, rxjs_1.mergeMap)((comparisonResult) => {
        const linesOfCodeString = buildLinesOfCodeInfoString(comparisonResult);
        // there can be diffs which are returned by git diff but have no code changes
        // (the code chaged lines are calculated by cloc)
        // in these cases there is no point in calling LLM to explain the diffs
        if (!(0, cloc_diff_rel_1.hasCodeAddedRemovedModified)(comparisonResult)) {
            console.log(`No code changes for file ${comparisonResult.fullFilePath}`);
            executedCommands.push(`===>>> No code changes for file ${comparisonResult.fullFilePath}`);
            return (0, rxjs_1.of)(Object.assign(Object.assign({}, comparisonResult), { explanation: 'No code changes', linesOfCodeString }));
        }
        return (0, explain_diffs_1.explainGitDiffs$)(comparisonResult, promptTemplates, model, executedCommands, messageWriter, outDirForChatLog).pipe((0, rxjs_1.map)((explanationRec) => {
            return Object.assign(Object.assign({}, explanationRec), { linesOfCodeString });
        }));
    }, concurrentLLMCalls), (0, rxjs_1.tap)({
        complete: () => {
            console.log(`\n\nCompleted all diffs with explanations in ${new Date().getTime() - startExecTime.getTime()} ms\n\n`);
        }
    }));
}
function writeAllDiffsForProjectWithExplanationToCsv$(comparisonParams, promptTemplates, outdir, model, languages) {
    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const executedCommands = [];
    const projectDirName = path_1.default.basename(comparisonParams.projectDir);
    return allDiffsForProjectWithExplanation$(comparisonParams, promptTemplates, model, executedCommands, languages, message_writer_1.DefaultMessageWriter, outdir).pipe(
    // replace any ',' in the explanation with a '-'
    (0, rxjs_1.map)((diffWithExplanation) => {
        diffWithExplanation.explanation = diffWithExplanation.explanation.replace(/,/g, '-');
        diffWithExplanation.explanation = diffWithExplanation.explanation.replace(/;/g, ' ');
        return diffWithExplanation;
    }), (0, csv_tools_1.toCsvObs)(), (0, rxjs_1.toArray)(), (0, rxjs_1.concatMap)((compareResult) => {
        const outFile = path_1.default.join(outdir, `${projectDirName}-compare-with-explanations-${timeStampYYYYMMDDHHMMSS}.csv`);
        return writeCompareResultsToCsv$(compareResult, projectDirName, outFile);
    }), (0, rxjs_1.concatMap)(() => {
        const outFile = path_1.default.join(outdir, `${projectDirName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
        return writeExecutedCommands$(executedCommands, projectDirName, outFile);
    }));
}
function writeAllDiffsForProjectWithExplanationToMarkdown$(params, messageWriter) {
    const comparisonParams = params.comparisonParams;
    const promptTemplates = params.promptTemplates;
    const outdir = params.outdir;
    const llmModel = params.llmModel;
    const languages = params.languages;
    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const executedCommands = [];
    const projectName = path_1.default.basename(comparisonParams.projectDir);
    const repoUrl = comparisonParams.url_to_repo;
    const gitWebClientCommandUrl = gitWebClientCommand(repoUrl, comparisonParams.from_tag_branch_commit, comparisonParams.to_tag_branch_commit);
    const mdJson = initializeMarkdown(comparisonParams, gitWebClientCommandUrl, languages);
    return allDiffsForProjectWithExplanation$(comparisonParams, promptTemplates, llmModel, executedCommands, languages, messageWriter, outdir).pipe((0, rxjs_1.toArray)(), (0, rxjs_1.concatMap)((diffsWithExplanation) => {
        var _a;
        appendNumFilesWithDiffsToMdJson(mdJson, diffsWithExplanation.length);
        if (diffsWithExplanation.length > 0 && (0, cloc_diff_rel_1.hasClocInfoDetails)(diffsWithExplanation[0])) {
            appendNumLinesOfCode(mdJson, diffsWithExplanation);
        }
        const promptForSummaryTemplate = (_a = promptTemplates === null || promptTemplates === void 0 ? void 0 : promptTemplates.summary) === null || _a === void 0 ? void 0 : _a.prompt;
        return (0, summarize_diffs_1.summarizeDiffs$)(diffsWithExplanation, languages, projectName, llmModel, promptForSummaryTemplate, executedCommands, messageWriter).pipe((0, rxjs_1.map)(summary => {
            appendSummaryToMdJson(mdJson, summary);
            return diffsWithExplanation;
        }));
    }), (0, rxjs_1.map)((diffWithExplanation) => {
        // sum the lines of code modified, added, removed for each file and sort the files in descending order of the sum of these lines
        diffWithExplanation.sort((a, b) => {
            const sumA = parseInt(a.code_modified) + parseInt(a.code_added) + parseInt(a.code_removed);
            const sumB = parseInt(b.code_modified) + parseInt(b.code_added) + parseInt(b.code_removed);
            return sumB - sumA;
        });
        return diffWithExplanation;
    }), (0, rxjs_1.tap)(diffs => {
        const msg = (0, message_writer_1.newInfoMessage)(diffs);
        msg.id = 'diffs-generated';
        messageWriter.write(msg);
    }), (0, rxjs_1.concatMap)(diffs => diffs), (0, rxjs_1.reduce)((mdJson, diffWithExplanation) => {
        appendCompResultToMdJson(mdJson, diffWithExplanation);
        return mdJson;
    }, mdJson), (0, rxjs_1.tap)(mdJson => {
        const _promptTemplates = promptTemplates || (0, prompt_templates_1.getDefaultPromptTemplates)();
        appendPromptsToMdJson(mdJson, _promptTemplates);
    }), (0, rxjs_1.concatMap)((mdJson) => {
        const outMarkdownFile = path_1.default.join(outdir, `${projectName}-compare-with-explanations-${timeStampYYYYMMDDHHMMSS}.md`);
        const outExecutedCommandsFile = path_1.default.join(outdir, `${projectName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
        return (0, rxjs_1.forkJoin)([
            writeCompareResultsToMarkdown$(mdJson, projectName, outMarkdownFile),
            writeExecutedCommands$(executedCommands, projectName, outExecutedCommandsFile),
        ]).pipe((0, rxjs_1.map)(([markdownFilePath, executedCommandFilePath]) => {
            return { markdownFilePath, executedCommandFilePath };
        }));
    }));
}
//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes
const writeCompareResultsToMarkdown$ = (mdJson, projectDirName, outFile) => {
    const mdAsString = (0, json2md_1.default)(mdJson);
    return (0, observable_fs_1.writeFileObs)(outFile, [mdAsString])
        .pipe((0, rxjs_1.tap)({
        next: () => console.log(`====>>>> Compare result for project ${projectDirName} written in markdown file: ${outFile}`),
    }));
};
const writeCompareResultsToCsv$ = (compareResults, projectDirName, outFile) => {
    return (0, observable_fs_1.writeFileObs)(outFile, compareResults)
        .pipe((0, rxjs_1.tap)({
        next: () => console.log(`====>>>> Compare result for project ${projectDirName} written in csv file: ${outFile}`),
    }));
};
const writeExecutedCommands$ = (executedCommands, projectDirName, outFile) => {
    return (0, observable_fs_1.writeFileObs)(outFile, executedCommands)
        .pipe((0, rxjs_1.tap)({
        next: () => console.log(`====>>>> Commands executed to calculate comparisons for project "${projectDirName}" written in txt file: ${outFile}`),
    }));
};
function initializeMarkdown(comparisonParams, gitWebClientCommandUrl, languages) {
    const fromTagBranchCommit = (0, git_diffs_1.comparisonEndString)(comparisonParams.from_tag_branch_commit);
    const toTagBranchCommit = (0, git_diffs_1.comparisonEndString)(comparisonParams.to_tag_branch_commit);
    const mdJson = [
        { h1: `Comparing ${comparisonParams.from_tag_branch_commit.tag_branch_commit} with ${comparisonParams.to_tag_branch_commit.tag_branch_commit}` },
        { h4: `From Tag Branch or Commit: ${fromTagBranchCommit}` },
        { h4: `To Tag Branch or Commit: ${toTagBranchCommit}` },
        { h4: `Languages considered: ${languages === null || languages === void 0 ? void 0 : languages.join(', ')}` },
        { p: ` Git Web Client Command: [${gitWebClientCommandUrl}](${gitWebClientCommandUrl})` },
        { p: '' },
        { p: '------------------------------------------------------------------------------------------------' },
    ];
    return mdJson;
}
function appendNumFilesWithDiffsToMdJson(mdJson, numFilesWithDiffs) {
    mdJson.push({ h3: `Files with differences: ${numFilesWithDiffs}` });
}
function appendNumLinesOfCode(mdJson, fileDiffsWithExplanation) {
    // sum the lines of code same, modified, added, removed for all files
    const totalLinesOfCode = fileDiffsWithExplanation.reduce((acc, curr) => {
        acc.code_same += Number(curr.code_same);
        acc.code_modified += Number(curr.code_modified);
        acc.code_added += Number(curr.code_added);
        acc.code_removed += Number(curr.code_removed);
        return acc;
    }, { code_same: 0, code_modified: 0, code_added: 0, code_removed: 0 });
    const linesOfCodeInfo = `lines of code: ${totalLinesOfCode.code_same} same, ${totalLinesOfCode.code_modified} modified, ${totalLinesOfCode.code_added} added, ${totalLinesOfCode.code_removed} removed`;
    mdJson.push({ p: linesOfCodeInfo });
}
function appendCompResultToMdJson(mdJson, compareResult) {
    mdJson.push({ p: '------------------------------------------------------------------------------------------------' });
    const compFileWithUrl = `[${compareResult.File}](${compareResult.fileGitUrl})`;
    mdJson.push({ h3: compFileWithUrl });
    mdJson.push({ p: compareResult.explanation });
    mdJson.push({ p: '' });
    if ((0, cloc_diff_rel_1.hasClocInfoDetails)(compareResult)) {
        const linesOfCodeInfo = buildLinesOfCodeInfoString(compareResult);
        mdJson.push({ p: linesOfCodeInfo });
    }
}
function buildLinesOfCodeInfoString(compareResult) {
    return `lines of code: ${compareResult.code_same} same, ${compareResult.code_modified} modified, ${compareResult.code_added} added, ${compareResult.code_removed} removed`;
}
function appendPromptsToMdJson(mdJson, promptTemplates) {
    const promptSectionTitle = [
        { p: '===========================================================================' },
        { h2: 'Prompt Templates' }
    ];
    mdJson.push(...promptSectionTitle);
    const promptTemplatesMdJson = [];
    Object.values(promptTemplates).forEach((promptWithDescription) => {
        promptTemplatesMdJson.push({ h2: promptWithDescription.description });
        promptTemplatesMdJson.push({ p: promptWithDescription.prompt });
    });
    mdJson.push(...promptTemplatesMdJson);
}
function appendSummaryToMdJson(mdJson, summary) {
    mdJson.push({ p: '==========================================================================' });
    mdJson.push({ h2: 'Summary of all diffs' });
    mdJson.push({ p: summary });
    mdJson.push({ p: '==========================================================================' });
    mdJson.push({ p: '==================  Differences in files' });
    mdJson.push({ p: '==========================================================================' });
}
function gitWebClientCommand(repoUrl, from_tag_branch_commit, to_tag_branch_commit) {
    let fromTagBranchCommit = from_tag_branch_commit.tag_branch_commit;
    if (from_tag_branch_commit.url_to_repo !== repoUrl) {
        const fromUrlParts = from_tag_branch_commit.url_to_repo.split('/');
        const repoOwner = fromUrlParts[fromUrlParts.length - 2];
        const urlRepoName = fromUrlParts[fromUrlParts.length - 1];
        fromTagBranchCommit = `${repoOwner}:${urlRepoName}:${fromTagBranchCommit}`;
    }
    let toTagBranchCommit = to_tag_branch_commit.tag_branch_commit;
    if (to_tag_branch_commit.url_to_repo !== repoUrl) {
        const toUrlParts = to_tag_branch_commit.url_to_repo.split('/');
        const repoOwner = toUrlParts[toUrlParts.length - 2];
        const urlRepoName = toUrlParts[toUrlParts.length - 1];
        toTagBranchCommit = `${repoOwner}:${urlRepoName}:${toTagBranchCommit}`;
    }
    return `${repoUrl}/compare/${toTagBranchCommit}...${fromTagBranchCommit}`;
}
//# sourceMappingURL=cloc-git-diff-rel-between-tag-branch-commit.js.map