import fs from 'fs';
import { toArray } from 'rxjs';

import { expect } from 'chai';
import {  allDiffsForProjectWithExplanation$, GenerateMdReportParams, writeAllDiffsForProjectWithExplanationToMarkdown$ } from './cloc-git-diff-rel-between-tag-branch-commit';
import { PromptTemplates } from '../git/explain-diffs';
import path from 'path';
import { ComparisonParams } from './cloc-diff-rel';

const repoRootFolder = './'
const executedCommands: string[] = []
const languages = ['Markdown', "TypeScript"]
const promptTemplates = readPromptTemplates()

describe(`allDiffsForProjectWithExplanation$`, () => {
    //===================== TESTS ON LOCAL REPO =====================
    it(`should return the diffs between 2 tags of the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'tags/second-tag',
            to_tag_branch_commit: 'tags/first-tag',
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
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
            },
            error: (error: any) => done(error),
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between a branch and a tag of the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'first-branch-on-upstream',  // older branch
            to_tag_branch_commit: 'tags/first-tag',  // newer tag
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
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

    it(`should return the diffs between 2 branches of the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'first-branch-on-upstream',
            to_tag_branch_commit: 'second-branch-on-upstream',
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
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

    it(`should return the diffs between a older commit and a newer branch of the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: '965e1e43ca3b1e834d1146f90e60bf6fb42ed88b',  // older commit
            to_tag_branch_commit: 'second-branch-on-upstream', // branch newer than the commit
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
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

    it(`should return the diffs between a newer commit and an older branch of the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'first-branch-on-upstream',  // branch older than the commit
            to_tag_branch_commit: '4fd71654b5d044e67c6fc1c1f0fa06155036152f', // newer commit
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
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

    it(`should return the diffs between 2 commits on the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: '965e1e43ca3b1e834d1146f90e60bf6fb42ed88b', // older commit
            to_tag_branch_commit: '5e8d5278ec8fb203adfcca33d5bbc15fb626d71f', // newer commit
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
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

    it(`should return the diffs between a tag of the local repo and a tag on the remote repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'tags/first-tag',
            to_tag_branch_commit: 'tags/first-tag-on-fork',
            url_to_remote_repo: url_to_remote_forked_repo,
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
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

    it(`should return the diffs between a branch of the local repo and a branch on the remote repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'tags/first-tag',
            to_tag_branch_commit: 'first-branch-on-fork',
            url_to_remote_repo: url_to_remote_forked_repo,
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            promptTemplates,
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
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'tags/second-tag',
            to_tag_branch_commit: 'tags/first-tag',
        }
        const outDir = './temp'

        const params: GenerateMdReportParams = {
            comparisonParams,
            repoFolder: repoRootFolder,
            promptTemplates,
            outdir: outDir,
            languages
        }
        writeAllDiffsForProjectWithExplanationToMarkdown$(params).subscribe({
            error: (error: any) => done(error),
            complete: () => done()
        })
    }).timeout(100000);
});

function readPromptTemplates() {
    const promptTemplateFileChanged = "/prompts/explain-diff.txt";
    const promptTemplateFileAdded = "/prompts/explain-added.txt";
    const promptTemplateFileRemoved = "/prompts/explain-removed.txt";
    const currentDir = process.cwd();

    console.log(`currentDir: ${currentDir}`);
    const _promptTemplateFileChanged = path.join(currentDir, promptTemplateFileChanged);
    const promptChanged = fs.readFileSync(_promptTemplateFileChanged, 'utf-8');
    const _promptTemplateFileAdded = path.join(currentDir, promptTemplateFileAdded);
    const promptAdded = fs.readFileSync(_promptTemplateFileAdded, 'utf-8');
    const _promptTemplateFileRemoved = path.join(currentDir, promptTemplateFileRemoved);
    const promptRemoved = fs.readFileSync(_promptTemplateFileRemoved, 'utf-8');

    const promptTemplates: PromptTemplates = {
        changedFile: { prompt: promptChanged, description: 'Prompt to summarize the changes in a file' },
        addedFile: { prompt: promptAdded, description: 'Prompt to summarize a file that has been added' },
        removedFile: { prompt: promptRemoved, description: 'Prompt to summarize a file that has been removed' }
    }
    return promptTemplates
}