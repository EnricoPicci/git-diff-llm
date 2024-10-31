"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeDiffs$ = summarizeDiffs$;
const rxjs_1 = require("rxjs");
const openai_1 = require("../openai/openai");
const prompt_templates_1 = require("../openai/prompt-templates");
function summarizeDiffs$(compareResults, languages, project, executedCommands) {
    const diffs = [];
    compareResults.forEach(compareResult => {
        const changeType = compareResult.added ? 'added' : compareResult.deleted ? 'removed' : compareResult.renamed ? 'renamed' : 'changed';
        diffs.push(`File path: ${compareResult.File} - type of diff: ${changeType}`);
        diffs.push(compareResult.explanation);
        diffs.push('');
        diffs.push('---------------------------------------------------------------------------------------------');
        diffs.push('');
    });
    let languageSpeciliation = '';
    if (languages) {
        languageSpeciliation = languages.join(', ');
    }
    const templateData = {
        languages: languageSpeciliation,
        diffs: diffs.join('\n')
    };
    const promptForSummary = (0, prompt_templates_1.fillPromptTemplateSummarizeDiffs)(promptForSummaryTemplate, templateData);
    console.log(`Calling LLM to summarize all diffs for the project ${project}`);
    return (0, openai_1.getFullCompletion$)(promptForSummary).pipe((0, rxjs_1.catchError)(err => {
        const errMsg = `===>>> Error calling LLM to summarize all diffs for the project ${project} - ${err.message}`;
        console.log(errMsg);
        executedCommands.push(errMsg);
        return (0, rxjs_1.of)('error in calling LLM to explain diffs');
    }));
}
const promptForSummaryTemplate = `
You are an expert developer with 10 years of experience. You are expert in many programming languages {{languages}}.
You have to examine the changes that occurred the to a Project from one version to the next and write a short summary of these changes.

This is the list of the files which have been changed, a note on whether the file has been changed, removed, added or renamed, and a short summary of the changes in each file:

{{diffs}}

`;
//# sourceMappingURL=summarize-diffs.js.map