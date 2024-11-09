"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const rxjs_1 = require("rxjs");
const cloc_diff_rel_1 = require("./cloc-diff-rel");
describe(`comparisonResultFromGitDiffForProject$`, () => {
    it(`should return the diffs between 2 tags of the local repo
        The git diff should compare "refs/tags/first-tag vs refs/tags/second-tag"`, (done) => {
        const url_to_repo = 'https://github.com/EnricoPicci/git-diff-llm';
        const executedCommands = [];
        const languages = [];
        const from = {
            tag_branch_commit: 'tags/second-tag',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const to = {
            tag_branch_commit: 'tags/first-tag',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const comparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from,
            to_tag_branch_commit: to,
        };
        (0, cloc_diff_rel_1.comparisonResultFromGitDiffForProject$)(comparisonParams, executedCommands, languages).pipe((0, rxjs_1.toArray)()).subscribe({
            next: (diffs) => {
                // there is a difference of 1 file between the 2 tags 
                // https://github.com/EnricoPicci/git-diff-llm/compare/first-tag...second-tag
                //
                // if we switch the tags, the github web client does not show any change
                // https://github.com/EnricoPicci/git-diff-llm/compare/second-tag...first-tag
                // the git diff command shows the changes correctly in both cases
                // git diff first-tag second-tag --name-only
                // git diff second-tag first-tag --name-only
                (0, chai_1.expect)(diffs.length).equal(1);
                const diff = diffs[0];
                (0, chai_1.expect)(diff.File).equal('src/internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit.spec.ts');
                // expect(diff.fileGitUrl).equal('https://github.com/EnricoPicci/git-diff-llm/blob/second-tag/src/internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit.spec.ts')
            },
            error: (error) => done(error),
            complete: () => done()
        });
    }).timeout(100000);
});
//# sourceMappingURL=cloc-diff-rel.spec.js.map