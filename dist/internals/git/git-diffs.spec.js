"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const git_diffs_1 = require("./git-diffs");
describe(`tagBranchCommitPrefix`, () => {
    it(`should return the prefix when a tag passed in as arguments`, () => {
        const tag_branch_commit = 'tags/first-tag';
        const gitRemoteName = 'any-name';
        const expected_prefix = 'refs/';
        const prefix = (0, git_diffs_1.tagBranchCommitPrefix)(tag_branch_commit, gitRemoteName);
        (0, chai_1.expect)(prefix).equal(expected_prefix);
    });
    it(`should return the prefix when a branch is passed in as arguments`, () => {
        const tag_branch_commit = 'any-branch';
        const gitRemoteName = `any-name`;
        let expected_prefix = `${gitRemoteName}/`;
        let prefix = (0, git_diffs_1.tagBranchCommitPrefix)(tag_branch_commit, gitRemoteName);
        (0, chai_1.expect)(prefix).equal(expected_prefix);
    });
    it(`should return the prefix when a commits is passed in as arguments`, () => {
        const tag_branch_commit = '535f140d6d9d3532e6f4018cd02ea5b4e83c8e39';
        const gitRemoteName = `any-name`;
        const expected_prefix = '';
        let prefix = (0, git_diffs_1.tagBranchCommitPrefix)(tag_branch_commit, gitRemoteName);
        (0, chai_1.expect)(prefix).equal(expected_prefix);
    });
});
describe(`comparisonEndString`, () => {
    it(`should return the string to use for comparison when a tag passed in as arguments`, () => {
        const comparisonEnd = {
            git_remote_name: 'any-name',
            tag_branch_commit: 'tags/first-tag',
            url_to_repo: 'any-url'
        };
        const expected_string = 'refs/tags/first-tag';
        const comp_string = (0, git_diffs_1.comparisonEndString)(comparisonEnd);
        (0, chai_1.expect)(comp_string).equal(expected_string);
    });
    it(`should return the prefix when a branch is passed in as arguments`, () => {
        const comparisonEnd = {
            git_remote_name: 'remote-name',
            tag_branch_commit: 'any-branch',
            url_to_repo: 'any-url'
        };
        const expected_string = `${comparisonEnd.git_remote_name}/${comparisonEnd.tag_branch_commit}`;
        const comp_string = (0, git_diffs_1.comparisonEndString)(comparisonEnd);
        (0, chai_1.expect)(comp_string).equal(expected_string);
    });
    it(`should return the prefix when a commits is passed in as arguments`, () => {
        const commit = '535f140d6d9d3532e6f4018cd02ea5b4e83c8e39';
        const comparisonEnd = {
            git_remote_name: 'remote-name',
            tag_branch_commit: commit,
            url_to_repo: 'any-url'
        };
        const comp_string = (0, git_diffs_1.comparisonEndString)(comparisonEnd);
        (0, chai_1.expect)(comp_string).equal(commit);
    });
});
//# sourceMappingURL=git-diffs.spec.js.map