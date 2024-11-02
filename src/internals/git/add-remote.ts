import { catchError, last, of} from "rxjs"
import { executeCommandObs$ } from "../execute-command/execute-command"
import { convertHttpsToSshUrl } from "./convert-ssh-https-url"

export type AddRemoteParams = {
    url_to_remote_repo?: string
    remote?: string
    use_ssh?: boolean
}
// cd to project directory and add a remote to the project if the remote url is provided
export function cdToProjectDirAndAddRemote$(
    projectDir: string,
    params: AddRemoteParams,
    executedCommands: string[]
) {
    const baseRemoteName = params.remote ? params.remote : 'base'
    const url_to_remote_repo = params.url_to_remote_repo
    let commandIfRemoteExists = ''
    if (url_to_remote_repo) {
        // convert to ssh url if required (e.g. to avoid password prompts)
        let remoteUrl = url_to_remote_repo
        if (params.use_ssh) {
            remoteUrl = convertHttpsToSshUrl(url_to_remote_repo)
        }
        // the command must add git fetch the remote after the remote has been added
        commandIfRemoteExists = ` && git remote add ${baseRemoteName} ${remoteUrl} && git fetch ${baseRemoteName} --tags`
    }
    const command = `cd ${projectDir} && git fetch --all --tags ${commandIfRemoteExists}`

    return executeCommandObs$('cd to project directory and add base remote', command, executedCommands).pipe(
        // this command can emit both on stderr and stdout
        // the notification on stderr is not an error, so we can ignore it
        // we can also ignore the notification on stdout
        // we place last here so that we make sure we emit only once and that the notification itself means the completion of the command
        last(),
        catchError((err) => {
            // if the remote base already exists, we can ignore the error
            if (err.message.includes(`remote ${baseRemoteName} already exists`)) {
                return of(null)
            }
            throw (err)
        }),
    )
}