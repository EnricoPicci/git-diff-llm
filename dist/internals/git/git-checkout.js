"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitCheckout$ = gitCheckout$;
const rxjs_1 = require("rxjs");
const execute_command_1 = require("../execute-command/execute-command");
function gitCheckout$(projectDir, tagBranchCommit, executedCommands) {
    const command = `cd ${projectDir} && git checkout ${tagBranchCommit}`;
    return (0, execute_command_1.executeCommandObs$)('read remotes', command, executedCommands).pipe((0, rxjs_1.last)());
}
//# sourceMappingURL=git-checkout.js.map