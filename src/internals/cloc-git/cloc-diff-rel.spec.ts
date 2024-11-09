import { expect } from "chai";
import { toArray } from "rxjs";
import { ComparisonEnd } from "../git/git-diffs";
import { ComparisonParams, comparisonResultFromGitDiffForProject$ } from "./cloc-diff-rel";


describe(`comparisonResultFromGitDiffForProject$`, () => {
    it(`should return the diffs between 2 tags of the local repo
        The git diff should compare "refs/tags/first-tag vs refs/tags/second-tag"`, (done) => {
        const url_to_repo = 'https://github.com/EnricoPicci/git-diff-llm'
        const executedCommands: string[] = []
        const languages: string[] = []

        const from: ComparisonEnd = {
            tag_branch_commit: 'tags/second-tag',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const to: ComparisonEnd = {
            tag_branch_commit: 'tags/first-tag',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from,
            to_tag_branch_commit: to,
        }
        comparisonResultFromGitDiffForProject$(
            comparisonParams,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 1 file between the 2 tags 
                // https://github.com/EnricoPicci/git-diff-llm/compare/first-tag...second-tag
                //
                // if we switch the tags, the github web client does not show any change
                // https://github.com/EnricoPicci/git-diff-llm/compare/second-tag...first-tag
                // the git diff command shows the changes correctly in both cases
                // git diff first-tag second-tag --name-only
                // git diff second-tag first-tag --name-only
                expect(diffs.length).equal(1)
                const diff = diffs[0]
                expect(diff.File).equal('src/internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit.spec.ts')
                // expect(diff.fileGitUrl).equal('https://github.com/EnricoPicci/git-diff-llm/blob/second-tag/src/internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit.spec.ts')
            },
            error: (error: any) => done(error),
            complete: () => done()
        })
    }).timeout(100000);
});