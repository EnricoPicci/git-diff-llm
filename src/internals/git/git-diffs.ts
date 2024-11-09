import { concatMap, of, reduce } from "rxjs"
import { executeCommandNewProcessObs } from "../execute-command/execute-command"
import { addRemote$, AddRemoteParams } from "./git-remote"
import { isInGitCommitHashFormat } from "./git-commit-hash"
import { gitCheckout$ } from "./git-checkout"
import { getConfig } from "../../config"

export type ComparisonEnd = {
    url_to_repo: string,
    git_remote_name: string,
    tag_branch_commit: string
}
// execute git diff from a tag, branch or commit to another tag, branch or commit for a specific file
// Eventually runs a command like this:
// git diff refs/tags/first-tag refs/tags/second-tag -- path/to/file
export function gitDiff$(
    projectDir: string,
    from_tag_branch_commit: ComparisonEnd,
    to_tag_branch_commit: ComparisonEnd,
    file: string,
    use_ssh: boolean,
    executedCommands: string[]
) {
    
    return addRemotesAndCheckoutFromTagBranchCommit$(
        projectDir,
        from_tag_branch_commit,
        to_tag_branch_commit,
        use_ssh,
        executedCommands
    ).pipe(
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

export function gitDiffsNameOnly$(
    projectDir: string, 
    from_tag_branch_commit: ComparisonEnd, 
    to_tag_branch_commit: ComparisonEnd, 
    use_ssh: boolean, 
    executedCommands: string[],
) {
    return addRemotes$(
        projectDir,
        from_tag_branch_commit,
        to_tag_branch_commit,
        use_ssh,
        executedCommands
    ).pipe(
        concatMap(() => {
            const _to_tag_branch_commit = comparisonEndString(to_tag_branch_commit)
            const _from_tag_branch_commit = comparisonEndString(from_tag_branch_commit)
            const command = `git`
            
            const args = [
                'diff',
                '--name-only',
                `${_to_tag_branch_commit}`,
                `${_from_tag_branch_commit}`
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

// This function is useful when we want to add remotes and checkout from a tag, branch or commit
// This function can not be tested safely because it checks out from a tag, branch or commit
// and this can generate errors if the repo has uncommitted changes
export function addRemotesAndCheckoutFromTagBranchCommit$(
    projectDir: string, 
    from_tag_branch_commit: ComparisonEnd, 
    to_tag_branch_commit: ComparisonEnd, 
    use_ssh: boolean, 
    executedCommands: string[]
) {
    // if we are testing, we don't want to checkout from a tag, branch or commit
    // because this can generate errors if the repo has uncommitted changes
    const _checkout = getConfig().isTest ? false : true
    return addRemotes$(
        projectDir, 
        from_tag_branch_commit, 
        to_tag_branch_commit, 
        use_ssh, 
        executedCommands,
        _checkout
    )
}


// The checkout param is useful when we only want to add remotes
// like in the case of tests where checking out can generate errors 
// (e.g. "error: Your local changes to the following files would be overwritten by checkout" 
// is an error that occurs if the test is run while the repo has uncommitted changes)
export function addRemotes$(
    projectDir: string, 
    from_tag_branch_commit: ComparisonEnd, 
    to_tag_branch_commit: ComparisonEnd, 
    use_ssh: boolean, 
    executedCommands: string[],
    checkout: boolean = false
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
            // if checkout is false, return an empty observable - this is useful when we only want to add remotes
            // like in the case of tests where checking out can generate errors 
            // (e.g. "error: Your local changes to the following files would be overwritten by checkout" 
            // is an error that occurs if the test is run while the repo has uncommitted changes)
            if (!checkout) {
                return of('')
            }
            return gitCheckout$(
                projectDir,
                comparisonEndString(from_tag_branch_commit),
                executedCommands
            )
        })
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

// builds the url to the file on a specific tag, branch or commit following the pattern:
// https://github.com/{owner}/{repo}/blob/{branch}/{path-to-file}
// where github.com can be replaced by the remote git server
//
// The parameter repoUrl represents the equivalent of https://github.com/{owner}/{repo}
export function buildFileGitUrl(repoUrl: string, tagBranchCommit: string, file: string) {
    const _tagBranchCommit = tagBranchCommit.startsWith('tags/') ? tagBranchCommit.split('/')[1] : tagBranchCommit
    return `${repoUrl}/blob/${_tagBranchCommit}/${file}`
}