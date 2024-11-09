import { toArray } from 'rxjs';

import { expect } from 'chai';
import {  allDiffsForProjectWithExplanation$, GenerateMdReportParams, writeAllDiffsForProjectWithExplanationToMarkdown$ } from './cloc-git-diff-rel-between-tag-branch-commit';
import { ComparisonParams } from './cloc-diff-rel';
import { getDefaultPromptTemplates } from '../prompt-templates/prompt-templates';
import { ComparisonEnd } from '../git/git-diffs';
import { DefaultMessageWriter } from '../message-writer/message-writer';
import { getConfig } from '../../config';

const executedCommands: string[] = []
const languages = ['Markdown', "TypeScript"]
const promptTemplates = getDefaultPromptTemplates()
const llmModel = 'gpt-3.5-turbo'
const url_to_repo = 'https://github.com/EnricoPicci/git-diff-llm'

describe(`allDiffsForProjectWithExplanation$`, () => {
    // set the config to test mode so that the function does not perform actions not allowed in test mode
    // e.g. checkout a branch
    getConfig().isTest = true

    //===================== TESTS ON LOCAL REPO =====================
    it(`should return the diffs between 2 tags of the local repo
        The git diff should compare "refs/tags/first-tag vs refs/tags/second-tag"`, (done) => {
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
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
            llmModel,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 2 files between the 2 tags 
                // https://github.com/EnricoPicci/git-diff-llm/compare/first-tag...second-tag
                //
                // if we switch the tags, the github web client does not show any change
                // https://github.com/EnricoPicci/git-diff-llm/compare/second-tag...first-tag
                // the git diff command shows the changes correctly in both cases
                // git diff first-tag second-tag --name-only
                // git diff first-tag second-tag --name-only
                expect(diffs.length).equal(1)
                const diff = diffs[0]
                expect(diff.File).equal('src/internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit.spec.ts')
                expect(diff.fileGitUrl).equal('https://github.com/EnricoPicci/git-diff-llm/blob/second-tag/src/internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit.spec.ts')
            },
            error: (error: any) => done(error),
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between a branch and a tag of the local repo
        The git diff should compare "refs/tags/first-tag vs origin/first-branch-on-upstream"`, (done) => {
        const from: ComparisonEnd = {
            tag_branch_commit: 'first-branch-on-upstream',
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
            from_tag_branch_commit: from,  // older branch
            to_tag_branch_commit: to,  // newer tag
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
            llmModel,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 3 files of type TypeScript or Markdown between the tag and the branch
                // there is a fourth file changed but this is with extension .txt and is not counted
                // https://github.com/EnricoPicci/git-diff-llm/compare/first-branch-on-upstream...first-tag
                expect(diffs.length).equal(1)
            },
            error: (error: any) => {
                done(error)
            },
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between 2 branches of the local repo
        The git diff should compare "origin/second-branch-on-upstream vs origin/first-branch-on-upstream"`, (done) => {
        const from: ComparisonEnd = {
            tag_branch_commit: 'first-branch-on-upstream',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const to: ComparisonEnd = {
            tag_branch_commit: 'second-branch-on-upstream',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from,
            to_tag_branch_commit: to,
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
            llmModel,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
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
                expect(diffs.length).equal(1)
            },
            error: (error: any) => {
                done(error)
            },
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between a older commit and a newer branch of the local repo
        The git diff should compare "origin/second-branch-on-upstream vs 965e1e43ca3b1e834d1146f90e60bf6fb42ed88b"`, (done) => {
        const from: ComparisonEnd = {
            tag_branch_commit: '965e1e43ca3b1e834d1146f90e60bf6fb42ed88b',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const to: ComparisonEnd = {
            tag_branch_commit: 'second-branch-on-upstream',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from,  // older commit
            to_tag_branch_commit: to, // branch newer than the commit
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
            llmModel,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 1 files of type TypeScript or Markdown between the branch and the commit
                // https://github.com/EnricoPicci/git-diff-llm/compare/965e1e43ca3b1e834d1146f90e60bf6fb42ed88b...second-branch-on-upstream
                expect(diffs.length).equal(1)
                expect(diffs[0].File).equal('src/internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit.spec.ts')
            },
            error: (error: any) => {
                done(error)
            },
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between a newer commit and an older branch of the local repo
        The git diff should compare "4fd71654b5d044e67c6fc1c1f0fa06155036152f vs origin/first-branch-on-upstream"`, (done) => {
        const from: ComparisonEnd = {
            tag_branch_commit: 'first-branch-on-upstream',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const to: ComparisonEnd = {
            tag_branch_commit: '4fd71654b5d044e67c6fc1c1f0fa06155036152f',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from,  // branch older than the commit
            to_tag_branch_commit: to, // newer commit
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
            llmModel,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 1 files of type TypeScript or Markdown between the branch and the commit
                // https://github.com/EnricoPicci/git-diff-llm/compare/first-branch-on-upstream...4fd71654b5d044e67c6fc1c1f0fa06155036152f
                expect(diffs.length).equal(1)
                expect(diffs[0].File).equal('src/internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit.spec.ts')
            },
            error: (error: any) => {
                done(error)
            },
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between 2 commits on the local repo
        The git diff should compare "5e8d5278ec8fb203adfcca33d5bbc15fb626d71f vs 965e1e43ca3b1e834d1146f90e60bf6fb42ed88b"`, (done) => {
        const from: ComparisonEnd = {
            tag_branch_commit: '965e1e43ca3b1e834d1146f90e60bf6fb42ed88b',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const to: ComparisonEnd = {
            tag_branch_commit: '5e8d5278ec8fb203adfcca33d5bbc15fb626d71f',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from, // older commit
            to_tag_branch_commit: to, // newer commit
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
            llmModel,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 1 files of type TypeScript or Markdown between the 2 commits
                // https://github.com/EnricoPicci/git-diff-llm/compare/965e1e43ca3b1e834d1146f90e60bf6fb42ed88b...5e8d5278ec8fb203adfcca33d5bbc15fb626d71f
                //
                // the git web client does not show any difference if we invert the order of the commits
                // https://github.com/EnricoPicci/git-diff-llm/compare/5e8d5278ec8fb203adfcca33d5bbc15fb626d71f...965e1e43ca3b1e834d1146f90e60bf6fb42ed88b
                expect(diffs.length).equal(1)
                expect(diffs[0].File).equal('src/internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit.spec.ts')
            },
            error: (error: any) => {
                done(error)
            },
            complete: () => done()
        })
    }).timeout(100000);

    //===================== TESTS ON REMOTE REPO =====================
    // Comparison between tags, branches and commits of the local repo and the remote repo

    // the name of the forked repo is the same as the upstream repo but the owner is different
    // the owner of the upstream repo is EnricoPicci while the owner of the forked repo is git-diff-llm
    const url_to_remote_forked_repo = 'https://github.com/git-diff-llm/git-diff-llm'  // repo forked from the github.com/EnricoPicci/git-diff-llm

    it(`should return the diffs between a tag of the local repo and a tag on the remote repo
        The git diff should compare "refs/tags/first-tag-on-fork vs refs/tags/first-tag"`, (done) => {
        const from: ComparisonEnd = {
            tag_branch_commit: 'tags/first-tag',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const to: ComparisonEnd = {
            tag_branch_commit: 'tags/first-tag-on-fork',
            url_to_repo: url_to_remote_forked_repo,
            git_remote_name: 'fork'
        }
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from,
            to_tag_branch_commit: to,
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
            llmModel,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 4 files between the 2 tags, but one of these files is a txt file and 
                // therefore is not counted since the filter on the languages is ['Markdown', "TypeScript"] 
                // https://github.com/EnricoPicci/git-diff-llm/compare/first-tag...git-diff-llm:git-diff-llm:first-tag-on-fork
                expect(diffs.length).equal(3)
            },
            error: (error: any) => done(error),
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between a branch of the local repo and a branch on the remote repo
        The git diff should compare "fork/first-branch-on-fork vs refs/tags/first-tag"`, (done) => {
        const from: ComparisonEnd = {
            tag_branch_commit: 'tags/first-tag',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const to: ComparisonEnd = {
            tag_branch_commit: 'first-branch-on-fork',
            url_to_repo: url_to_remote_forked_repo,
            git_remote_name: 'fork'
        }
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from,
            to_tag_branch_commit: to,
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
            llmModel,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 5 files between the upstream branch and the remote tag, but one of these files is a txt file and 
                // therefore is not counted since the filter on the languages is ['Markdown', "TypeScript"] 
                // https://github.com/EnricoPicci/git-diff-llm/compare/first-tag...git-diff-llm:git-diff-llm:first-branch-on-fork
                expect(diffs.length).equal(4)
            },
            error: (error: any) => done(error),
            complete: () => done()
        })
    }).timeout(100000);
});


describe(`writeAllDiffsForProjectWithExplanationToMarkdown$`, () => {
    it(`should produce a markdown report - the test just tests that function completes without errors`, (done) => {
        const from: ComparisonEnd = {
            tag_branch_commit: 'tags/second-tag',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const to: ComparisonEnd = {
            tag_branch_commit: 'tags/second-tag',
            url_to_repo,
            git_remote_name: 'origin'
        }
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            url_to_repo: url_to_repo,
            from_tag_branch_commit: from,
            to_tag_branch_commit: to,
        }
        const outDir = './temp'

        const params: GenerateMdReportParams = {
            comparisonParams,
            promptTemplates,
            llmModel: llmModel,
            outdir: outDir,
            languages
        }
        // set the config to test mode so that the function does not perform actions not allowed in test mode
        // e.g. checkout a branch
        getConfig().isTest = true
        writeAllDiffsForProjectWithExplanationToMarkdown$(params, DefaultMessageWriter).subscribe({
            error: (error: any) => done(error),
            complete: () => done()
        })
    }).timeout(100000);
});
