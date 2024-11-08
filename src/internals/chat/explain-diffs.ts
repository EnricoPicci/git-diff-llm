import { of, catchError, map, concatMap } from "rxjs"
import { FullCompletionReponse, getFullCompletion$ } from "../openai/openai"
import { ExplainDiffPromptTemplateData, fillPromptTemplateExplainDiff, getDefaultPromptTemplates, languageFromExtension, PromptTemplates } from "../prompt-templates/prompt-templates"
import { MessageWriter, newInfoMessage } from "../message-writer/message-writer"
import { appendFileObs, writeFileObs } from "observable-fs"
import path from "path"


export type FileInfo = {
    extension: string
    deleted: boolean | null
    added: boolean | null
    copied: boolean | null
    renamed: boolean | null
    File: string
    fullFilePath: string
}
export type ExplanationInput = FileInfo & {
    fileContent: string
    diffLines: string
}

export type ExplanationRec = FileInfo & {
    explanation: string
}
// The type returned by explanationsFromComparisonResult$ is this
// Omit<T & FileInfo & {
//     explanation: string | null;
//     fileContent: string;
//     diffLines: string;
// }, "fileContent" | "diffLines">
// 
// which means that it returns an object that is T & FileInfo & {explanation: string | null}
// since it omits the properties 'fileContent' and 'diffLines'
export function explainGitDiffs$<T>(
    explanationInput: T & ExplanationInput, 
    promptTemplates: PromptTemplates, 
    llmModel: string, 
    executedCommands: string[],
    messageWriter: MessageWriter,
    outDir?: string
) {
    const _promptTemplates = promptTemplates || getDefaultPromptTemplates()
    const language = languageFromExtension(explanationInput.extension)

    let promptTemplate = ''
    if (explanationInput.deleted) {
        promptTemplate = _promptTemplates.removedFile.prompt
    } else if (explanationInput.added) {
        promptTemplate = _promptTemplates.addedFile.prompt
    } else {
        promptTemplate = _promptTemplates.changedFile.prompt
    }
    if (promptTemplate === '') {
        let fileStatus = ''
        if (explanationInput.copied) {
            fileStatus = 'copied'
        } else if (explanationInput.renamed) {
            fileStatus = 'renamed'
        }
        const rec = {
            ...explanationInput,
            explanation: `explanations are only for changed, added or removed files - this file is ${fileStatus}`
        }
        return of(rec)
    }
    const promptData: ExplainDiffPromptTemplateData = {
        language,
        fileName: explanationInput.File,
        fileContent: explanationInput.fileContent,
        diffs: explanationInput.diffLines,
    }
    const prompt = fillPromptTemplateExplainDiff(promptTemplate, promptData)
    const msgText = `Calling LLM to explain diffs for file ${explanationInput.fullFilePath} with prompt:\n`
    const msg = newInfoMessage(msgText)
    messageWriter.write(msg)
    const start$ = outDir ? appendFileObs(path.join(outDir, 'llm-explain-log.txt'), `Full prompt: ${prompt}\n`).pipe(
        catchError(() => {
            return writeFileObs(path.join(outDir, 'llm-explain-log.txt'), [`Full prompt: ${prompt}\n`])
        })
    ) : 
    of('')
    return start$.pipe(
        concatMap(() => {
            return getFullCompletion$(prompt, llmModel)
        }),
        catchError(err => {
            const errMsg = `===>>> Error calling LLM to explain diffs for file ${explanationInput.fullFilePath} - ${err.message}`
            console.log(errMsg)
            executedCommands.push(errMsg)
            const resp: FullCompletionReponse = { explanation: `error in calling LLM to explain diffs for file ${explanationInput.fullFilePath}.\n${err.message}`, prompt }
            return of(resp)
        }),
        map(explanation => {
            const command = `call openai to explain diffs for file ${explanationInput.fullFilePath}`
            executedCommands.push(command)
            return { ...explanationInput, explanation: explanation.explanation }
        }),
        concatMap(rec => {
            const separator = '=====================================================\n' 
            return outDir ? 
                appendFileObs(path.join(outDir, 'llm-explain-log.txt'), `Response: ${rec.explanation}\n\n\n${separator}`).pipe(
                    map(() => rec)
                ) : 
                of(rec)
        }),
        map(rec => {
            // remove the file content and the diffLines to avoid writing it to the json file
            // this is shown in the type assigned to _rec, which is
            // Omit<T & FileInfo & {
            //     explanation: string | null;
            //     fileContent: string;
            //     diffLines: string;
            // }, "fileContent" | "diffLines">
            // 
            // which means that it returns a new object that is the same as T & FileInfo & {explanation: string | null}
            // since it omits the properties 'fileContent' and 'diffLines'
            const { fileContent, diffLines, ..._rec } = rec
            return _rec
        })
    )
    // return appendFileObs(path.join(outDir, 'llm-explain-log.txt'), `Full prompt: ${prompt}\n`).pipe(
    //     concatMap(() => {
    //         return getFullCompletion$(prompt, llmModel)
    //     }),
    //     catchError(err => {
    //         const errMsg = `===>>> Error calling LLM to explain diffs for file ${explanationInput.fullFilePath} - ${err.message}`
    //         console.log(errMsg)
    //         executedCommands.push(errMsg)
    //         const resp: FullCompletionReponse = { explanation: `error in calling LLM to explain diffs for file ${explanationInput.fullFilePath}.\n${err.message}`, prompt }
    //         return of(resp)
    //     }),
    //     map(explanation => {
    //         const command = `call openai to explain diffs for file ${explanationInput.fullFilePath}`
    //         executedCommands.push(command)
    //         return { ...explanationInput, explanation: explanation.explanation }
    //     }),
    //     map(rec => {
    //         // remove the file content and the diffLines to avoid writing it to the json file
    //         // this is shown in the type assigned to _rec, which is
    //         // Omit<T & FileInfo & {
    //         //     explanation: string | null;
    //         //     fileContent: string;
    //         //     diffLines: string;
    //         // }, "fileContent" | "diffLines">
    //         // 
    //         // which means that it returns a new object that is the same as T & FileInfo & {explanation: string | null}
    //         // since it omits the properties 'fileContent' and 'diffLines'
    //         const { fileContent, diffLines, ..._rec } = rec
    //         return _rec
    //     })
    // )
}