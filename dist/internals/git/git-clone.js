"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneRepo$ = cloneRepo$;
const rxjs_1 = require("rxjs");
const execute_command_1 = require("../execute-command/execute-command");
const convert_ssh_https_url_1 = require("./convert-ssh-https-url");
// cloneRepo$ clones a repo from a given url to a given path and returns the path of the cloned repo
function cloneRepo$(url, repoPath, use_ssh, user_id, password, accessToken) {
    if (!url)
        throw new Error(`url is mandatory`);
    if (!repoPath)
        throw new Error(`Path is mandatory`);
    if (!use_ssh && accessToken) {
        const urlParts = new URL(url);
        urlParts.username = 'oauth2';
        urlParts.password = accessToken;
        url = urlParts.toString();
    }
    else if (!use_ssh && user_id && password) {
        const urlParts = new URL(url);
        urlParts.username = user_id;
        urlParts.password = password;
        url = urlParts.toString();
    }
    else if (use_ssh) {
        url = (0, convert_ssh_https_url_1.convertHttpsToSshUrl)(url);
    }
    const command = `git clone ${url} ${repoPath.replaceAll(' ', '_')}`;
    return (0, execute_command_1.executeCommandObs$)(`Clone ${url}`, command).pipe((0, rxjs_1.tap)(() => `${url} cloned`), (0, rxjs_1.map)(() => repoPath), (0, rxjs_1.catchError)((err) => {
        console.error(`!!!!!!!!!!!!!!! Error: while cloning repo "${url}" - error code: ${err.code}`);
        console.error(`!!!!!!!!!!!!!!! Command erroring: "${command}"`);
        return rxjs_1.EMPTY;
    }));
}
//# sourceMappingURL=git-clone.js.map