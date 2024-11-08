import { expect } from 'chai';
import { ComparisonEnd, comparisonEndString, gitDiffsNameOnly$, tagBranchCommitPrefix } from './git-diffs';

describe(`tagBranchCommitPrefix`, () => {
    it(`should return the prefix when a tag passed in as arguments`, () => {
        const tag_branch_commit = 'tags/first-tag'
        const gitRemoteName = 'any-name'

        const expected_prefix = 'refs/'

        const prefix = tagBranchCommitPrefix(tag_branch_commit, gitRemoteName)
        expect(prefix).equal(expected_prefix)
    });

    it(`should return the prefix when a branch is passed in as arguments`, () => {
        const tag_branch_commit = 'any-branch'
        const gitRemoteName = `any-name`

        let expected_prefix = `${gitRemoteName}/`

        let prefix = tagBranchCommitPrefix(tag_branch_commit, gitRemoteName)
        expect(prefix).equal(expected_prefix)
    });

    it(`should return the prefix when a commits is passed in as arguments`, () => {
        const tag_branch_commit = '535f140d6d9d3532e6f4018cd02ea5b4e83c8e39'
        const gitRemoteName = `any-name`

        const expected_prefix = ''

        let prefix = tagBranchCommitPrefix(tag_branch_commit, gitRemoteName)
        expect(prefix).equal(expected_prefix)
    });
});


describe(`comparisonEndString`, () => {
    it(`should return the string to use for comparison when a tag passed in as arguments`, () => {
        const comparisonEnd: ComparisonEnd = {
            git_remote_name: 'any-name',
            tag_branch_commit: 'tags/first-tag',
            url_to_repo: 'any-url'
        }

        const expected_string = 'refs/tags/first-tag'

        const comp_string = comparisonEndString(comparisonEnd)
        expect(comp_string).equal(expected_string)
    });

    it(`should return the prefix when a branch is passed in as arguments`, () => {
        const comparisonEnd: ComparisonEnd = {
            git_remote_name: 'remote-name',
            tag_branch_commit: 'any-branch',
            url_to_repo: 'any-url'
        }

        const expected_string = `${comparisonEnd.git_remote_name}/${comparisonEnd.tag_branch_commit}`

        const comp_string = comparisonEndString(comparisonEnd)
        expect(comp_string).equal(expected_string)
    });

    it(`should return the prefix when a commits is passed in as arguments`, () => {
        const commit = '535f140d6d9d3532e6f4018cd02ea5b4e83c8e39'
        const comparisonEnd: ComparisonEnd = {
            git_remote_name: 'remote-name',
            tag_branch_commit: commit,
            url_to_repo: 'any-url'
        }

        const comp_string = comparisonEndString(comparisonEnd)
        expect(comp_string).equal(commit)
    });
});


describe(`gitDiffsNameOnly$`, () => {
    it(`should return the names of the files which diff between 2 references`, (done) => {
        const from: ComparisonEnd = {
            git_remote_name: 'origin',
            tag_branch_commit: 'tags/first-tag',
            url_to_repo: 'https://github.com/EnricoPicci/git-diff-llm'
        }
        const to: ComparisonEnd = {
            git_remote_name: 'origin',
            tag_branch_commit: 'tags/second-tag',
            url_to_repo: 'https://github.com/EnricoPicci/git-diff-llm'
        }

        const projectDir = './'
        const use_ssh = false
        const executedCommands: string[] = []

        gitDiffsNameOnly$(projectDir, from, to, use_ssh, executedCommands).subscribe({
            next: (result) => {
                expect(result).not.null
                // the result should be an array of strings
                const files = result.split('\n')
                expect(files).not.null
                expect(files.length).greaterThan(0)
                done()
            },
            error: (error) => {
                done(error)
            }
        })
    }).timeout(10000);
});