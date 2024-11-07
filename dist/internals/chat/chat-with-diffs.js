"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatWithDiffs$ = chatWithDiffs$;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const rxjs_1 = require("rxjs");
const openai_1 = require("../openai/openai");
const message_writer_1 = require("../message-writer/message-writer");
function chatWithDiffs$(input, executedCommands, messageWriter = message_writer_1.DefaultMessageWriter) {
    const diffs = input.diffs;
    const languages = input.languages;
    const llmModel = input.llmModel;
    const prompt = input.prompt;
    let languageSpecilization = '';
    if (languages) {
        languageSpecilization = languages.join(', ');
    }
    const promptForChat = fillPromptForChat(prompt, diffs, languageSpecilization);
    const msgText = `Chat with LLM with all diffs`;
    const msg = (0, message_writer_1.newInfoMessage)(msgText);
    messageWriter.write(msg);
    return (0, openai_1.getFullCompletion$)(promptForChat, llmModel).pipe((0, rxjs_1.catchError)(err => {
        const errMsg = `===>>> Error chatting with LLM with all diffs - ${err.message}`;
        console.log(errMsg);
        executedCommands.push(errMsg);
        const _errMsg = (0, message_writer_1.newErrorMessage)(errMsg);
        messageWriter.write(_errMsg);
        return (0, rxjs_1.of)('error in chatting with LLM about diffs');
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
//# sourceMappingURL=chat-with-diffs.js.map