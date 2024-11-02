"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPromptTemplateFromFile = readPromptTemplateFromFile;
exports.fillPromptTemplateExplainDiffFromFile = fillPromptTemplateExplainDiffFromFile;
exports.fillPromptTemplateExplainDiff = fillPromptTemplateExplainDiff;
exports.fillPromptTemplateSummarizeDiffsFromFile = fillPromptTemplateSummarizeDiffsFromFile;
exports.fillPromptTemplateSummarizeDiffs = fillPromptTemplateSummarizeDiffs;
exports.languageFromExtension = languageFromExtension;
exports.fillPromptTemplate = fillPromptTemplate;
exports.fillPromptTemplateFromFile = fillPromptTemplateFromFile;
const fs_1 = __importDefault(require("fs"));
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