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
const explain_diffs_1 = require("../git/explain-diffs");
const summarize_diffs_1 = require("./summarize-diffs");
const cloc_diff_rel_1 = require("./cloc-diff-rel");
function allDiffsForProject$(comparisonParams, executedCommands, languages) {
    return (0, cloc_diff_rel_1.comparisonResultFromClocDiffRelForProject$)(comparisonParams, executedCommands, languages).pipe(
    // we MUST use concatMap here to ensure that gitDiff$ is not streaming concurrently but only sequentially
    // in other words gitDiff$ must return the bufferDiffLines value before starting for the next one
    // gitDiffs$ eventually calls the command "git diff" which outputs on the stdout - gitDiffs$ Obsrvable accumulates the output
    // sent to the stdout and returns it as a buffer string (diffLinesString)
    // Using concatMap (which just mergeMap with concurrency set to 1) ensures that the command "git diff" 
    // is not executed concurrently for different projects
    (0, rxjs_1.concatMap)(rec => {
        console.log(`Calculating git diff for ${rec.fullFilePath}`);
        return (0, git_diffs_1.gitDiff$)(rec.projectDir, {
            from_tag_or_branch: comparisonParams.from_tag_branch_commit,
            to_tag_or_branch: comparisonParams.to_tag_branch_commit,
            url_to_remote_repo: comparisonParams.url_to_remote_repo
        }, rec.File, executedCommands).pipe((0, rxjs_1.map)(diffLinesString => {
            const diffLines = diffLinesString.toString();
            const _lines = diffLines.split('\n');
            const _rec = Object.assign(Object.assign({}, rec), { diffLines, fileContent: '', deleted: null, added: null, copied: null, renamed: null });
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
            return Object.assign(Object.assign({}, _rec), { diffLines });
        }));
    }), (0, rxjs_1.concatMap)((rec) => {
        return (0, observable_fs_1.readLinesObs)(rec.fullFilePath).pipe((0, rxjs_1.map)(lines => {
            return Object.assign(Object.assign({}, rec), { fileContent: lines.join('\n') });
        }), (0, rxjs_1.catchError)(err => {
            if (err.code === 'ENOENT') {
                return (0, rxjs_1.of)(Object.assign(Object.assign({}, rec), { fileContent: 'file not found' }));
            }
            throw err;
        }));
    }));
}
function allDiffsForProjectWithExplanation$(comparisonParams, promptTemplates, model, executedCommands, languages, concurrentLLMCalls = 5) {
    const startExecTime = new Date();
    return allDiffsForProject$(comparisonParams, executedCommands, languages).pipe((0, rxjs_1.mergeMap)(comparisonResult => {
        return (0, explain_diffs_1.explainGitDiffs$)(comparisonResult, promptTemplates, model, executedCommands);
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
    return allDiffsForProjectWithExplanation$(comparisonParams, promptTemplates, model, executedCommands, languages).pipe(
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
function writeAllDiffsForProjectWithExplanationToMarkdown$(params) {
    const comparisonParams = params.comparisonParams;
    const promptTemplates = params.promptTemplates;
    const outdir = params.outdir;
    const llmModel = params.llmModel;
    const languages = params.languages;
    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const executedCommands = [];
    const projectDirName = path_1.default.basename(comparisonParams.projectDir);
    const mdJson = initializeMarkdown(comparisonParams, languages);
    return allDiffsForProjectWithExplanation$(comparisonParams, promptTemplates, llmModel, executedCommands, languages).pipe((0, rxjs_1.toArray)(), (0, rxjs_1.concatMap)((diffsWithExplanation) => {
        appendNumFilesWithDiffsToMdJson(mdJson, diffsWithExplanation.length);
        return (0, summarize_diffs_1.summarizeDiffs$)(diffsWithExplanation, languages, projectDirName, llmModel, executedCommands).pipe((0, rxjs_1.map)(summary => {
            appendSummaryToMdJson(mdJson, summary);
            return diffsWithExplanation;
        }));
    }), (0, rxjs_1.concatMap)(diffs => diffs), (0, rxjs_1.reduce)((mdJson, diffWithExplanation) => {
        appendCompResultToMdJson(mdJson, diffWithExplanation);
        return mdJson;
    }, mdJson), (0, rxjs_1.tap)(mdJson => {
        const _promptTemplates = promptTemplates || (0, explain_diffs_1.getDefaultPromptTemplates)();
        appendPromptsToMdJson(mdJson, _promptTemplates);
    }), (0, rxjs_1.concatMap)((mdJson) => {
        const outMarkdownFile = path_1.default.join(outdir, `${projectDirName}-compare-with-explanations-${timeStampYYYYMMDDHHMMSS}.md`);
        const outExecutedCommandsFile = path_1.default.join(outdir, `${projectDirName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
        return (0, rxjs_1.forkJoin)([
            writeCompareResultsToMarkdown$(mdJson, projectDirName, outMarkdownFile),
            writeExecutedCommands$(executedCommands, projectDirName, outExecutedCommandsFile),
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
function initializeMarkdown(comparisonParams, languages) {
    const projectDir = comparisonParams.projectDir;
    const inRemoteRepoMsg = comparisonParams.url_to_remote_repo ?
        ` in remote repo ${comparisonParams.url_to_remote_repo}` :
        '';
    const mdJson = [
        { h1: `Comparing ${comparisonParams.from_tag_branch_commit} with ${comparisonParams.to_tag_branch_commit}` },
        { h2: `Project directory: ${projectDir}` },
        { h4: `From Tag Branch or Commit: ${comparisonParams.from_tag_branch_commit}` },
        { h4: `To Tag Branch or Commit: ${comparisonParams.to_tag_branch_commit}${inRemoteRepoMsg}` },
        { h4: `Languages considered: ${languages === null || languages === void 0 ? void 0 : languages.join(', ')}` },
        { p: '' },
        { p: '------------------------------------------------------------------------------------------------' },
    ];
    return mdJson;
}
function appendNumFilesWithDiffsToMdJson(mdJson, numFilesWithDiffs) {
    mdJson.push({ h3: `Files with differences: ${numFilesWithDiffs}` });
    mdJson.push({ p: '==========================================================================' });
}
function appendCompResultToMdJson(mdJson, compareResult) {
    const linesOfCodeInfo = `lines of code: ${compareResult.code_same} same, ${compareResult.code_modified} modified, ${compareResult.code_added} added, ${compareResult.code_removed} removed`;
    mdJson.push({ p: '------------------------------------------------------------------------------------------------' });
    mdJson.push({ h3: compareResult.File });
    mdJson.push({ p: compareResult.explanation });
    mdJson.push({ p: '' });
    mdJson.push({ p: linesOfCodeInfo });
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
}
//# sourceMappingURL=cloc-git-diff-rel-between-tag-branch-commit.js.map