"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasCodeAddedRemovedModified = hasCodeAddedRemovedModified;
exports.hasClocInfoDetails = hasClocInfoDetails;
exports.comparisonResultFromClocDiffRelForProject$ = comparisonResultFromClocDiffRelForProject$;
exports.comparisonResultFromClocDiffRelOrGitDiffForProject$ = comparisonResultFromClocDiffRelOrGitDiffForProject$;
exports.comparisonResultFromGitDiffForProject$ = comparisonResultFromGitDiffForProject$;
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const csv_tools_1 = require("@enrico.piccinin/csv-tools");
const execute_command_1 = require("../execute-command/execute-command");
const git_diffs_1 = require("../git/git-diffs");
function hasCodeAddedRemovedModified(rec) {
    const resp = rec.code_added.trim() !== '0' || rec.code_removed.trim() !== '0' || rec.code_modified.trim() !== '0';
    return resp;
}
// If cloc is not available, it is possible to use git diff to get the number of lines added, removed and modified
// in this case though we do not have all the info that cloc provides
const noClocVal = '-';
function hasClocInfoDetails(rec) {
    const resp = rec.code_added !== noClocVal;
    return resp;
}
const clocGitDiffRecHeader = 'File,blank_same,blank_modified,blank_added,blank_removed,comment_same,comment_modified,comment_added,comment_removed,code_same,code_modified,code_added,code_removed';
function comparisonResultFromClocDiffRelForProject$(comparisonParams, executedCommands, languages) {
    const projectDir = comparisonParams.projectDir;
    return clocDiffRel$(projectDir, comparisonParams.from_tag_branch_commit, comparisonParams.to_tag_branch_commit, !!comparisonParams.use_ssh, // the double negarion converts to boolean in case it is undefined
    languages, executedCommands).pipe((0, rxjs_1.filter)(line => line.trim().length > 0), 
    // skip the first line which is the header line
    // File, == blank, != blank, + blank, - blank, == comment, != comment, + comment, - comment, == code, != code, + code, - code, "github.com/AlDanial/cloc v 2.00 T=0.0747981071472168 s"
    (0, rxjs_1.skip)(1), 
    // start with the header line that we want to have
    (0, rxjs_1.startWith)(clocGitDiffRecHeader), (0, rxjs_1.map)(line => {
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
// This function tries to calculate the git diffs on the project using cloc git-diff-rel
// If cloc does not work, it falls back to git diff
// The reason for this is that cloc requires the PERL compiler to be installed
// and this is not always the case
function comparisonResultFromClocDiffRelOrGitDiffForProject$(comparisonParams, executedCommands, languages) {
    return comparisonResultFromClocDiffRelForProject$(comparisonParams, executedCommands, languages).pipe(
    // if cloc does not work, we fall back to git diff
    // we use the git diff output to fill in the missing fields
    // about number of lines changed
    (0, rxjs_1.catchError)(() => {
        return comparisonResultFromGitDiffForProject$(comparisonParams, executedCommands, languages);
    }));
}
//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes
// this stream is not safe in concurrent execution and therefore shouls NOT be called by operators that work concurrently
// e.g. mergeMap
function clocDiffRel$(projectDir, from_tag_branch_commit, to_tag_branch_commit, use_ssh, languages, executedCommands = []) {
    return (0, git_diffs_1.addRemotesAndCheckoutFromTagBranchCommit$)(projectDir, from_tag_branch_commit, to_tag_branch_commit, use_ssh, executedCommands).pipe((0, rxjs_1.concatMap)(() => {
        const _to_tag_branch_commit = (0, git_diffs_1.comparisonEndString)(to_tag_branch_commit);
        const _from_tag_branch_commit = (0, git_diffs_1.comparisonEndString)(from_tag_branch_commit);
        const command = `npx`;
        const args = [
            'cloc',
            '--git-diff-rel',
            '--csv',
            '--by-file',
            `${_to_tag_branch_commit}`,
            `${_from_tag_branch_commit}`
        ];
        // It is important to trim the languages because otherwise the command may not work properly
        // cloc --include-lang=Python,JavaScript,TypeScript
        // is correct while
        // cloc --include-lang=Python, JavaScript, TypeScript
        // is incorrect and will work only for Python
        if (languages) {
            languages = languages.map(lang => lang.trim()).filter(lang => lang.length > 0);
        }
        if (languages && (languages === null || languages === void 0 ? void 0 : languages.length) > 0) {
            const languagesString = languages.join(',');
            args.push(`--include-lang=${languagesString}`);
        }
        const options = {
            cwd: projectDir
        };
        return (0, execute_command_1.executeCommandNewProcessToLinesObs)('run npx cloc --git-diff-rel --csv --by-file', command, args, options, executedCommands);
    }));
}
// comparisonResultFromGitDiffForProject$ is a function that returns a stream of ClocGitDiffRec objects
// using git diff rather than cloc git-diff-rel
// It fills with 0 the fields about number of lines changed that are not present in the git diff output
// It is used as a fallback when cloc does not work (e.g. because the PERL compiler, which is required by cloc, is not installed)
function comparisonResultFromGitDiffForProject$(comparisonParams, executedCommands, languages) {
    const projectDir = comparisonParams.projectDir;
    return (0, git_diffs_1.gitRecsFileDiffs$)(projectDir, comparisonParams.from_tag_branch_commit, comparisonParams.to_tag_branch_commit, !!comparisonParams.use_ssh, // the double negarion converts to boolean in case it is undefined
    executedCommands).pipe((0, rxjs_1.concatMap)(recs => {
        return (0, rxjs_1.from)(recs);
    }), (0, rxjs_1.map)(rec => {
        const fillUp = {
            blank_same: noClocVal,
            blank_modified: noClocVal,
            blank_added: noClocVal,
            blank_removed: noClocVal,
            comment_same: noClocVal,
            comment_modified: noClocVal,
            comment_added: noClocVal,
            comment_removed: noClocVal,
            code_same: noClocVal,
            code_modified: noClocVal,
            code_added: noClocVal,
            code_removed: noClocVal,
        };
        const clocGitDiffRec = Object.assign(Object.assign({}, rec), fillUp);
        return clocGitDiffRec;
    }), (0, rxjs_1.filter)(rec => {
        if ((languages === null || languages === void 0 ? void 0 : languages.length) === 0) {
            return true;
        }
        const langExtMapping = {
            '.py': 'Python',
            '.js': 'JavaScript',
            '.ts': 'TypeScript',
            '.html': 'HTML',
            '.css': 'CSS',
            '.md': 'Markdown',
            '.sh': 'Shell',
            '.java': 'Java',
            '.c': 'C',
            '.cpp': 'C++',
            '.cs': 'C#',
            '.php': 'PHP',
            '.rb': 'Ruby',
            '.go': 'Go',
            '.rs': 'Rust',
            '.swift': 'Swift',
            '.kt': 'Kotlin',
            '.scala': 'Scala',
            '.r': 'R',
            '.pl': 'Perl',
            '.lua': 'Lua',
            '.hs': 'Haskell',
            '.clj': 'Clojure',
            '.groovy': 'Groovy',
            '.ex': 'Elixir',
            '.erl': 'Erlang',
            '.dart': 'Dart',
            '.fs': 'F#',
            '.m': 'Objective-C',
            '.rkt': 'Racket',
            '.scm': 'Scheme',
            '.lisp': 'Common Lisp',
            '.ml': 'OCaml',
            '.vb': 'Visual Basic',
            '.pas': 'Pascal',
            '.ada': 'Ada',
            '.hx': 'Haxe',
            '.jl': 'Julia',
            '.ps1': 'PowerShell',
            '.sql': 'SQL',
            '.vhd': 'VHDL',
            '.v': 'Verilog',
            '.vi': 'LabVIEW',
            '.ahk': 'AutoHotkey',
            '.au3': 'AutoIt',
            '.bat': 'Batch',
            '.coffee': 'CoffeeScript',
            '.d': 'D',
            'Dockerfile': 'Dockerfile',
            '.e': 'Eiffel',
            '.elm': 'Elm',
            '.f': 'Fortran',
            '.feature': 'Gherkin',
            '.gsp': 'Gosu',
            '.hbs': 'Handlebars',
            '.hcl': 'HCL',
            '.idl': 'IDL',
            '.json': 'JSON',
        };
        if (!languages) {
            return true;
        }
        const fileExtension = path_1.default.extname(rec.File);
        return languages.some(lang => langExtMapping[fileExtension] === lang);
    }));
}
//# sourceMappingURL=cloc-diff-rel.js.map