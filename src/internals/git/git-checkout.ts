import { last } from "rxjs"
import { executeCommandObs$ } from "../execute-command/execute-command"

export function gitCheckout$(
    projectDir: string,
    tagBranchCommit: string,
    executedCommands: string[]
) {
    const command = `cd ${projectDir} && git checkout ${tagBranchCommit}`
    return executeCommandObs$('read remotes', command, executedCommands).pipe(
        last(),
    )
}