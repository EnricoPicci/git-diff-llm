import { concatMap, reduce } from "rxjs"
import { executeCommandNewProcessObs } from "../execute-command/execute-command"
import { addRemote$, AddRemoteParams } from "./git-remote"
import { isInGitCommitHashFormat } from "./git-commit-hash"

export type ComparisonEnd = {
    url_to_repo: string,
    git_remote_name: string,
    tag_branch_commit: string
}
export function gitDiff$(
    projectDir: string,
    from_tag_branch_commit: ComparisonEnd,
    to_tag_branch_commit: ComparisonEnd,
    file: string,
    use_ssh: boolean,
    executedCommands: string[]
) {
    const addRemoteParams_from: AddRemoteParams = {
        url_to_repo: from_tag_branch_commit.url_to_repo,
        git_remote_name: from_tag_branch_commit.git_remote_name,
        use_ssh
    }
    const addRemoteParams_to: AddRemoteParams = {
        url_to_repo: to_tag_branch_commit.url_to_repo,
        git_remote_name: to_tag_branch_commit.git_remote_name,
        use_ssh
    }
    return addRemote$(
        projectDir,
        addRemoteParams_from,
        executedCommands
    ).pipe(
        concatMap(() => addRemote$(
            projectDir,
            addRemoteParams_to,
            executedCommands
        )),
        concatMap(() => {
            const _to_tag_branch_commit = comparisonEndString(to_tag_branch_commit)
            const _from_tag_branch_commit = comparisonEndString(from_tag_branch_commit)
            const command = `git`
            
            const args = [
                'diff',
                `${_to_tag_branch_commit}`,
                `${_from_tag_branch_commit}`,
                '--',
                file
            ]

            console.log(`running git diff ${args.join(' ')}`)

            const options = {
                cwd: projectDir
            }
            return executeCommandNewProcessObs(
                'run git diff', command, args, options, executedCommands
            )
        }),
        // reduce the output of the git diff command, which can be a buffer in case of a long diff story, to a single string
        reduce((acc, curr) => acc + curr, '')
    )
}

export function comparisonEndString(comparisonEnd: ComparisonEnd) {
    const prefix = tagBranchCommitPrefix(comparisonEnd.tag_branch_commit, comparisonEnd.git_remote_name)
    let _tag_branch_commit = comparisonEnd.tag_branch_commit
    return `${prefix}${_tag_branch_commit}`
}

export function tagBranchCommitPrefix(tagBranchCommit: string, gitRemoteName: string) {
    if (tagBranchCommit.startsWith('tags/')) {
        return 'refs/'
    }
    if (isInGitCommitHashFormat(tagBranchCommit)) {
        return ''
    }
    return gitRemoteName + '/'
}