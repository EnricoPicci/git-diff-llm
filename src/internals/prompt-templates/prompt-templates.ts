import fs from 'fs';
import path from 'path';

export type PromptTemplates = {
    changedFile: { prompt: string; description: string} 
    removedFile: { prompt: string; description: string} 
    addedFile: { prompt: string; description: string} 
    summary: { prompt: string; description: string}
}

export function getDefaultPromptTemplates() {
    const promptTemplateFileChanged = "explain-diff.txt";
    const promptTemplateFileAdded = "explain-added.txt";
    const promptTemplateFileRemoved = "explain-removed.txt";
    const promptTemplateFileSummarize = "summarize-diffs.txt";
    // create the path to the prompts directory this way so that it can work also when the code is packaged
    // and used, for instance, with npx
    const promptsDir = path.join(__dirname, "..", "..", "..", "prompts");

    console.log(`promptsDir: ${promptsDir}`);
    const _promptTemplateFileChanged = path.join(promptsDir, promptTemplateFileChanged);
    const promptChanged = fs.readFileSync(_promptTemplateFileChanged, 'utf-8');
    const _promptTemplateFileAdded = path.join(promptsDir, promptTemplateFileAdded);
    const promptAdded = fs.readFileSync(_promptTemplateFileAdded, 'utf-8');
    const _promptTemplateFileRemoved = path.join(promptsDir, promptTemplateFileRemoved);
    const promptRemoved = fs.readFileSync(_promptTemplateFileRemoved, 'utf-8');
    const _promptTemplateSummarize = path.join(promptsDir, promptTemplateFileSummarize);
    const promptSummarize = fs.readFileSync(_promptTemplateSummarize, 'utf-8');

    const promptTemplates: PromptTemplates = {
        changedFile: { prompt: promptChanged, description: 'Prompt to summarize the changes in a file' },
        addedFile: { prompt: promptAdded, description: 'Prompt to summarize a file that has been added' },
        removedFile: { prompt: promptRemoved, description: 'Prompt to summarize a file that has been removed' },
        summary: { prompt: promptSummarize, description: 'Prompt to summarize all the changes in a project' }
    }
    return promptTemplates
}

export function readPromptTemplateFromFile(templateFile: string) {
    return fs.readFileSync(templateFile, 'utf-8');
}

export type ExplainDiffPromptTemplateData = {
    language: string;
    fileName: string;
    fileContent: string;
    diffs: string;
};
export function fillPromptTemplateExplainDiffFromFile(templateFile: string, templateData: ExplainDiffPromptTemplateData) {
    const template = fs.readFileSync(templateFile, 'utf-8');
    return fillPromptTemplateExplainDiff(template, templateData);
}
export function fillPromptTemplateExplainDiff(template: string, templateData: ExplainDiffPromptTemplateData) {
    return fillPromptTemplate(template, templateData);
}

export type SummarizeDiffsPromptTemplateData = {
    languages: string;
    diffs: string;
};
export function fillPromptTemplateSummarizeDiffsFromFile(templateFile: string, templateData: SummarizeDiffsPromptTemplateData) {
    const template = fs.readFileSync(templateFile, 'utf-8');
    return fillPromptTemplateSummarizeDiffs(template, templateData);
}
export function fillPromptTemplateSummarizeDiffs(template: string, templateData: SummarizeDiffsPromptTemplateData) {
    return fillPromptTemplate(template, templateData);
}

// functions used to get pieces of data to be used to fill in the prompt templates
export function languageFromExtension(extension: string) {
    let language = ''
    // if the extension is .java, we can assume that the language is java
    // if the extension is .ts, we can assume that the language is TypeScript
    // Use a switch statement to handle other languages
    switch (extension) {
        case '.java':
            language = 'java'
            break
        case '.ts':
            language = 'TypeScript'
            break
        default:
            language = ''
    }
    return language;
}


//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes

export function fillPromptTemplate(template: string, templateData: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, p1) => templateData[p1] || match);
}

export function fillPromptTemplateFromFile(templateFile: string, templateData: any): string {
    const template = fs.readFileSync(templateFile, 'utf-8');
    return fillPromptTemplate(template, templateData);
}
