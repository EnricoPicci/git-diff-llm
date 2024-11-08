"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.explainGitDiffs$ = explainGitDiffs$;
const rxjs_1 = require("rxjs");
const openai_1 = require("../openai/openai");
const prompt_templates_1 = require("../prompt-templates/prompt-templates");
const message_writer_1 = require("../message-writer/message-writer");
// The type returned by explanationsFromComparisonResult$ is this
// Omit<T & FileInfo & {
//     explanation: string | null;
//     fileContent: string;
//     diffLines: string;
// }, "fileContent" | "diffLines">
// 
// which means that it returns an object that is T & FileInfo & {explanation: string | null}
// since it omits the properties 'fileContent' and 'diffLines'
function explainGitDiffs$(explanationInput, promptTemplates, llmModel, executedCommands, messageWriter) {
    const _promptTemplates = promptTemplates || (0, prompt_templates_1.getDefaultPromptTemplates)();
    const language = (0, prompt_templates_1.languageFromExtension)(explanationInput.extension);
    let promptTemplate = '';
    if (explanationInput.deleted) {
        promptTemplate = _promptTemplates.removedFile.prompt;
    }
    else if (explanationInput.added) {
        promptTemplate = _promptTemplates.addedFile.prompt;
    }
    else {
        promptTemplate = _promptTemplates.changedFile.prompt;
    }
    if (promptTemplate === '') {
        let fileStatus = '';
        if (explanationInput.copied) {
            fileStatus = 'copied';
        }
        else if (explanationInput.renamed) {
            fileStatus = 'renamed';
        }
        const rec = Object.assign(Object.assign({}, explanationInput), { explanation: `explanations are only for changed, added or removed files - this file is ${fileStatus}` });
        return (0, rxjs_1.of)(rec);
    }
    const promptData = {
        language,
        fileName: explanationInput.File,
        fileContent: explanationInput.fileContent,
        diffs: explanationInput.diffLines,
    };
    const prompt = (0, prompt_templates_1.fillPromptTemplateExplainDiff)(promptTemplate, promptData);
    const msgText = `Calling LLM to explain diffs for file ${explanationInput.fullFilePath} with prompt:\n`;
    const msg = (0, message_writer_1.newInfoMessage)(msgText);
    messageWriter.write(msg);
    return (0, openai_1.getFullCompletion$)(prompt, llmModel).pipe((0, rxjs_1.catchError)(err => {
        const errMsg = `===>>> Error calling LLM to explain diffs for file ${explanationInput.fullFilePath} - ${err.message}`;
        console.log(errMsg);
        executedCommands.push(errMsg);
        const resp = { explanation: `error in calling LLM to explain diffs for file ${explanationInput.fullFilePath}.\n${err.message}`, prompt };
        return (0, rxjs_1.of)(resp);
    }), (0, rxjs_1.map)(explanation => {
        const command = `call openai to explain diffs for file ${explanationInput.fullFilePath}`;
        executedCommands.push(command);
        return Object.assign(Object.assign({}, explanationInput), { explanation: explanation.explanation });
    }), (0, rxjs_1.map)(rec => {
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
        const { fileContent, diffLines } = rec, _rec = __rest(rec, ["fileContent", "diffLines"]);
        return _rec;
    }));
}
//# sourceMappingURL=explain-diffs.js.map