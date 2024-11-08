"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitDiff$ = gitDiff$;
exports.gitDiffsNameOnly$ = gitDiffsNameOnly$;
exports.addRemotes$ = addRemotes$;
exports.comparisonEndString = comparisonEndString;
exports.tagBranchCommitPrefix = tagBranchCommitPrefix;
const rxjs_1 = require("rxjs");
const execute_command_1 = require("../execute-command/execute-command");
const git_remote_1 = require("./git-remote");
const git_commit_hash_1 = require("./git-commit-hash");
const git_checkout_1 = require("./git-checkout");
function gitDiff$(projectDir, from_tag_branch_commit, to_tag_branch_commit, file, use_ssh, executedCommands) {
    return addRemotes$(projectDir, from_tag_branch_commit, to_tag_branch_commit, use_ssh, executedCommands).pipe((0, rxjs_1.concatMap)(() => {
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
    (0, rxjs_1.reduce)((acc, curr) => acc + curr, ''));
}
function addRemotes$(projectDir, from_tag_branch_commit, to_tag_branch_commit, use_ssh, executedCommands) {
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
//# sourceMappingURL=git-diffs.js.map