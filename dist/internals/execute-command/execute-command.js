"use strict";
// https://gist.github.com/wosephjeber/212f0ca7fea740c3a8b03fc2283678d3
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCommand = executeCommand;
exports.executeCommandObs$ = executeCommandObs$;
exports.executeCommandNewProcessObs = executeCommandNewProcessObs;
exports.executeCommandNewProcessToLinesObs = executeCommandNewProcessToLinesObs;
exports.executeCommandInShellNewProcessObs = executeCommandInShellNewProcessObs;
exports.getCommandOutput = getCommandOutput;
const child_process_1 = require("child_process");
const rxjs_1 = require("rxjs");
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function executeCommand(action, command) {
    console.log(`====>>>> Action: ${action} -- Executing command`);
    console.log(`====>>>> ${command}`);
    const ret = (0, child_process_1.execSync)(command)
        .toString('utf8')
        .replace(/[\n\r\s]+$/, '');
    console.log(`====>>>> Command executed successfully`);
    return ret;
}
function executeCommandObs$(action, command, executedCommands) {
    return new rxjs_1.Observable((subscriber) => {
        console.log(`====>>>> Action: ${action} -- Executing command with Observable`);
        console.log(`====>>>> ${command}`);
        (0, child_process_1.exec)(command, (error, stdout, stderr) => {
            if (error) {
                subscriber.error(error);
                return;
            }
            if (stderr.length > 0) {
                subscriber.next(`from stderr: ${stderr}`);
            }
            if (stdout.length > 0) {
                subscriber.next(`from stdout: ${stdout}`);
            }
            if (stdout.length === 0 && stderr.length === 0) {
                subscriber.next(`no message on stdout or stderr`);
            }
            console.log(`====>>>> Command ${command} executed successfully`);
            if (executedCommands) {
                executedCommands.push(command);
            }
            subscriber.complete();
        });
    });
}
function executeCommandNewProcessObs(action, command, args, options, executedCommands) {
    return new rxjs_1.Observable((subscriber) => {
        console.log(`====>>>> Action: ${action} -- Executing command in new process`);
        console.log(`====>>>> Command: ${command}`);
        console.log(`====>>>> Arguments: ${args.join(' ')}`);
        if (options) {
            console.log(`====>>>> Options: ${JSON.stringify(options)}`);
        }
        const cmd = (0, child_process_1.spawn)(command, args.filter((a) => a.length > 0), options);
        cmd.stdout.on('data', (data) => {
            subscriber.next(data);
        });
        cmd.stderr.on('data', (data) => {
            console.log(`msg on stderr for command ${command}`, data.toString());
        });
        cmd.on('error', (error) => {
            subscriber.error(error);
        });
        cmd.on('close', (code) => {
            subscriber.complete();
            console.log(`====>>>> Command ${command} with args ${args} executed - exit code ${code}`);
            if (executedCommands) {
                executedCommands.push(`${command} ${args.join(' ')}`);
            }
        });
    });
}
// executes a command in a separate process and returns an Observable which is the stream of lines output of the command execution
function executeCommandNewProcessToLinesObs(action, command, args, options, executedCommands) {
    return executeCommandNewProcessObs(action, command, args, options, executedCommands).pipe(bufferToLines());
}
// custom operator that converts a buffer to lines, i.e. splits on \n to emit each line
function bufferToLines() {
    return (source) => {
        return new rxjs_1.Observable((subscriber) => {
            let remainder = '';
            const subscription = source.subscribe({
                next: (buffer) => {
                    const bufferWithRemainder = `${remainder}${buffer}`;
                    const lines = bufferWithRemainder.toString().split('\n');
                    remainder = lines.splice(lines.length - 1)[0];
                    lines.forEach((l) => subscriber.next(l));
                },
                error: (err) => subscriber.error(err),
                complete: () => {
                    subscriber.next(remainder);
                    subscriber.complete();
                },
            });
            return () => {
                subscription.unsubscribe();
            };
        });
    };
}
function executeCommandInShellNewProcessObs(action, command, options, executedCommands) {
    const _options = Object.assign(Object.assign({}, options), { shell: true });
    return executeCommandNewProcessObs(action, command, [], _options, executedCommands);
}
function getCommandOutput(linesFromStdOutAndStdErr, errorMessage, cmd) {
    // the execution of the command is expected to write to stdout when all is good
    // and both to stdout and stderr when there is an error
    let output = '';
    let outputLines = 0;
    linesFromStdOutAndStdErr.forEach((line) => {
        if (line.startsWith('from stderr: ')) {
            console.error(`${errorMessage}\nError: ${line}`);
            console.error(`Command erroring:`);
            console.error(`${cmd}`);
        }
        if (line.startsWith('from stdout: ')) {
            output = line.substring('from stdout: '.length);
            outputLines++;
        }
        if (outputLines > 1) {
            throw new Error(`We expect only one line to start with "from stdout: "
Instead we received:
${linesFromStdOutAndStdErr}`);
        }
    });
    // not having received anything on stdout is an unexpected situation
    if (!output) {
        throw new Error('We expect one line to start with "from stdout: "');
    }
    return output;
}
//# sourceMappingURL=execute-command.js.map