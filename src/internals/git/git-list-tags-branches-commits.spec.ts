import { expect } from 'chai';
import { listBranches$, listCommits$, listTags$ } from './git-list-tags-branches-commits';
import { AddRemoteParams, addRemote$ } from './git-remote';
import { concatMap } from 'rxjs';


// tests on reomte origin
describe(`tests list tags, branches and commits on remote origin`, () => {
    describe(`listTags$`, () => {
        it(`should return a list of tags for the 'origin' of this repo of this project`, (done) => {
            let count = 0;
    
            const repoPath = './';
            const remote = 'origin';
    
            listTags$(repoPath, remote).subscribe({
                next: (tags) => {
                    count++;
                    expect(tags).to.be.an('array');
                    expect(tags.length).to.be.greaterThan(0);
                    const first = tags[0];
                    expect(first.includes('from stdout: ')).to.be.false;
                    expect(tags.includes('first-tag')).to.be.true;
                },
                error: (err) => {
                    done(err)
                },
                complete: () => {
                    expect(count).equal(1, 'should have only one next');
                    done();
                }
            })
        }).timeout(10000)
    });
    describe(`listBranches$`, () => {
        it(`should return a list of branches for the 'origin' of this repo of this project`, (done) => {
            let count = 0;
    
            const repoPath = './';
            const remote = 'origin';
    
            listBranches$(repoPath, remote).subscribe({
                next: (branches) => {
                    count++;
                    expect(branches).to.be.an('array');
                    expect(branches.length).to.be.greaterThan(0);
                    const first = branches[0];
                    expect(first.includes('from stdout: ')).to.be.false;
                    expect(branches.includes('first-branch-on-upstream')).to.be.true;
                },
                error: (err) => {
                    done(err)
                },
                complete: () => {
                    expect(count).equal(1, 'should have only one next');
                    done();
                }
            })
        }).timeout(10000)
    });
    describe(`listCommits$`, () => {
        it(`should return a list of commits for the 'origin' of this repo of this project`, (done) => {
            let count = 0;
    
            const repoPath = './';
            const remote = 'origin';
    
            listCommits$(repoPath, remote).subscribe({
                next: (commits) => {
                    count++;
                    expect(commits).to.be.an('array');
                    expect(commits.length).to.be.greaterThan(0);
                    const first = commits[0];
                    expect(first.includes('from stdout: ')).to.be.false;
                },
                error: (err) => {
                    done(err)
                },
                complete: () => {
                    expect(count).equal(1, 'should have only one next');
                    done();
                }
            })
        }).timeout(10000);
    });
})

// tests on remote base_test
describe(`tests list tags, branches and commits on remote base_test`, () => {
    const remote = 'base_test';
    const addRemoteParams: AddRemoteParams = {
        git_remote_name: remote,
        url_to_repo: 'https://github.com/EnricoPicci/git-diff-llm'
    }
    describe(`listTags$`, () => {
        it(`should return a list of tags for the 'base_test' remote of this repo of this project`, (done) => {
            let count = 0;
    
            const repoPath = './';
    
            // first add the remote to make sure it exists 
            // the remote is the same as the repo, just to be sure that we know the remote exists and has tags (because this repo has tags)
            addRemote$(repoPath, addRemoteParams, []).pipe(
                concatMap(() => {
                    return listTags$(repoPath, remote)
                }),
            ).subscribe({
                next: (tags) => {
                    count++;
                    expect(tags).to.be.an('array');
                    expect(tags.length).to.be.greaterThan(0);
                },
                error: (err) => {
                    done(err)
                },
                complete: () => {
                    expect(count).equal(1, 'should have only one next');
                    done();
                }
            })
        }).timeout(10000)
    });
    describe(`listBranches$`, () => {
        it(`should return a list of branches for the 'base_test' remote of this repo of this project`, (done) => {
            let count = 0;
    
            const repoPath = './';

            // first add the remote to make sure it exists 
            // the remote is the same as the repo, just to be sure that we know the remote exists and has branches (because this repo has branches)
            addRemote$(repoPath, addRemoteParams, []).pipe(
                concatMap(() => {
                    return listBranches$(repoPath, remote)
                }),
            ).subscribe({
                next: (branches) => {
                    count++;
                    expect(branches).to.be.an('array');
                    expect(branches.length).to.be.greaterThan(0);
                    // the branches of the remote base_test are the same as the branches of the remote origin
                    // since the remote base_test points to the same remote repo url as the remote origin
                    // this is to be sure that the remote base_test has the same branches as the remote origin
                    expect(branches.includes('first-branch-on-upstream')).to.be.true;
                },
                error: (err) => {
                    done(err)
                },
                complete: () => {
                    expect(count).equal(1, 'should have only one next');
                    done();
                }
            })
        }).timeout(10000)
    });
    describe(`listCommits$`, () => {
        it(`should return a list of commits for the 'base_test' remote of this repo of this project`, (done) => {
            let count = 0;
    
            const repoPath = './';

            // first add the remote to make sure it exists 
            // the remote is the same as the repo, just to be sure that we know the remote exists and has commits (because this repo has commits)
            addRemote$(repoPath, addRemoteParams, []).pipe(
                concatMap(() => {
                    return listCommits$(repoPath, remote)
                }),
            ).subscribe({
                next: (commits) => {
                    count++;
                    expect(commits).to.be.an('array');
                    expect(commits.length).to.be.greaterThan(0);
                },
                error: (err) => {
                    done(err)
                },
                complete: () => {
                    expect(count).equal(1, 'should have only one next');
                    done();
                }
            })
        }).timeout(10000)
    });
})
