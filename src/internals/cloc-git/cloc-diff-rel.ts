import path from "path"

import { filter, skip, startWith, map, concatMap } from "rxjs"

import { fromCsvObs } from "@enrico.piccinin/csv-tools"

import { executeCommandNewProcessToLinesObs } from "../execute-command/execute-command"
import { addRemote$ } from "../git/git-remote"
import { ComparisonEnd, comparisonEndString } from "../git/git-diffs"

export type ClocGitDiffRec = {
    File: string
    blank_same: string
    blank_modified: string
    blank_added: string
    blank_removed: string
    comment_same: string
    comment_modified: string
    comment_added: string
    comment_removed: string
    code_same: string
    code_modified: string
    code_added: string
    code_removed: string,
    projectDir: string,
    fullFilePath: string
    extension: string
}

export type ComparisonParams = {
    projectDir: string
    url_to_repo: string,
    from_tag_branch_commit: ComparisonEnd,
    to_tag_branch_commit: ComparisonEnd,
    use_ssh?: boolean
}
export function comparisonResultFromClocDiffRelForProject$(
    comparisonParams: ComparisonParams, executedCommands: string[], languages?: string[]
) {
    const projectDir = comparisonParams.projectDir
    const header = 'File,blank_same,blank_modified,blank_added,blank_removed,comment_same,comment_modified,comment_added,comment_removed,code_same,code_modified,code_added,code_removed'
    return clocDiffRel$(
        projectDir,
        comparisonParams.from_tag_branch_commit,
        comparisonParams.to_tag_branch_commit,
        !!comparisonParams.use_ssh, // the double negarion converts to boolean in case it is undefined
        languages,
        executedCommands
    ).pipe(
        filter(line => line.trim().length > 0),
        // skip the first line which is the header line
        // File, == blank, != blank, + blank, - blank, == comment, != comment, + comment, - comment, == code, != code, + code, - code, "github.com/AlDanial/cloc v 2.00 T=0.0747981071472168 s"
        skip(1),
        // start with the header line that we want to have
        startWith(header),
        map(line => {
            // remove trailing comma without using regular expressions
            const _line = line.trim()
            if (_line.endsWith(',')) {
                return _line.slice(0, -1)
            }
            return _line
        }),
        fromCsvObs<ClocGitDiffRec>(','),
        map(rec => {
            const fullFilePath = path.join(projectDir, rec.File)
            const extension = path.extname(fullFilePath)
            const recWithPojectDir = { ...rec, projectDir, fullFilePath, extension }
            return recWithPojectDir
        })
    )
}

//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes

// this stream is not safe in concurrent execution and therefore shouls NOT be called by operators that work concurrently
// e.g. mergeMap
function clocDiffRel$(
    projectDir: string,    
    from_tag_branch_commit: ComparisonEnd,
    to_tag_branch_commit: ComparisonEnd,
    use_ssh: boolean,
    languages?: string[],
    executedCommands: string[] = []
) {
    return addRemote$(
        projectDir,
        {...from_tag_branch_commit, use_ssh},
        executedCommands
    ).pipe(
        concatMap(() => addRemote$(
            projectDir,
            {...to_tag_branch_commit, use_ssh},
            executedCommands
        )),
        concatMap(() => {
            const _to_tag_branch_commit = comparisonEndString(to_tag_branch_commit)
            const _from_tag_branch_commit = comparisonEndString(from_tag_branch_commit)
            const command = `cloc`
            const args = [
                '--git-diff-rel',
                '--csv',
                '--by-file',
                `${_to_tag_branch_commit}`,
                `${_from_tag_branch_commit}`
            ]

            if (languages && languages?.length > 0) {
                // It is important to trim the languages because otherwise the command may not work properly
                // cloc --include-lang=Python,JavaScript,TypeScript
                // is correct while
                // cloc --include-lang=Python, JavaScript, TypeScript
                // is incorrect and will work only for Python
                languages = languages.map(lang => lang.trim())
                const languagesString = languages.join(',');
                args.push(`--include-lang=${languagesString}`);
            }
            const options = {
                cwd: projectDir
            }
            return executeCommandNewProcessToLinesObs(
                'run cloc --git-diff-rel --csv --by-file', command, args, options, executedCommands
            )
        })
    )
}