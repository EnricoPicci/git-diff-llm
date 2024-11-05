"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const git_list_tags_branches_commits_1 = require("./git-list-tags-branches-commits");
const git_remote_1 = require("./git-remote");
const rxjs_1 = require("rxjs");
// tests on reomte origin
describe(`tests list tags, branches and commits on remote origin`, () => {
    describe(`listTags$`, () => {
        it(`should return a list of tags for the 'origin' of this repo of this project`, (done) => {
            let count = 0;
            const repoPath = './';
            const remote = 'origin';
            (0, git_list_tags_branches_commits_1.listTags$)(repoPath, remote).subscribe({
                next: (tags) => {
                    count++;
                    (0, chai_1.expect)(tags).to.be.an('array');
                    (0, chai_1.expect)(tags.length).to.be.greaterThan(0);
                    const first = tags[0];
                    (0, chai_1.expect)(first.includes('from stdout: ')).to.be.false;
                    (0, chai_1.expect)(tags.includes('first-tag')).to.be.true;
                },
                error: (err) => {
                    done(err);
                },
                complete: () => {
                    (0, chai_1.expect)(count).equal(1, 'should have only one next');
                    done();
                }
            });
        }).timeout(10000);
    });
    describe(`listBranches$`, () => {
        it(`should return a list of branches for the 'origin' of this repo of this project`, (done) => {
            let count = 0;
            const repoPath = './';
            const remote = 'origin';
            (0, git_list_tags_branches_commits_1.listBranches$)(repoPath, remote).subscribe({
                next: (branches) => {
                    count++;
                    (0, chai_1.expect)(branches).to.be.an('array');
                    (0, chai_1.expect)(branches.length).to.be.greaterThan(0);
                    const first = branches[0];
                    (0, chai_1.expect)(first.includes('from stdout: ')).to.be.false;
                    (0, chai_1.expect)(branches.includes('first-branch-on-upstream')).to.be.true;
                },
                error: (err) => {
                    done(err);
                },
                complete: () => {
                    (0, chai_1.expect)(count).equal(1, 'should have only one next');
                    done();
                }
            });
        }).timeout(10000);
    });
    describe(`listCommits$`, () => {
        it(`should return a list of commits for the 'origin' of this repo of this project`, (done) => {
            let count = 0;
            const repoPath = './';
            const remote = 'origin';
            (0, git_list_tags_branches_commits_1.listCommits$)(repoPath, remote).subscribe({
                next: (commits) => {
                    count++;
                    (0, chai_1.expect)(commits).to.be.an('array');
                    (0, chai_1.expect)(commits.length).to.be.greaterThan(0);
                    const first = commits[0];
                    (0, chai_1.expect)(first.includes('from stdout: ')).to.be.false;
                },
                error: (err) => {
                    done(err);
                },
                complete: () => {
                    (0, chai_1.expect)(count).equal(1, 'should have only one next');
                    done();
                }
            });
        }).timeout(10000);
    });
});
// tests on remote base_test
describe(`tests list tags, branches and commits on remote base_test`, () => {
    const remote = 'base_test';
    const addRemoteParams = {
        git_remote_name: remote,
        url_to_repo: 'https://github.com/EnricoPicci/git-diff-llm'
    };
    describe(`listTags$`, () => {
        it(`should return a list of tags for the 'base_test' remote of this repo of this project`, (done) => {
            let count = 0;
            const repoPath = './';
            // first add the remote to make sure it exists 
            // the remote is the same as the repo, just to be sure that we know the remote exists and has tags (because this repo has tags)
            (0, git_remote_1.addRemote$)(repoPath, addRemoteParams, []).pipe((0, rxjs_1.concatMap)(() => {
                return (0, git_list_tags_branches_commits_1.listTags$)(repoPath, remote);
            })).subscribe({
                next: (tags) => {
                    count++;
                    (0, chai_1.expect)(tags).to.be.an('array');
                    (0, chai_1.expect)(tags.length).to.be.greaterThan(0);
                },
                error: (err) => {
                    done(err);
                },
                complete: () => {
                    (0, chai_1.expect)(count).equal(1, 'should have only one next');
                    done();
                }
            });
        }).timeout(10000);
    });
    describe(`listBranches$`, () => {
        it(`should return a list of branches for the 'base_test' remote of this repo of this project`, (done) => {
            let count = 0;
            const repoPath = './';
            // first add the remote to make sure it exists 
            // the remote is the same as the repo, just to be sure that we know the remote exists and has branches (because this repo has branches)
            (0, git_remote_1.addRemote$)(repoPath, addRemoteParams, []).pipe((0, rxjs_1.concatMap)(() => {
                return (0, git_list_tags_branches_commits_1.listBranches$)(repoPath, remote);
            })).subscribe({
                next: (branches) => {
                    count++;
                    (0, chai_1.expect)(branches).to.be.an('array');
                    (0, chai_1.expect)(branches.length).to.be.greaterThan(0);
                    // the branches of the remote base_test are the same as the branches of the remote origin
                    // since the remote base_test points to the same remote repo url as the remote origin
                    // this is to be sure that the remote base_test has the same branches as the remote origin
                    (0, chai_1.expect)(branches.includes('first-branch-on-upstream')).to.be.true;
                },
                error: (err) => {
                    done(err);
                },
                complete: () => {
                    (0, chai_1.expect)(count).equal(1, 'should have only one next');
                    done();
                }
            });
        }).timeout(10000);
    });
    describe(`listCommits$`, () => {
        it(`should return a list of commits for the 'base_test' remote of this repo of this project`, (done) => {
            let count = 0;
            const repoPath = './';
            // first add the remote to make sure it exists 
            // the remote is the same as the repo, just to be sure that we know the remote exists and has commits (because this repo has commits)
            (0, git_remote_1.addRemote$)(repoPath, addRemoteParams, []).pipe((0, rxjs_1.concatMap)(() => {
                return (0, git_list_tags_branches_commits_1.listCommits$)(repoPath, remote);
            })).subscribe({
                next: (commits) => {
                    count++;
                    (0, chai_1.expect)(commits).to.be.an('array');
                    (0, chai_1.expect)(commits.length).to.be.greaterThan(0);
                },
                error: (err) => {
                    done(err);
                },
                complete: () => {
                    (0, chai_1.expect)(count).equal(1, 'should have only one next');
                    done();
                }
            });
        }).timeout(10000);
    });
});
//# sourceMappingURL=git-list-tags-branches-commits.spec.js.map