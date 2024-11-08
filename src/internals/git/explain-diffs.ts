import { of, catchError, map } from "rxjs"
import { FullCompletionReponse, getFullCompletion$ } from "../openai/openai"
import { ExplainDiffPromptTemplateData, fillPromptTemplateExplainDiff, getDefaultPromptTemplates, languageFromExtension, PromptTemplates } from "../prompt-templates/prompt-templates"
import { MessageWriter, newInfoMessage } from "../message-writer/message-writer"


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
    messageWriter: MessageWriter
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
    return getFullCompletion$(prompt, llmModel).pipe(
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
}