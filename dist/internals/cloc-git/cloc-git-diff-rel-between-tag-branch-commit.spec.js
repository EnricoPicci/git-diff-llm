"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const chai_1 = require("chai");
const cloc_git_diff_rel_between_tag_branch_commit_1 = require("./cloc-git-diff-rel-between-tag-branch-commit");
const prompt_templates_1 = require("../prompt-templates/prompt-templates");
const message_writer_1 = require("../message-writer/message-writer");
const executedCommands = [];
const languages = ['Markdown', "TypeScript"];
const promptTemplates = (0, prompt_templates_1.getDefaultPromptTemplates)();
const llmModel = 'gpt-3.5-turbo';
const url_to_repo = 'https://github.com/EnricoPicci/git-diff-llm';
describe.skip(`allDiffsForProjectWithExplanation$`, () => {
    //===================== TESTS ON LOCAL REPO =====================
    it(`should return the diffs between 2 tags of the local repo
        The git diff should compare "refs/tags/first-tag vs refs/tags/second-tag"`, (done) => {
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
        (0, cloc_git_diff_rel_between_tag_branch_commit_1.allDiffsForProjectWithExplanation$)(comparisonParams, promptTemplates, llmModel, executedCommands, languages).pipe((0, rxjs_1.toArray)()).subscribe({
            next: (diffs) => {
                // there is a difference of 2 files between the 2 tags 
                // https://github.com/EnricoPicci/git-diff-llm/compare/first-tag...second-tag
                //
                // if we switch the tags, the github web client does not show any change
                // https://github.com/EnricoPicci/git-diff-llm/compare/second-tag...first-tag
                // the git diff command shows the changes correctly in both cases
                // git diff first-tag second-tag --name-only
                // git diff first-tag second-tag --name-only
                (0, chai_1.expect)(diffs.length).equal(1);
            },
            error: (error) => done(error),
            complete: () => done()
        });
    }).timeout(100000);
    it(`should return the diffs between a branch and a tag of the local repo
        The git diff should compare "refs/tags/first-tag vs origin/first-branch-on-upstream"`, (done) => {
        const from = {
            tag_branch_commit: 'first-branch-on-upstream',
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
            from_tag_branch_commit: from, // older branch
            to_tag_branch_commit: to, // newer tag
        };
        (0, cloc_git_diff_rel_between_tag_branch_commit_1.allDiffsForProjectWithExplanation$)(comparisonParams, promptTemplates, llmModel, executedCommands, languages).pipe((0, rxjs_1.toArray)()).subscribe({
            next: (diffs) => {
                // there is a difference of 3 files of type TypeScript or Markdown between the tag and the branch
                // there is a fourth file changed but this is with extension .txt and is not counted
                // https://github.com/EnricoPicci/git-diff-llm/compare/first-branch-on-upstream...first-tag
                (0, chai_1.expect)(diffs.length).equal(1);
            },
            error: (error) => {
                done(error);
            },
            complete: () => done()
        });
    }).timeout(100000);
    it(`should return the diffs between 2 branches of the local repo
        The git diff should compare "origin/second-branch-on-upstream vs origin/first-branch-on-upstream"`, (done) => {
        const from = {
            tag_branch_commit: 'first-branch-on-upstream',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const to = {
            tag_branch_commit: 'second-branch-on-upstream',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const comparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from,
            to_tag_branch_commit: to,
        };
        (0, cloc_git_diff_rel_between_tag_branch_commit_1.allDiffsForProjectWithExplanation$)(comparisonParams, promptTemplates, llmModel, executedCommands, languages).pipe((0, rxjs_1.toArray)()).subscribe({
            next: (diffs) => {
                // there is a difference of 1 files of type TypeScript or Markdown between the branch and the commit
                // there is a second file changed but this is with extension .txt and is not counted
                // If you check on GitHub web client with the url 
                // https://github.com/EnricoPicci/git-diff-llm/compare/first-branch-on-upstream...second-branch-on-upstream
                //
                // if we switch the branches, the github web client does not show any change
                // https://github.com/EnricoPicci/git-diff-llm/compare/second-branch-on-upstream...first-branch-on-upstream
                // the git diff command shows the changes correctly in both cases
                // git diff first-branch-on-upstream second-branch-on-upstream --name-only
                // git diff second-branch-on-upstream first-branch-on-upstream --name-only
                (0, chai_1.expect)(diffs.length).equal(1);
            },
            error: (error) => {
                done(error);
            },
            complete: () => done()
        });
    }).timeout(100000);
    it(`should return the diffs between a older commit and a newer branch of the local repo
        The git diff should compare "origin/second-branch-on-upstream vs 965e1e43ca3b1e834d1146f90e60bf6fb42ed88b"`, (done) => {
        const from = {
            tag_branch_commit: '965e1e43ca3b1e834d1146f90e60bf6fb42ed88b',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const to = {
            tag_branch_commit: 'second-branch-on-upstream',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const comparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from, // older commit
            to_tag_branch_commit: to, // branch newer than the commit
        };
        (0, cloc_git_diff_rel_between_tag_branch_commit_1.allDiffsForProjectWithExplanation$)(comparisonParams, promptTemplates, llmModel, executedCommands, languages).pipe((0, rxjs_1.toArray)()).subscribe({
            next: (diffs) => {
                // there is a difference of 1 files of type TypeScript or Markdown between the branch and the commit
                // https://github.com/EnricoPicci/git-diff-llm/compare/965e1e43ca3b1e834d1146f90e60bf6fb42ed88b...second-branch-on-upstream
                (0, chai_1.expect)(diffs.length).equal(1);
                (0, chai_1.expect)(diffs[0].File).equal('src/internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit.spec.ts');
            },
            error: (error) => {
                done(error);
            },
            complete: () => done()
        });
    }).timeout(100000);
    it(`should return the diffs between a newer commit and an older branch of the local repo
        The git diff should compare "4fd71654b5d044e67c6fc1c1f0fa06155036152f vs origin/first-branch-on-upstream"`, (done) => {
        const from = {
            tag_branch_commit: 'first-branch-on-upstream',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const to = {
            tag_branch_commit: '4fd71654b5d044e67c6fc1c1f0fa06155036152f',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const comparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from, // branch older than the commit
            to_tag_branch_commit: to, // newer commit
        };
        (0, cloc_git_diff_rel_between_tag_branch_commit_1.allDiffsForProjectWithExplanation$)(comparisonParams, promptTemplates, llmModel, executedCommands, languages).pipe((0, rxjs_1.toArray)()).subscribe({
            next: (diffs) => {
                // there is a difference of 1 files of type TypeScript or Markdown between the branch and the commit
                // https://github.com/EnricoPicci/git-diff-llm/compare/first-branch-on-upstream...4fd71654b5d044e67c6fc1c1f0fa06155036152f
                (0, chai_1.expect)(diffs.length).equal(1);
                (0, chai_1.expect)(diffs[0].File).equal('src/internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit.spec.ts');
            },
            error: (error) => {
                done(error);
            },
            complete: () => done()
        });
    }).timeout(100000);
    it(`should return the diffs between 2 commits on the local repo
        The git diff should compare "5e8d5278ec8fb203adfcca33d5bbc15fb626d71f vs 965e1e43ca3b1e834d1146f90e60bf6fb42ed88b"`, (done) => {
        const from = {
            tag_branch_commit: '965e1e43ca3b1e834d1146f90e60bf6fb42ed88b',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const to = {
            tag_branch_commit: '5e8d5278ec8fb203adfcca33d5bbc15fb626d71f',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const comparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from, // older commit
            to_tag_branch_commit: to, // newer commit
        };
        (0, cloc_git_diff_rel_between_tag_branch_commit_1.allDiffsForProjectWithExplanation$)(comparisonParams, promptTemplates, llmModel, executedCommands, languages).pipe((0, rxjs_1.toArray)()).subscribe({
            next: (diffs) => {
                // there is a difference of 1 files of type TypeScript or Markdown between the 2 commits
                // https://github.com/EnricoPicci/git-diff-llm/compare/965e1e43ca3b1e834d1146f90e60bf6fb42ed88b...5e8d5278ec8fb203adfcca33d5bbc15fb626d71f
                //
                // the git web client does not show any difference if we invert the order of the commits
                // https://github.com/EnricoPicci/git-diff-llm/compare/5e8d5278ec8fb203adfcca33d5bbc15fb626d71f...965e1e43ca3b1e834d1146f90e60bf6fb42ed88b
                (0, chai_1.expect)(diffs.length).equal(1);
                (0, chai_1.expect)(diffs[0].File).equal('src/internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit.spec.ts');
            },
            error: (error) => {
                done(error);
            },
            complete: () => done()
        });
    }).timeout(100000);
    //===================== TESTS ON REMOTE REPO =====================
    // Comparison between tags, branches and commits of the local repo and the remote repo
    // the name of the forked repo is the same as the upstream repo but the owner is different
    // the owner of the upstream repo is EnricoPicci while the owner of the forked repo is git-diff-llm
    const url_to_remote_forked_repo = 'https://github.com/git-diff-llm/git-diff-llm'; // repo forked from the github.com/EnricoPicci/git-diff-llm
    it(`should return the diffs between a tag of the local repo and a tag on the remote repo
        The git diff should compare "refs/tags/first-tag-on-fork vs refs/tags/first-tag"`, (done) => {
        const from = {
            tag_branch_commit: 'tags/first-tag',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const to = {
            tag_branch_commit: 'tags/first-tag-on-fork',
            url_to_repo: url_to_remote_forked_repo,
            git_remote_name: 'fork'
        };
        const comparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from,
            to_tag_branch_commit: to,
        };
        (0, cloc_git_diff_rel_between_tag_branch_commit_1.allDiffsForProjectWithExplanation$)(comparisonParams, promptTemplates, llmModel, executedCommands, languages).pipe((0, rxjs_1.toArray)()).subscribe({
            next: (diffs) => {
                // there is a difference of 4 files between the 2 tags, but one of these files is a txt file and 
                // therefore is not counted since the filter on the languages is ['Markdown', "TypeScript"] 
                // https://github.com/EnricoPicci/git-diff-llm/compare/first-tag...git-diff-llm:git-diff-llm:first-tag-on-fork
                (0, chai_1.expect)(diffs.length).equal(3);
            },
            error: (error) => done(error),
            complete: () => done()
        });
    }).timeout(100000);
    it(`should return the diffs between a branch of the local repo and a branch on the remote repo
        The git diff should compare "fork/first-branch-on-fork vs refs/tags/first-tag"`, (done) => {
        const from = {
            tag_branch_commit: 'tags/first-tag',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const to = {
            tag_branch_commit: 'first-branch-on-fork',
            url_to_repo: url_to_remote_forked_repo,
            git_remote_name: 'fork'
        };
        const comparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from,
            to_tag_branch_commit: to,
        };
        (0, cloc_git_diff_rel_between_tag_branch_commit_1.allDiffsForProjectWithExplanation$)(comparisonParams, promptTemplates, llmModel, executedCommands, languages).pipe((0, rxjs_1.toArray)()).subscribe({
            next: (diffs) => {
                // there is a difference of 5 files between the upstream branch and the remote tag, but one of these files is a txt file and 
                // therefore is not counted since the filter on the languages is ['Markdown', "TypeScript"] 
                // https://github.com/EnricoPicci/git-diff-llm/compare/first-tag...git-diff-llm:git-diff-llm:first-branch-on-fork
                (0, chai_1.expect)(diffs.length).equal(4);
            },
            error: (error) => done(error),
            complete: () => done()
        });
    }).timeout(100000);
});
describe.skip(`writeAllDiffsForProjectWithExplanationToMarkdown$`, () => {
    it(`should produce a markdown report - the test just tests that function completes without errors`, (done) => {
        const from = {
            tag_branch_commit: 'tags/second-tag',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const to = {
            tag_branch_commit: 'tags/second-tag',
            url_to_repo,
            git_remote_name: 'origin'
        };
        const comparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from,
            to_tag_branch_commit: to,
        };
        const outDir = './temp';
        const params = {
            comparisonParams,
            promptTemplates,
            llmModel: llmModel,
            outdir: outDir,
            languages
        };
        (0, cloc_git_diff_rel_between_tag_branch_commit_1.writeAllDiffsForProjectWithExplanationToMarkdown$)(params, message_writer_1.DefaultMessageWriter).subscribe({
            error: (error) => done(error),
            complete: () => done()
        });
    }).timeout(100000);
});
//# sourceMappingURL=cloc-git-diff-rel-between-tag-branch-commit.spec.js.map