import { expect } from 'chai';
import { addRemote$, AddRemoteParams, listRemotes$, removeRemote$ } from './git-remote';
import { concatMap, tap } from 'rxjs';

describe(`addRemote$`, () => {
    it(`should add a remote to the git repo - the repo in the current directory is used for the test`, (done) => {
        const projectDir = './'
        const timestamp = new Date().getTime()
        // use a unique remote name for the test
        const remote_name = 'remote_' + timestamp.toString()

        const addRemoteParams: AddRemoteParams = {
            url_to_repo: 'https://github.com/git-diff-llm/git-diff-llm',
            git_remote_name: remote_name
        }

        const executedCommands: string[] = []

        addRemote$(projectDir, addRemoteParams, executedCommands).pipe(
            concatMap(() => {
                return listRemotes$(projectDir, executedCommands).pipe(
                    tap({
                        next: (remotes) => {
                            console.log(`remotes: ${remotes}`)
                            expect(remotes).to.contain(remote_name)
                        },
                    }),
                    concatMap(() => {
                        return removeRemote$(projectDir, remote_name, executedCommands)
                    }),
                )
            })
        ).subscribe({
            error: (err) => done(err),
            complete: () => done()
        })
    }).timeout(10000);
    
    it(`should add a remote to the git repo even if there is already a remote with the same name`, (done) => {
        const projectDir = './'
        const timestamp = new Date().getTime()
        // use a unique remote name for the test
        const remote_name = 'remote_' + timestamp.toString()

        const addRemoteParams: AddRemoteParams = {
            url_to_repo: 'https://github.com/EnricoPicci/git-diff-llm',
            git_remote_name: remote_name
        }

        const executedCommands: string[] = []

        addRemote$(projectDir, addRemoteParams, executedCommands).pipe(
            concatMap(() => {
                return addRemote$(projectDir, addRemoteParams, executedCommands)
            }),
            concatMap(() => {
                return listRemotes$(projectDir, executedCommands).pipe(
                    tap({
                        next: (remotes) => {
                            console.log(`remotes: ${remotes}`)
                            expect(remotes).to.contain(remote_name)
                        },
                    }),
                    concatMap(() => {
                        return removeRemote$(projectDir, remote_name, executedCommands)
                    }),
                )
            })
        ).subscribe({
            error: (err) => done(err),
            complete: () => done()
        })
    }).timeout(10000);
});