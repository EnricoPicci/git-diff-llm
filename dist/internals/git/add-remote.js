"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cdToProjectDirAndAddRemote$ = cdToProjectDirAndAddRemote$;
const rxjs_1 = require("rxjs");
const execute_command_1 = require("../execute-command/execute-command");
const convert_ssh_https_url_1 = require("./convert-ssh-https-url");
function cdToProjectDirAndAddRemote$(projectDir, fromToParams, executedCommands) {
    const baseRemoteName = 'base';
    const url_to_remote_repo = fromToParams.url_to_remote_repo;
    let commandIfRemoteExists = '';
    if (url_to_remote_repo) {
        // convert to ssh url if required (e.g. to avoid password prompts)
        let remoteUrl = url_to_remote_repo;
        if (fromToParams.use_ssh) {
            remoteUrl = (0, convert_ssh_https_url_1.convertHttpsToSshUrl)(url_to_remote_repo);
        }
        // the command must add git fetch the remote after the remote has been added
        commandIfRemoteExists = ` && git remote add ${baseRemoteName} ${remoteUrl} && git fetch ${baseRemoteName} --tags`;
    }
    const command = `cd ${projectDir} && git fetch --all --tags ${commandIfRemoteExists}`;
    return (0, execute_command_1.executeCommandObs$)('cd to project directory and add base remote', command, executedCommands).pipe((0, rxjs_1.catchError)((err) => {
        // if the remote base already exists, we can ignore the error
        if (err.message.includes(`remote ${baseRemoteName} already exists`)) {
            return (0, rxjs_1.of)(null);
        }
        // if the project directory does not exist, we can ignore the error
        // it may be that thre is a new forked project in gitlab which has not been cloned yet
        // in this case we can ignore the error but complete the observable to avoid that the
        // next observable in the chain executes the cloc command
        if (err.message.includes(`Command failed: cd`)) {
            console.log(`Project directory ${projectDir} does not exist`);
            executedCommands.push(`===>>> Error: Project directory ${projectDir} does not exist`);
            return rxjs_1.EMPTY;
        }
        throw (err);
    }));
}
//# sourceMappingURL=add-remote.js.map