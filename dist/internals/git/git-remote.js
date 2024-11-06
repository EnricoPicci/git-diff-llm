"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultNameOfGitRemote = void 0;
exports.addRemote$ = addRemote$;
exports.listRemotes$ = listRemotes$;
exports.removeRemote$ = removeRemote$;
const rxjs_1 = require("rxjs");
const execute_command_1 = require("../execute-command/execute-command");
const convert_ssh_https_url_1 = require("./convert-ssh-https-url");
exports.DefaultNameOfGitRemote = 'default_name_of_git_remote';
// cd to project directory and add a remote to the project if the remote url is provided
function addRemote$(projectDir, params, executedCommands) {
    const baseRemoteName = params.git_remote_name ? params.git_remote_name : exports.DefaultNameOfGitRemote;
    const url_to_remote_repo = params.url_to_repo;
    let commandIfRemoteExists = '';
    let remoteUrl = url_to_remote_repo;
    if (url_to_remote_repo) {
        // convert to ssh url if required (e.g. to avoid password prompts)
        if (params.use_ssh) {
            remoteUrl = (0, convert_ssh_https_url_1.convertHttpsToSshUrl)(url_to_remote_repo);
        }
        // the command must add git fetch the remote after the remote has been added
        commandIfRemoteExists = ` && git remote add ${baseRemoteName} ${remoteUrl} && git fetch ${baseRemoteName} --tags`;
    }
    const command = `cd ${projectDir} && git fetch --all --tags ${commandIfRemoteExists}`;
    return (0, execute_command_1.executeCommandObs$)('cd to project directory and add remote', command, executedCommands).pipe(
    // this command can emit both on stderr and stdout
    // the notification on stderr is not an error, so we can ignore it
    // we can also ignore the notification on stdout
    // we place last here so that we make sure we emit only once and that the notification itself means the completion of the command
    (0, rxjs_1.last)(), (0, rxjs_1.catchError)((err) => {
        // if the remote base already exists, we can ignore the error
        if (err.message.includes(`remote ${baseRemoteName} already exists`)) {
            // remove the remote if it already exists and add it again with the new url
            const command = `cd ${projectDir} && git remote remove ${baseRemoteName} && git remote add ${baseRemoteName} ${remoteUrl} && git fetch ${baseRemoteName} --tags`;
            return (0, execute_command_1.executeCommandObs$)('remove remote and add it again with new url', command, executedCommands).pipe((0, rxjs_1.last)());
        }
        throw (err);
    }));
}
function listRemotes$(gitRepoPath, executedCommands) {
    const command = `cd ${gitRepoPath} && git remote -v`;
    return (0, execute_command_1.executeCommandObs$)('read remotes', command, executedCommands).pipe((0, rxjs_1.last)());
}
function removeRemote$(gitRepoPath, remoteName, executedCommands) {
    const command = `cd ${gitRepoPath} && git remote remove ${remoteName}`;
    return (0, execute_command_1.executeCommandObs$)('remove remote', command, executedCommands);
}
//# sourceMappingURL=git-remote.js.map