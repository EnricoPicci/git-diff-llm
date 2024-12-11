import { catchError, last, of} from "rxjs"
import { executeCommandObs$ } from "../execute-command/execute-command"
import { convertHttpsToSshUrl } from "./convert-ssh-https-url"

export const DefaultNameOfGitRemote = 'default_name_of_git_remote'
export type AddRemoteParams = {
    url_to_repo?: string
    git_remote_name?: string,
    use_ssh?: boolean,
    user_id?: string,
    password?: string,
}
// cd to project directory and add a remote to the project if the remote url is provided
export function addRemote$(
    projectDir: string,
    params: AddRemoteParams,
    executedCommands: string[]
) {
    const baseRemoteName = params.git_remote_name ? params.git_remote_name : DefaultNameOfGitRemote
    const url_to_remote_repo = params.url_to_repo
    let commandIfRemoteExists = ''
    let remoteUrl = url_to_remote_repo
    if (url_to_remote_repo) {
        // convert to ssh url if required (e.g. to avoid password prompts)
        if (params.use_ssh) {
            remoteUrl = convertHttpsToSshUrl(url_to_remote_repo)
        } else if (params.user_id && params.password) {
            const urlParts = new URL(url_to_remote_repo)
            urlParts.username = params.user_id
            urlParts.password = params.password
            remoteUrl = urlParts.toString()
        }
        // the command must add git fetch the remote after the remote has been added
        commandIfRemoteExists = ` && git remote add ${baseRemoteName} ${remoteUrl} && git fetch ${baseRemoteName} --tags`
    }
    const command = `cd ${projectDir} && git fetch --all --tags ${commandIfRemoteExists}`

    return executeCommandObs$('cd to project directory and add remote', command, executedCommands).pipe(
        // this command can emit both on stderr and stdout
        // the notification on stderr is not an error, so we can ignore it
        // we can also ignore the notification on stdout
        // we place last here so that we make sure we emit only once and that the notification itself means the completion of the command
        last(),
        catchError((err) => {
            // if the remote base already exists, we can ignore the error
            if (err.message.includes(`remote ${baseRemoteName} already exists`)) {
                // remove the remote if it already exists and add it again with the new url
                const command = `cd ${projectDir} && git remote remove ${baseRemoteName} && git remote add ${baseRemoteName} ${remoteUrl} && git fetch ${baseRemoteName} --tags`
                return executeCommandObs$('remove remote and add it again with new url', command, executedCommands).pipe(
                    last()
                )
            }
            console.error(`Error adding remote: ${err}`)
            return of(err)
        }),
    )
}

export function listRemotes$(gitRepoPath: string, executedCommands: string[]) {
    const command = `cd ${gitRepoPath} && git remote -v`
    return executeCommandObs$('read remotes', command, executedCommands).pipe(
        last(),
    )
}

export function removeRemote$(gitRepoPath: string, remoteName: string, executedCommands: string[]) {
    const command = `cd ${gitRepoPath} && git remote remove ${remoteName}`
    return executeCommandObs$('remove remote', command, executedCommands)
}