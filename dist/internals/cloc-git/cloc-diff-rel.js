"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparisonResultFromClocDiffRelForProject$ = comparisonResultFromClocDiffRelForProject$;
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const csv_tools_1 = require("@enrico.piccinin/csv-tools");
const execute_command_1 = require("../execute-command/execute-command");
const add_remote_1 = require("../git/add-remote");
const git_diffs_1 = require("../git/git-diffs");
function comparisonResultFromClocDiffRelForProject$(comparisonParams, executedCommands, languages) {
    const projectDir = comparisonParams.projectDir;
    const header = 'File,blank_same,blank_modified,blank_added,blank_removed,comment_same,comment_modified,comment_added,comment_removed,code_same,code_modified,code_added,code_removed';
    return clocDiffRel$(projectDir, {
        from_tag_or_branch: comparisonParams.from_tag_branch_commit,
        to_tag_or_branch: comparisonParams.to_tag_branch_commit,
        url_to_remote_repo: comparisonParams.url_to_remote_repo,
        languages
    }, executedCommands).pipe((0, rxjs_1.filter)(line => line.trim().length > 0), 
    // skip the first line which is the header line
    // File, == blank, != blank, + blank, - blank, == comment, != comment, + comment, - comment, == code, != code, + code, - code, "github.com/AlDanial/cloc v 2.00 T=0.0747981071472168 s"
    (0, rxjs_1.skip)(1), 
    // start with the header line that we want to have
    (0, rxjs_1.startWith)(header), (0, rxjs_1.map)(line => {
        // remove trailing comma without using regular expressions
        const _line = line.trim();
        if (_line.endsWith(',')) {
            return _line.slice(0, -1);
        }
        return _line;
    }), (0, csv_tools_1.fromCsvObs)(','), (0, rxjs_1.map)(rec => {
        const fullFilePath = path_1.default.join(projectDir, rec.File);
        const extension = path_1.default.extname(fullFilePath);
        const recWithPojectDir = Object.assign(Object.assign({}, rec), { projectDir, fullFilePath, extension });
        return recWithPojectDir;
    }));
}
//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes
// this stream is not safe in concurrent execution and therefore shouls NOT be called by operators that work concurrently
// e.g. mergeMap
function clocDiffRel$(projectDir, fromToParams, executedCommands) {
    return (0, add_remote_1.cdToProjectDirAndAddRemote$)(projectDir, fromToParams, executedCommands).pipe((0, rxjs_1.concatMap)(() => {
        var _a;
        const to_tag_branch_commit = fromToParams.to_tag_or_branch;
        const from_tag_branch_commit = fromToParams.from_tag_or_branch;
        // `cloc --git-diff-rel --csv --by-file base/${upstream_repo_tag_or_branch} origin/${fork_tag_or_branch}`
        const command = `cloc`;
        const compareWithRemote = fromToParams.url_to_remote_repo ? true : false;
        const prefixes = (0, git_diffs_1.toFromTagBranchCommitPrefix)(to_tag_branch_commit, from_tag_branch_commit, compareWithRemote);
        const args = [
            '--git-diff-rel',
            '--csv',
            '--by-file',
            `${prefixes.fromTagBranchCommitPrefix}${from_tag_branch_commit}`,
            `${prefixes.toTagBranchCommitPrefix}${to_tag_branch_commit}`
        ];
        if (fromToParams.languages && ((_a = fromToParams.languages) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            const languagesString = fromToParams.languages.join(',');
            args.push(`--include-lang=${languagesString}`);
        }
        const options = {
            cwd: projectDir
        };
        return (0, execute_command_1.executeCommandNewProcessToLinesObs)('run cloc --git-diff-rel --csv --by-file', command, args, options, executedCommands);
    }));
}
//# sourceMappingURL=cloc-diff-rel.js.map