"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneRepo = cloneRepo;
const rxjs_1 = require("rxjs");
const execute_command_1 = require("../execute-command/execute-command");
// cloneRepo clones a repo from a given url to a given path and returns the path of the cloned repo
function cloneRepo(url, repoPath, repoName) {
    if (!url)
        throw new Error(`url is mandatory`);
    if (!repoPath)
        throw new Error(`Path is mandatory`);
    const command = `git clone ${url} ${repoPath.replaceAll(' ', '_')}`;
    return (0, execute_command_1.executeCommandObs$)(`Clone ${repoName}`, command).pipe((0, rxjs_1.tap)(() => `${repoName} cloned`), (0, rxjs_1.map)(() => repoPath), (0, rxjs_1.catchError)((err) => {
        console.error(`!!!!!!!!!!!!!!! Error: while cloning repo "${repoName}" - error code: ${err.code}`);
        console.error(`!!!!!!!!!!!!!!! Command erroring: "${command}"`);
        return rxjs_1.EMPTY;
    }));
}
//# sourceMappingURL=repo.js.map