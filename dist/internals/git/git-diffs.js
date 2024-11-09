"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitDiff$ = gitDiff$;
exports.gitDiffsNameOnly$ = gitDiffsNameOnly$;
exports.gitRecsFileDiffs$ = gitRecsFileDiffs$;
exports.addRemotesAndCheckoutFromTagBranchCommit$ = addRemotesAndCheckoutFromTagBranchCommit$;
exports.addRemotes$ = addRemotes$;
exports.comparisonEndString = comparisonEndString;
exports.tagBranchCommitPrefix = tagBranchCommitPrefix;
exports.buildFileGitUrl = buildFileGitUrl;
const rxjs_1 = require("rxjs");
const execute_command_1 = require("../execute-command/execute-command");
const git_remote_1 = require("./git-remote");
const git_commit_hash_1 = require("./git-commit-hash");
const git_checkout_1 = require("./git-checkout");
const config_1 = require("../../config");
const path_1 = __importDefault(require("path"));
// execute git diff from a tag, branch or commit to another tag, branch or commit for a specific file
// Eventually runs a command like this:
// git diff refs/tags/first-tag refs/tags/second-tag -- path/to/file
function gitDiff$(projectDir, from_tag_branch_commit, to_tag_branch_commit, file, use_ssh, executedCommands) {
    return addRemotesAndCheckoutFromTagBranchCommit$(projectDir, from_tag_branch_commit, to_tag_branch_commit, use_ssh, executedCommands).pipe((0, rxjs_1.concatMap)(() => {
        const _to_tag_branch_commit = comparisonEndString(to_tag_branch_commit);
        const _from_tag_branch_commit = comparisonEndString(from_tag_branch_commit);
        const command = `git`;
        const args = [
            'diff',
            `${_to_tag_branch_commit}`,
            `${_from_tag_branch_commit}`,
            '--',
            file
        ];
        console.log(`running git diff ${args.join(' ')}`);
        const options = {
            cwd: projectDir
        };
        return (0, execute_command_1.executeCommandNewProcessObs)('run git diff', command, args, options, executedCommands);
    }), 
    // reduce the output of the git diff command, which can be a buffer in case of a long diff story, to a single string
    (0, rxjs_1.reduce)((acc, curr) => acc + curr, ''));
}
function gitDiffsNameOnly$(projectDir, from_tag_branch_commit, to_tag_branch_commit, use_ssh, executedCommands) {
    return addRemotes$(projectDir, from_tag_branch_commit, to_tag_branch_commit, use_ssh, executedCommands).pipe((0, rxjs_1.concatMap)(() => {
        const _to_tag_branch_commit = comparisonEndString(to_tag_branch_commit);
        const _from_tag_branch_commit = comparisonEndString(from_tag_branch_commit);
        const command = `git`;
        const args = [
            'diff',
            '--name-only',
            `${_to_tag_branch_commit}`,
            `${_from_tag_branch_commit}`
        ];
        console.log(`running git diff ${args.join(' ')}`);
        const options = {
            cwd: projectDir
        };
        return (0, execute_command_1.executeCommandNewProcessObs)('run git diff', command, args, options, executedCommands);
    }), 
    // reduce the output of the git diff command, which can be a buffer in case of a long diff story, to a single string
    (0, rxjs_1.reduce)((acc, curr) => acc + curr, ''), (0, rxjs_1.map)(diff => diff.trim()));
}
function gitRecsFileDiffs$(projectDir, from_tag_branch_commit, to_tag_branch_commit, use_ssh, executedCommands) {
    return gitDiffsNameOnly$(projectDir, from_tag_branch_commit, to_tag_branch_commit, use_ssh, executedCommands).pipe((0, rxjs_1.map)(filesWithDiff => {
        const gitRecs = filesWithDiff.split('\n').map(file => {
            const fullFilePath = `${path_1.default.join(projectDir, file)}`;
            const extension = file.split('.').pop() || '';
            return {
                File: file,
                projectDir,
                fullFilePath,
                extension
            };
        });
        return gitRecs;
    }));
}
// This function is useful when we want to add remotes and checkout from a tag, branch or commit
// This function can not be tested safely because it checks out from a tag, branch or commit
// and this can generate errors if the repo has uncommitted changes
function addRemotesAndCheckoutFromTagBranchCommit$(projectDir, from_tag_branch_commit, to_tag_branch_commit, use_ssh, executedCommands) {
    // if we are testing, we don't want to checkout from a tag, branch or commit
    // because this can generate errors if the repo has uncommitted changes
    const _checkout = (0, config_1.getConfig)().isTest ? false : true;
    return addRemotes$(projectDir, from_tag_branch_commit, to_tag_branch_commit, use_ssh, executedCommands, _checkout);
}
// The checkout param is useful when we only want to add remotes
// like in the case of tests where checking out can generate errors 
// (e.g. "error: Your local changes to the following files would be overwritten by checkout" 
// is an error that occurs if the test is run while the repo has uncommitted changes)
function addRemotes$(projectDir, from_tag_branch_commit, to_tag_branch_commit, use_ssh, executedCommands, checkout = false) {
    const addRemoteParams_from = {
        url_to_repo: from_tag_branch_commit.url_to_repo,
        git_remote_name: from_tag_branch_commit.git_remote_name,
        use_ssh
    };
    const addRemoteParams_to = {
        url_to_repo: to_tag_branch_commit.url_to_repo,
        git_remote_name: to_tag_branch_commit.git_remote_name,
        use_ssh
    };
    return (0, git_remote_1.addRemote$)(projectDir, addRemoteParams_from, executedCommands).pipe((0, rxjs_1.concatMap)(() => (0, git_remote_1.addRemote$)(projectDir, addRemoteParams_to, executedCommands)), (0, rxjs_1.concatMap)(() => {
        // if checkout is false, return an empty observable - this is useful when we only want to add remotes
        // like in the case of tests where checking out can generate errors 
        // (e.g. "error: Your local changes to the following files would be overwritten by checkout" 
        // is an error that occurs if the test is run while the repo has uncommitted changes)
        if (!checkout) {
            return (0, rxjs_1.of)('');
        }
        return (0, git_checkout_1.gitCheckout$)(projectDir, comparisonEndString(from_tag_branch_commit), executedCommands);
    }));
}
function comparisonEndString(comparisonEnd) {
    const prefix = tagBranchCommitPrefix(comparisonEnd.tag_branch_commit, comparisonEnd.git_remote_name);
    let _tag_branch_commit = comparisonEnd.tag_branch_commit;
    return `${prefix}${_tag_branch_commit}`;
}
function tagBranchCommitPrefix(tagBranchCommit, gitRemoteName) {
    if (tagBranchCommit.startsWith('tags/')) {
        return 'refs/';
    }
    if ((0, git_commit_hash_1.isInGitCommitHashFormat)(tagBranchCommit)) {
        return '';
    }
    return gitRemoteName + '/';
}
// builds the url to the file on a specific tag, branch or commit following the pattern:
// https://github.com/{owner}/{repo}/blob/{branch}/{path-to-file}
// where github.com can be replaced by the remote git server
//
// The parameter repoUrl represents the equivalent of https://github.com/{owner}/{repo}
function buildFileGitUrl(repoUrl, tagBranchCommit, file) {
    const _tagBranchCommit = tagBranchCommit.startsWith('tags/') ? tagBranchCommit.split('/')[1] : tagBranchCommit;
    return `${repoUrl}/blob/${_tagBranchCommit}/${file}`;
}
//# sourceMappingURL=git-diffs.js.map