import path from "path"

import { filter, skip, startWith, map, concatMap, from } from "rxjs"

import { fromCsvObs } from "@enrico.piccinin/csv-tools"

import { executeCommandNewProcessToLinesObs } from "../execute-command/execute-command"
import { addRemotesAndCheckoutFromTagBranchCommit$, ComparisonEnd, comparisonEndString, GitRec, gitRecsFileDiffs$ } from "../git/git-diffs"

export type ClocGitDiffRec = GitRec & {
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
}

export function hasCodeAddedRemovedModified(rec: ClocGitDiffRec) {
    const resp = rec.code_added.trim() !== '0' || rec.code_removed.trim() !== '0' || rec.code_modified.trim() !== '0'
    return resp
}

export type ComparisonParams = {
    projectDir: string
    url_to_repo: string,
    from_tag_branch_commit: ComparisonEnd,
    to_tag_branch_commit: ComparisonEnd,
    use_ssh?: boolean
}

const clocGitDiffRecHeader = 'File,blank_same,blank_modified,blank_added,blank_removed,comment_same,comment_modified,comment_added,comment_removed,code_same,code_modified,code_added,code_removed'
export function comparisonResultFromClocDiffRelForProject$(
    comparisonParams: ComparisonParams, executedCommands: string[], languages?: string[]
) {
    const projectDir = comparisonParams.projectDir
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
        startWith(clocGitDiffRecHeader),
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
            const recWithPojectDir: ClocGitDiffRec = { ...rec, projectDir, fullFilePath, extension }
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
    return addRemotesAndCheckoutFromTagBranchCommit$(
        projectDir,
        from_tag_branch_commit,
        to_tag_branch_commit,
        use_ssh,
        executedCommands
    ).pipe(
        concatMap(() => {
            const _to_tag_branch_commit = comparisonEndString(to_tag_branch_commit)
            const _from_tag_branch_commit = comparisonEndString(from_tag_branch_commit)
            const command = `npx`
            const args = [
                'cloc',
                '--git-diff-rel',
                '--csv',
                '--by-file',
                `${_to_tag_branch_commit}`,
                `${_from_tag_branch_commit}`
            ]

            // It is important to trim the languages because otherwise the command may not work properly
            // cloc --include-lang=Python,JavaScript,TypeScript
            // is correct while
            // cloc --include-lang=Python, JavaScript, TypeScript
            // is incorrect and will work only for Python
            if (languages) {
                languages = languages.map(lang => lang.trim()).filter(lang => lang.length > 0)
            }
            if (languages && languages?.length > 0) {
                const languagesString = languages.join(',');
                args.push(`--include-lang=${languagesString}`);
            }
            const options = {
                cwd: projectDir
            }
            return executeCommandNewProcessToLinesObs(
                'run npx cloc --git-diff-rel --csv --by-file', command, args, options, executedCommands
            )
        })
    )
}

// comparisonResultFromGitDiffForProject$ is a function that returns a stream of ClocGitDiffRec objects
// using git diff rather than cloc git-diff-rel
// It fills with 0 the fields about number of lines changed that are not present in the git diff output
// It is used as a fallback when cloc does not work (e.g. because the PERL compiler, which is required by cloc, is not installed)
export function comparisonResultFromGitDiffForProject$(
    comparisonParams: ComparisonParams, executedCommands: string[], languages?: string[]
) {
    const projectDir = comparisonParams.projectDir
    return gitRecsFileDiffs$(
        projectDir,
        comparisonParams.from_tag_branch_commit,
        comparisonParams.to_tag_branch_commit,
        !!comparisonParams.use_ssh, // the double negarion converts to boolean in case it is undefined
        executedCommands
    ).pipe(
        concatMap(recs => {
            return from(recs)
        }),
        map(rec => {
            const fillUpVal = '-'
            const fillUp = {
                blank_same: fillUpVal,
                blank_modified: fillUpVal,
                blank_added: fillUpVal,
                blank_removed: fillUpVal,
                comment_same: fillUpVal,
                comment_modified: fillUpVal,
                comment_added: fillUpVal,
                comment_removed: fillUpVal,
                code_same: fillUpVal,
                code_modified: fillUpVal,
                code_added: fillUpVal,
                code_removed: fillUpVal,
            }
            const clocGitDiffRec: ClocGitDiffRec = { ...rec, ...fillUp }
            return clocGitDiffRec
        }),
        filter(rec => {
            if (languages?.length === 0) {
                return true
            }
            const langExtMapping: {[key: string]: string} = {
                '.py': 'Python',
                '.js': 'JavaScript',
                '.ts': 'TypeScript',
                '.html': 'HTML',
                '.css': 'CSS',
                '.md': 'Markdown',
                '.sh': 'Shell',
                '.java': 'Java',
                '.c': 'C',
                '.cpp': 'C++',
                '.cs': 'C#',
                '.php': 'PHP',
                '.rb': 'Ruby',
                '.go': 'Go',
                '.rs': 'Rust',
                '.swift': 'Swift',
                '.kt': 'Kotlin',
                '.scala': 'Scala',
                '.r': 'R',
                '.pl': 'Perl',
                '.lua': 'Lua',
                '.hs': 'Haskell',
                '.clj': 'Clojure',
                '.groovy': 'Groovy',
                '.ex': 'Elixir',
                '.erl': 'Erlang',
                '.dart': 'Dart',
                '.fs': 'F#',
                '.m': 'Objective-C',
                '.rkt': 'Racket',
                '.scm': 'Scheme',
                '.lisp': 'Common Lisp',
                '.ml': 'OCaml',
                '.vb': 'Visual Basic',
                '.pas': 'Pascal',
                '.ada': 'Ada',
                '.hx': 'Haxe',
                '.jl': 'Julia',
                '.ps1': 'PowerShell',
                '.sql': 'SQL',
                '.vhd': 'VHDL',
                '.v': 'Verilog',
                '.vi': 'LabVIEW',
                '.ahk': 'AutoHotkey',
                '.au3': 'AutoIt',
                '.bat': 'Batch',
                '.coffee': 'CoffeeScript',
                '.d': 'D',
                'Dockerfile': 'Dockerfile',
                '.e': 'Eiffel',
                '.elm': 'Elm',
                '.f': 'Fortran',
                '.feature': 'Gherkin',
                '.gsp': 'Gosu',
                '.hbs': 'Handlebars',
                '.hcl': 'HCL',
                '.idl': 'IDL',
                '.json': 'JSON',
            }
            if (!languages) {
                return true;
            }
            const fileExtension = path.extname(rec.File);
            return languages.some(lang => langExtMapping[fileExtension] === lang);
        })
    )
}