"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultPromptTemplates = getDefaultPromptTemplates;
exports.readPromptTemplateFromFile = readPromptTemplateFromFile;
exports.fillPromptTemplateExplainDiffFromFile = fillPromptTemplateExplainDiffFromFile;
exports.fillPromptTemplateExplainDiff = fillPromptTemplateExplainDiff;
exports.fillPromptTemplateSummarizeDiffsFromFile = fillPromptTemplateSummarizeDiffsFromFile;
exports.fillPromptTemplateSummarizeDiffs = fillPromptTemplateSummarizeDiffs;
exports.languageFromExtension = languageFromExtension;
exports.fillPromptTemplate = fillPromptTemplate;
exports.fillPromptTemplateFromFile = fillPromptTemplateFromFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function getDefaultPromptTemplates() {
    const promptTemplateFileChanged = "/prompts/explain-diff.txt";
    const promptTemplateFileAdded = "/prompts/explain-added.txt";
    const promptTemplateFileRemoved = "/prompts/explain-removed.txt";
    const promptTemplateFileSummarize = "/prompts/summarize-diffs.txt";
    const currentDir = process.cwd();
    console.log(`currentDir: ${currentDir}`);
    const _promptTemplateFileChanged = path_1.default.join(currentDir, promptTemplateFileChanged);
    const promptChanged = fs_1.default.readFileSync(_promptTemplateFileChanged, 'utf-8');
    const _promptTemplateFileAdded = path_1.default.join(currentDir, promptTemplateFileAdded);
    const promptAdded = fs_1.default.readFileSync(_promptTemplateFileAdded, 'utf-8');
    const _promptTemplateFileRemoved = path_1.default.join(currentDir, promptTemplateFileRemoved);
    const promptRemoved = fs_1.default.readFileSync(_promptTemplateFileRemoved, 'utf-8');
    const _promptTemplateSummarize = path_1.default.join(currentDir, promptTemplateFileSummarize);
    const promptSummarize = fs_1.default.readFileSync(_promptTemplateSummarize, 'utf-8');
    const promptTemplates = {
        changedFile: { prompt: promptChanged, description: 'Prompt to summarize the changes in a file' },
        addedFile: { prompt: promptAdded, description: 'Prompt to summarize a file that has been added' },
        removedFile: { prompt: promptRemoved, description: 'Prompt to summarize a file that has been removed' },
        summary: { prompt: promptSummarize, description: 'Prompt to summarize all the changes in a project' }
    };
    return promptTemplates;
}
function readPromptTemplateFromFile(templateFile) {
    return fs_1.default.readFileSync(templateFile, 'utf-8');
}
function fillPromptTemplateExplainDiffFromFile(templateFile, templateData) {
    const template = fs_1.default.readFileSync(templateFile, 'utf-8');
    return fillPromptTemplateExplainDiff(template, templateData);
}
function fillPromptTemplateExplainDiff(template, templateData) {
    return fillPromptTemplate(template, templateData);
}
function fillPromptTemplateSummarizeDiffsFromFile(templateFile, templateData) {
    const template = fs_1.default.readFileSync(templateFile, 'utf-8');
    return fillPromptTemplateSummarizeDiffs(template, templateData);
}
function fillPromptTemplateSummarizeDiffs(template, templateData) {
    return fillPromptTemplate(template, templateData);
}
// functions used to get pieces of data to be used to fill in the prompt templates
function languageFromExtension(extension) {
    let language = '';
    // if the extension is .java, we can assume that the language is java
    // if the extension is .ts, we can assume that the language is TypeScript
    // Use a switch statement to handle other languages
    switch (extension) {
        case '.java':
            language = 'java';
            break;
        case '.ts':
            language = 'TypeScript';
            break;
        default:
            language = '';
    }
    return language;
}
//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes
function fillPromptTemplate(template, templateData) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, p1) => templateData[p1] || match);
}
function fillPromptTemplateFromFile(templateFile, templateData) {
    const template = fs_1.default.readFileSync(templateFile, 'utf-8');
    return fillPromptTemplate(template, templateData);
}
//# sourceMappingURL=prompt-templates.js.map