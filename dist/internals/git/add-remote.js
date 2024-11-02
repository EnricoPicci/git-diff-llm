"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cdToProjectDirAndAddRemote$ = cdToProjectDirAndAddRemote$;
const rxjs_1 = require("rxjs");
const execute_command_1 = require("../execute-command/execute-command");
const convert_ssh_https_url_1 = require("./convert-ssh-https-url");
// cd to project directory and add a remote to the project if the remote url is provided
function cdToProjectDirAndAddRemote$(projectDir, params, executedCommands) {
    const baseRemoteName = params.remote ? params.remote : 'base';
    const url_to_remote_repo = params.url_to_remote_repo;
    let commandIfRemoteExists = '';
    if (url_to_remote_repo) {
        // convert to ssh url if required (e.g. to avoid password prompts)
        let remoteUrl = url_to_remote_repo;
        if (params.use_ssh) {
            remoteUrl = (0, convert_ssh_https_url_1.convertHttpsToSshUrl)(url_to_remote_repo);
        }
        // the command must add git fetch the remote after the remote has been added
        commandIfRemoteExists = ` && git remote add ${baseRemoteName} ${remoteUrl} && git fetch ${baseRemoteName} --tags`;
    }
    const command = `cd ${projectDir} && git fetch --all --tags ${commandIfRemoteExists}`;
    return (0, execute_command_1.executeCommandObs$)('cd to project directory and add base remote', command, executedCommands).pipe(
    // this command can emit both on stderr and stdout
    // the notification on stderr is not an error, so we can ignore it
    // we can also ignore the notification on stdout
    // we place last here so that we make sure we emit only once and that the notification itself means the completion of the command
    (0, rxjs_1.last)(), (0, rxjs_1.catchError)((err) => {
        // if the remote base already exists, we can ignore the error
        if (err.message.includes(`remote ${baseRemoteName} already exists`)) {
            return (0, rxjs_1.of)(null);
        }
        throw (err);
    }));
}
//# sourceMappingURL=add-remote.js.map