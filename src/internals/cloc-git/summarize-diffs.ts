import { catchError, map, of } from "rxjs";
import { FileDiffWithExplanation } from "./cloc-git-diff-rel-between-tag-branch-commit";
import {  getFullCompletion$ } from "../openai/openai";
import { fillPromptTemplateSummarizeDiffs, getDefaultPromptTemplates, SummarizeDiffsPromptTemplateData } from "../prompt-templates/prompt-templates";
import { DefaultMessageWriter, MessageWriter, newInfoMessage } from "../message-writer/message-writer";
import { hasCodeAddedRemovedModified } from "./cloc-diff-rel";

export function summarizeDiffs$(
    compareResults: FileDiffWithExplanation[],
    languages: string[] | undefined,
    project: string,
    llmModel: string,
    promptForSummaryTemplate:  string,
    executedCommands: string[],
    messageWriter: MessageWriter = DefaultMessageWriter
) {
    const diffs: string[] = []
    compareResults.forEach(compareResult => {
        if (hasCodeAddedRemovedModified(compareResult) && isForSummary(compareResult)) {
            const changeType = compareResult.added ? 'added' : compareResult.deleted ? 'removed' : compareResult.renamed ? 'renamed' : 'changed'
            diffs.push(`File path: ${compareResult.File} - type of diff: ${changeType}`)
            diffs.push(compareResult.explanation)
            diffs.push('')
            diffs.push('---------------------------------------------------------------------------------------------')
            diffs.push('')
        }
    })
    const msgDiffsWithExplanation = newInfoMessage(diffs)
    msgDiffsWithExplanation.id = 'diffs-with-explanation'
    messageWriter.write(msgDiffsWithExplanation)

    let languageSpecilization = ''
    if (languages) {
        languageSpecilization = languages.join(', ')
    }
    const templateData: SummarizeDiffsPromptTemplateData = {
        languages: languageSpecilization,
        diffs: diffs.join('\n')
    }

    const _promptForSummaryTemplate = promptForSummaryTemplate || getDefaultPromptTemplates().summary.prompt
    const promptForSummary = fillPromptTemplateSummarizeDiffs(_promptForSummaryTemplate, templateData)

    const msgText = `Calling LLM to summarize all diffs for the project ${project}`
    const msg = newInfoMessage(msgText)
    messageWriter.write(msg)
    return getFullCompletion$(promptForSummary, llmModel).pipe(
        map(resp => {
            return resp.explanation
        }),
        catchError(err => {
            const errMsg = `===>>> Error calling LLM to summarize all diffs for the project ${project} - ${err.message}`
            console.log(errMsg)
            executedCommands.push(errMsg)
            // const resp: FullCompletionReponse = { explanation: `error in calling LLM to summarize all diffs for the project ${project}.\n${err.message}`, prompt: promptForSummary }
            return of(`error in calling LLM to summarize all diffs for the project ${project}.\n${err.message}`)
        }),
    )
}

// need to see if there is a way to make this function more generic
function isForSummary(explanationInput: FileDiffWithExplanation) {
    return explanationInput.explanation.toLowerCase().includes('changed to improve readability')
}