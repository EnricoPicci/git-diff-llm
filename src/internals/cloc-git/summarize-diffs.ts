import { catchError, of } from "rxjs";
import { FileDiffWithExplanation } from "./cloc-git-diff-rel-between-tag-branch-commit";
import { getFullCompletion$ } from "../openai/openai";
import { fillPromptTemplateSummarizeDiffs, getDefaultPromptTemplates, SummarizeDiffsPromptTemplateData } from "../prompt-templates/prompt-templates";

export function summarizeDiffs$(
    compareResults: FileDiffWithExplanation[],
    languages: string[] | undefined,
    project: string,
    llmModel: string,
    promptForSummaryTemplate:  string,
    executedCommands: string[]
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
    const templateData: SummarizeDiffsPromptTemplateData = {
        languages: languageSpecilization,
        diffs: diffs.join('\n')
    }

    const _promptForSummaryTemplate = promptForSummaryTemplate || getDefaultPromptTemplates().summary.prompt
    const promptForSummary = fillPromptTemplateSummarizeDiffs(_promptForSummaryTemplate, templateData)

    console.log(`Calling LLM to summarize all diffs for the project ${project}`)
    return getFullCompletion$(promptForSummary, llmModel).pipe(
        catchError(err => {
            const errMsg = `===>>> Error calling LLM to summarize all diffs for the project ${project} - ${err.message}`
            console.log(errMsg)
            executedCommands.push(errMsg)
            return of('error in calling LLM to explain diffs')
        }),
    )
}
