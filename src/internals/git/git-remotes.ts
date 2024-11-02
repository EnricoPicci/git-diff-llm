import { map } from "rxjs";
import { executeCommandObs$ } from "../execute-command/execute-command";

export function getRemotes$(gitRepoPath: string) {
    const command = `cd ${gitRepoPath} && git remote -v`
    return executeCommandObs$('read remotes', command).pipe(
        map((out) => {
            return out.split('\n').filter((line) => line.trim().length > 0);
        }),
    );
}