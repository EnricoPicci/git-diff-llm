"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRemotes$ = getRemotes$;
const rxjs_1 = require("rxjs");
const execute_command_1 = require("../execute-command/execute-command");
function getRemotes$(gitRepoPath) {
    const command = `cd ${gitRepoPath} && git remote -v`;
    return (0, execute_command_1.executeCommandObs$)('read remotes', command).pipe((0, rxjs_1.map)((out) => {
        return out.split('\n').filter((line) => line.trim().length > 0);
    }));
}
//# sourceMappingURL=git-remotes.js.map