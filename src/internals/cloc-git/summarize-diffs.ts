import { catchError, of } from "rxjs";
import { FileDiffWithExplanation } from "./cloc-git-diff-rel-between-tag-branch-commit";
import { getFullCompletion$ } from "../openai/openai";
import { fillPromptTemplateSummarizeDiffs, SummarizeDiffsPromptTemplateData } from "../prompt-templates/prompt-templates";

export function summarizeDiffs$(
    compareResults: FileDiffWithExplanation[],
    languages: string[] | undefined,
    project: string,
    llmModel: string,
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

    const promptForSummary = fillPromptTemplateSummarizeDiffs(promptForSummaryTemplate, templateData)

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


const promptForSummaryTemplate = `
You are an expert developer with 10 years of experience. You are expert in many programming languages {{languages}}.
You have to examine the changes that occurred to a Project from one version to the next and write a short summary of these changes.
Do not add any judgement or opinion.
Do not repeat the same information. Do not repeat a list of changes for each file.
Provide a summary of the changes in the project.

This is the list of the files which have been changed, a note on whether the file has been changed, removed, added or renamed, and a short summary of the changes in each file:

{{diffs}}

`