"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatWithDiffs$ = chatWithDiffs$;
exports.chatWithDiffsAndWriteChat$ = chatWithDiffsAndWriteChat$;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const rxjs_1 = require("rxjs");
const openai_1 = require("../openai/openai");
const message_writer_1 = require("../message-writer/message-writer");
const observable_fs_1 = require("observable-fs");
function chatWithDiffs$(input, executedCommands, messageWriter = message_writer_1.DefaultMessageWriter) {
    const promptForChat = buildFullPrompt(input);
    const llmModel = input.llmModel;
    const msgText = `Chat with LLM with all diffs`;
    const msg = (0, message_writer_1.newInfoMessage)(msgText);
    messageWriter.write(msg);
    return (0, openai_1.getFullCompletion$)(promptForChat, llmModel).pipe((0, rxjs_1.catchError)(err => {
        const errMsg = `===>>> Error chatting with LLM with all diffs - ${err.message}`;
        console.log(errMsg);
        executedCommands.push(errMsg);
        const _errMsg = (0, message_writer_1.newErrorMessage)(errMsg);
        messageWriter.write(_errMsg);
        if (err.explanation) {
            const resp = { explanation: err.explanation, prompt: promptForChat };
            return (0, rxjs_1.of)(resp);
        }
        const resp = { explanation: `error in chatting with LLM about diffs.\n${err.message}`, prompt: promptForChat };
        return (0, rxjs_1.of)(resp);
    }));
}
function chatWithDiffsAndWriteChat$(input, projectDir, outputDirName, executedCommands, messageWriter = message_writer_1.DefaultMessageWriter) {
    const outDir = path_1.default.join(projectDir, outputDirName);
    const promptForChat = buildFullPrompt(input);
    return (0, observable_fs_1.appendFileObs)(path_1.default.join(outDir, 'chat-log.txt'), `Full prompt: ${promptForChat}\n`).pipe((0, rxjs_1.concatMap)(() => {
        return chatWithDiffs$(input, executedCommands, messageWriter);
    }), (0, rxjs_1.concatMap)((response) => {
        const qAndA = `Q: ${input.prompt}\nA: ${response.explanation}\n\n\n`;
        const appentToChat$ = (0, observable_fs_1.appendFileObs)(path_1.default.join(outDir, 'chat.txt'), qAndA);
        const promptForChat = `Response: ${response.explanation}\n\n\n`;
        const appendToChatLog$ = (0, observable_fs_1.appendFileObs)(path_1.default.join(outDir, 'chat-log.txt'), promptForChat);
        return (0, rxjs_1.forkJoin)([appentToChat$, appendToChatLog$]).pipe((0, rxjs_1.map)(() => {
            return response.explanation;
        }));
    }));
}
function fillPromptForChat(prompt, diffs, languageSpecilization) {
    // create the path to the prompts directory this way so that it can work also when the code is packaged
    // and used, for instance, with npx
    const promptsDir = path_1.default.join(__dirname, "..", "..", "..", "prompts");
    const chatPromptTemplate = fs_1.default.readFileSync(path_1.default.join(promptsDir, 'chat-template.txt'), 'utf-8');
    return chatPromptTemplate.replace(/{{diffs}}/g, diffs.join('\n'))
        .replace(/{{languages}}/g, languageSpecilization)
        .replace(/{{prompt}}/g, prompt);
}
function buildFullPrompt(input) {
    const diffs = input.diffs;
    const languages = input.languages;
    const prompt = input.prompt;
    let languageSpecilization = '';
    if (languages) {
        languageSpecilization = languages.join(', ');
    }
    return fillPromptForChat(prompt, diffs, languageSpecilization);
}
//# sourceMappingURL=chat-with-diffs.js.map