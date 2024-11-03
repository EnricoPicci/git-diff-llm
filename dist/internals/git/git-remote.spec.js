"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const git_remote_1 = require("./git-remote");
const rxjs_1 = require("rxjs");
describe(`addRemote$`, () => {
    it(`should add a remote to the git repo - the repo in the current directory is used for the test`, (done) => {
        const projectDir = './';
        const timestamp = new Date().getTime();
        // use a unique remote name for the test
        const remote_name = 'remote_' + timestamp.toString();
        const addRemoteParams = {
            url_to_remote_repo: 'https://github.com/git-diff-llm/git-diff-llm',
            name_of_git_remote: remote_name
        };
        const executedCommands = [];
        (0, git_remote_1.addRemote$)(projectDir, addRemoteParams, executedCommands).pipe((0, rxjs_1.concatMap)(() => {
            return (0, git_remote_1.listRemotes$)(projectDir, executedCommands).pipe((0, rxjs_1.tap)({
                next: (remotes) => {
                    console.log(`remotes: ${remotes}`);
                    (0, chai_1.expect)(remotes).to.contain(remote_name);
                },
            }), (0, rxjs_1.concatMap)(() => {
                return (0, git_remote_1.removeRemote$)(projectDir, remote_name, executedCommands);
            }));
        })).subscribe({
            error: (err) => done(err),
            complete: () => done()
        });
    }).timeout(10000);
    it(`should add a remote to the git repo even if there is already a remote with the same name`, (done) => {
        const projectDir = './';
        const timestamp = new Date().getTime();
        // use a unique remote name for the test
        const remote_name = 'remote_' + timestamp.toString();
        const addRemoteParams = {
            url_to_remote_repo: 'https://github.com/EnricoPicci/git-diff-llm',
            name_of_git_remote: remote_name
        };
        const executedCommands = [];
        (0, git_remote_1.addRemote$)(projectDir, addRemoteParams, executedCommands).pipe((0, rxjs_1.concatMap)(() => {
            return (0, git_remote_1.addRemote$)(projectDir, addRemoteParams, executedCommands);
        }), (0, rxjs_1.concatMap)(() => {
            return (0, git_remote_1.listRemotes$)(projectDir, executedCommands).pipe((0, rxjs_1.tap)({
                next: (remotes) => {
                    console.log(`remotes: ${remotes}`);
                    (0, chai_1.expect)(remotes).to.contain(remote_name);
                },
            }), (0, rxjs_1.concatMap)(() => {
                return (0, git_remote_1.removeRemote$)(projectDir, remote_name, executedCommands);
            }));
        })).subscribe({
            error: (err) => done(err),
            complete: () => done()
        });
    }).timeout(10000);
});
//# sourceMappingURL=git-remote.spec.js.map