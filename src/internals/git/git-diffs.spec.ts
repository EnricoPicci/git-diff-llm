import { expect } from 'chai';
import { ComparisonEnd, comparisonEndString, tagBranchCommitPrefix } from './git-diffs';

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