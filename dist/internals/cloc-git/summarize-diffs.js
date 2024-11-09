"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeDiffs$ = summarizeDiffs$;
const rxjs_1 = require("rxjs");
const openai_1 = require("../openai/openai");
const prompt_templates_1 = require("../prompt-templates/prompt-templates");
const message_writer_1 = require("../message-writer/message-writer");
const cloc_diff_rel_1 = require("./cloc-diff-rel");
function summarizeDiffs$(compareResults, languages, project, llmModel, promptForSummaryTemplate, executedCommands, messageWriter = message_writer_1.DefaultMessageWriter) {
    const diffs = [];
    compareResults.forEach(compareResult => {
        if ((0, cloc_diff_rel_1.hasCodeAddedRemovedModified)(compareResult)) {
            const changeType = compareResult.added ? 'added' : compareResult.deleted ? 'removed' : compareResult.renamed ? 'renamed' : 'changed';
            diffs.push(`File path: ${compareResult.File} - type of diff: ${changeType}`);
            diffs.push(compareResult.explanation);
            diffs.push('');
            diffs.push('---------------------------------------------------------------------------------------------');
            diffs.push('');
        }
    });
    const msgDiffsWithExplanation = (0, message_writer_1.newInfoMessage)(diffs);
    msgDiffsWithExplanation.id = 'diffs-with-explanation';
    messageWriter.write(msgDiffsWithExplanation);
    let languageSpecilization = '';
    if (languages) {
        languageSpecilization = languages.join(', ');
    }
    const templateData = {
        languages: languageSpecilization,
        diffs: diffs.join('\n')
    };
    const _promptForSummaryTemplate = promptForSummaryTemplate || (0, prompt_templates_1.getDefaultPromptTemplates)().summary.prompt;
    const promptForSummary = (0, prompt_templates_1.fillPromptTemplateSummarizeDiffs)(_promptForSummaryTemplate, templateData);
    const msgText = `Calling LLM to summarize all diffs for the project ${project}`;
    const msg = (0, message_writer_1.newInfoMessage)(msgText);
    messageWriter.write(msg);
    return (0, openai_1.getFullCompletion$)(promptForSummary, llmModel).pipe((0, rxjs_1.map)(resp => {
        return resp.explanation;
    }), (0, rxjs_1.catchError)(err => {
        const errMsg = `===>>> Error calling LLM to summarize all diffs for the project ${project} - ${err.message}`;
        console.log(errMsg);
        executedCommands.push(errMsg);
        // const resp: FullCompletionReponse = { explanation: `error in calling LLM to summarize all diffs for the project ${project}.\n${err.message}`, prompt: promptForSummary }
        return (0, rxjs_1.of)(`error in calling LLM to summarize all diffs for the project ${project}.\n${err.message}`);
    }));
}
//# sourceMappingURL=summarize-diffs.js.map