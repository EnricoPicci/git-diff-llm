import fs from "fs"
import path from "path"
import { of, catchError, map } from "rxjs"
import { getFullCompletion$ } from "../openai/openai"
import { ExplainDiffPromptTemplateData, fillPromptTemplateExplainDiff, languageFromExtension } from "../prompt-templates/prompt-templates"


export type PromptTemplates = {
    changedFile: { prompt: string, description: string },
    removedFile: { prompt: string, description: string },
    addedFile: { prompt: string, description: string },
}
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
    explanationInput: T & ExplanationInput, promptTemplates: PromptTemplates, llmModel: string, executedCommands: string[]
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
    console.log(`Calling LLM to explain diffs for file ${explanationInput.fullFilePath}`)
    return getFullCompletion$(prompt, llmModel).pipe(
        catchError(err => {
            const errMsg = `===>>> Error calling LLM to explain diffs for file ${explanationInput.fullFilePath} - ${err.message}`
            console.log(errMsg)
            executedCommands.push(errMsg)
            return of('error in calling LLM to explain diffs')
        }),
        map(explanation => {
            const command = `call openai to explain diffs for file ${explanationInput.fullFilePath}`
            executedCommands.push(command)
            return { ...explanationInput, explanation }
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

export function getDefaultPromptTemplates() {
    const promptTemplateFileChanged = "/prompts/explain-diff.txt";
    const promptTemplateFileAdded = "/prompts/explain-added.txt";
    const promptTemplateFileRemoved = "/prompts/explain-removed.txt";
    const currentDir = process.cwd();

    console.log(`currentDir: ${currentDir}`);
    const _promptTemplateFileChanged = path.join(currentDir, promptTemplateFileChanged);
    const promptChanged = fs.readFileSync(_promptTemplateFileChanged, 'utf-8');
    const _promptTemplateFileAdded = path.join(currentDir, promptTemplateFileAdded);
    const promptAdded = fs.readFileSync(_promptTemplateFileAdded, 'utf-8');
    const _promptTemplateFileRemoved = path.join(currentDir, promptTemplateFileRemoved);
    const promptRemoved = fs.readFileSync(_promptTemplateFileRemoved, 'utf-8');

    const promptTemplates: PromptTemplates = {
        changedFile: { prompt: promptChanged, description: 'Prompt to summarize the changes in a file' },
        addedFile: { prompt: promptAdded, description: 'Prompt to summarize a file that has been added' },
        removedFile: { prompt: promptRemoved, description: 'Prompt to summarize a file that has been removed' }
    }
    return promptTemplates
}