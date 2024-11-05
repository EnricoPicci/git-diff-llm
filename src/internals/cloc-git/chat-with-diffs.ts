import { catchError, of } from "rxjs";
import { FileDiffWithExplanation } from "./cloc-git-diff-rel-between-tag-branch-commit";
import { getFullCompletion$ } from "../openai/openai";
import { fillPromptTemplateSummarizeDiffs, SummarizeDiffsPromptTemplateData as DiffsPromptTemplateData } from "../prompt-templates/prompt-templates";
import { DefaultMessageWriter, MessageWriter, newInfoMessage } from "../message-writer/message-writer";

export function chatWithDiffs$(
    compareResults: FileDiffWithExplanation[],
    languages: string[] | undefined,
    project: string,
    llmModel: string,
    promptTemplate:  string,
    executedCommands: string[],
    messageWriter: MessageWriter = DefaultMessageWriter
) {
    const diffs: string[] = []
    compareResults.forEach(compareResult => {
        const changeType = compareResult.added ? 'added' : compareResult.deleted ? 'removed' : compareResult.renamed ? 'renamed' : 'changed'
        diffs.push(`File path: ${compareResult.File} - type of diff: ${changeType}`)
        diffs.push(compareResult.explanation)
        diffs.push('')
        diffs.push('---------------------------------------------------------------------------------------------')
        diffs.push('')
    })

    let languageSpecilization = ''
    if (languages) {
        languageSpecilization = languages.join(', ')
    }
    const templateData: DiffsPromptTemplateData = {
        languages: languageSpecilization,
        diffs: diffs.join('\n')
    }

    const _promptTemplate = promptTemplate
    const promptForChat = fillPromptTemplateSummarizeDiffs(_promptTemplate, templateData)

    const msgText = `Chat with LLM with all diffs for the project ${project}`
    const msg = newInfoMessage(msgText)
    messageWriter.write(msg)
    return getFullCompletion$(promptForChat, llmModel).pipe(
        catchError(err => {
            const errMsg = `===>>> Error chatting with LLM with all diffs for the project ${project} - ${err.message}`
            console.log(errMsg)
            executedCommands.push(errMsg)
            return of('error in chatting with LLM about diffs')
        }),
    )
}
