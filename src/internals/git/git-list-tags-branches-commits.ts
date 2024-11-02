import { map } from "rxjs";
import { executeCommandObs$ } from "../execute-command/execute-command";

export function listTags$(gitRepoPath: string, remote = 'origin') {
    // alternative command could be 
    // - 'git log --remotes=origin  --oneline --decorate
    // - 'git log --remotes=base  --oneline --decorate
    //
    // this command returns something like:
    // 036b4b3 (base/first-branch-on-fork) first commit on a branch of fork
    // cd3ad75 (tag: first-tag-on-fork, base/master) first commit on fork
    // bee7279 (tag: second-tag) progressively improving allDiffsForProjectWithExplanation$
    // 2c14017 (tag: first-tag) wip
    // 4fd7165 (origin/second-branch-on-upstream, second-branch-on-upstream) test diff between 2 commits on local improved
    // 5e8d527 (origin/first-branch-on-upstream, first-branch-on-upstream) cloc-git-diff-rel-between-tag-branch-commit.spec unskipped
    // 965e1e4 core app code working . cloc-git-diff-rel-between-tag-branch-commit.spec no working yet
    // c5caa34 project setup
    // whic can be parsed to get the branches and tags
    const command = `cd ${gitRepoPath} && git ls-remote --tags --sort=-creatordate ${remote}`
    return executeCommandObs$('read tags', command).pipe(
        map((out) => {
            return out.split('\n').filter((line) => line.trim().length > 0);
        }),
        map((lines) => {
            return lines.map((line) => {
                return line.split('\t')[1].replace('refs/tags/', '');
            });
        }),
    );
}

export function listBranches$(gitRepoPath: string, remote = 'origin') {
    // alternative command could be 
    // - 'git log --remotes=origin  --oneline --decorate
    // - 'git log --remotes=base  --oneline --decorate
    //
    // this command returns something like:
    // 036b4b3 (base/first-branch-on-fork) first commit on a branch of fork
    // cd3ad75 (tag: first-tag-on-fork, base/master) first commit on fork
    // bee7279 (tag: second-tag) progressively improving allDiffsForProjectWithExplanation$
    // 2c14017 (tag: first-tag) wip
    // 4fd7165 (origin/second-branch-on-upstream, second-branch-on-upstream) test diff between 2 commits on local improved
    // 5e8d527 (origin/first-branch-on-upstream, first-branch-on-upstream) cloc-git-diff-rel-between-tag-branch-commit.spec unskipped
    // 965e1e4 core app code working . cloc-git-diff-rel-between-tag-branch-commit.spec no working yet
    // c5caa34 project setup
    // whic can be parsed to get the branches and tags
    const command = `cd ${gitRepoPath} && git ls-remote --heads --sort=-creatordate ${remote}`
    return executeCommandObs$('read branches', command).pipe(
        map((out) => {
            return out.split('\n').filter((line) => line.trim().length > 0);
        }),
        map((lines) => {
            return lines.map((line) => {
                return line.split('\t')[1].replace('refs/heads/', '');
            });
        }),
    );
}

export function listCommits$(gitRepoPath: string, remote = 'origin') {
    const command = `cd ${gitRepoPath} && git log --pretty=format:"%H" --remotes=${remote}`
    return executeCommandObs$('read commits', command).pipe(
        map((out) => {
            return out.split('\n').filter((line) => line.trim().length > 0);
        }),
        map((lines) => {
            lines[0] = lines[0].replace('from stdout: ', '');
            return lines;
        }),
    );
}
