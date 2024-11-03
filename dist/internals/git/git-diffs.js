"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitDiff$ = gitDiff$;
exports.toFromTagBranchCommitPrefix = toFromTagBranchCommitPrefix;
const rxjs_1 = require("rxjs");
const execute_command_1 = require("../execute-command/execute-command");
const git_remote_1 = require("./git-remote");
const git_commit_hash_1 = require("./git-commit-hash");
function gitDiff$(projectDir, fromToParams, file, executedCommands) {
    return (0, git_remote_1.addRemote$)(projectDir, fromToParams, executedCommands).pipe((0, rxjs_1.concatMap)(() => {
        const to_tag_branch_commit = fromToParams.to_tag_or_branch;
        const from_tag_branch_commit = fromToParams.from_tag_or_branch;
        // `git diff base/${upstream_repo_tag_or_branch} origin/${fork_tag_or_branch} -- <File>`
        const command = `git`;
        const compareWithRemote = fromToParams.url_to_remote_repo ? true : false;
        const prefixes = toFromTagBranchCommitPrefix(to_tag_branch_commit, from_tag_branch_commit, compareWithRemote);
        const args = [
            'diff',
            `${prefixes.toTagBranchCommitPrefix}${to_tag_branch_commit}`,
            `${prefixes.fromTagBranchCommitPrefix}${from_tag_branch_commit}`,
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
function toFromTagBranchCommitPrefix(toTagBranchCommit, fromTagBranchCommit, compareWithRemote = false) {
    const resp = {
        toTagBranchCommitPrefix: tagBranchCommitPrefix(toTagBranchCommit, compareWithRemote),
        fromTagBranchCommitPrefix: tagBranchCommitPrefix(fromTagBranchCommit)
    };
    return resp;
}
function tagBranchCommitPrefix(tagBranchCommit, compareWithRemote = false) {
    if (tagBranchCommit.startsWith('tags/')) {
        return 'refs/';
    }
    if ((0, git_commit_hash_1.isInGitCommitHashFormat)(tagBranchCommit)) {
        return '';
    }
    const base_or_origin_for_to_tagBranchCommit = compareWithRemote ? `${git_remote_1.DefaultNameOfGitRemote}/` : 'origin/';
    return base_or_origin_for_to_tagBranchCommit;
}
//# sourceMappingURL=git-diffs.js.map