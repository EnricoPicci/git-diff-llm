import { EMPTY, catchError, map, tap } from 'rxjs';

import { executeCommandObs$ } from '../execute-command/execute-command';
import { convertHttpsToSshUrl } from './convert-ssh-https-url';

// cloneRepo$ clones a repo from a given url to a given path and returns the path of the cloned repo
export function cloneRepo$(
    url: string, 
    repoPath: string, 
    use_ssh: boolean, 
    user_id?: string,
    password?: string,
    accessToken?: string
) {
    if (!url) throw new Error(`url is mandatory`);
    if (!repoPath) throw new Error(`Path is mandatory`);

    if (!use_ssh && accessToken) {
        const urlParts = new URL(url);
        urlParts.username = 'oauth2';
        urlParts.password = accessToken;
        url = urlParts.toString();
    } else if (!use_ssh && user_id && password) {
        const urlParts = new URL(url);
        urlParts.username = user_id;
        urlParts.password = password;
        url = urlParts.toString();

    } else if (use_ssh) {
        url = convertHttpsToSshUrl(url);
    }

    const command = `git clone ${url} ${repoPath.replaceAll(' ', '_')}`;

    return executeCommandObs$(`Clone ${url}`, command).pipe(
        tap(() => `${url} cloned`),
        map(() => repoPath),
        catchError((err) => {
            console.error(`!!!!!!!!!!!!!!! Error: while cloning repo "${url}" - error code: ${err.code}`)
            console.error(`!!!!!!!!!!!!!!! Command erroring: "${command}"`)
            return EMPTY
        })
    );
}
