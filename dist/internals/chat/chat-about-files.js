"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatAboutFilesAndWriteChat$ = chatAboutFilesAndWriteChat$;
exports.identifyFiles$ = identifyFiles$;
exports.askQuestionAboutFiles$ = askQuestionAboutFiles$;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const rxjs_1 = require("rxjs");
const observable_fs_1 = require("observable-fs");
const cloc_git_diff_rel_between_tag_branch_commit_1 = require("../cloc-git/cloc-git-diff-rel-between-tag-branch-commit");
const message_writer_1 = require("../message-writer/message-writer");
const openai_1 = require("../openai/openai");
function chatAboutFilesAndWriteChat$(input, projectDir, outputDirName, executedCommands, messageWriter = message_writer_1.DefaultMessageWriter) {
    const promptForChat = buildFullPromptToIdentifyFiles(input);
    return (0, observable_fs_1.appendFileObs)(path_1.default.join(projectDir, outputDirName, 'chat-about-files-log.txt'), `Full prompt: ${promptForChat}\n`).pipe(
    // identify the files the question refers to
    (0, rxjs_1.concatMap)(() => {
        return identifyFiles$(input, executedCommands, messageWriter);
    }), 
    // log the chat
    (0, rxjs_1.concatMap)((response) => {
        return logChat$(response, input, projectDir, outputDirName);
    }), 
    // Split the response into a list of files and update the client of the reasoning step
    (0, rxjs_1.map)((explanation) => {
        const responseString = explanation.trim();
        const filesIdentified = responseString.length === 0 ? [] : responseString.split(',').map(f => f.trim());
        if (filesIdentified.length > 0) {
            const msgText = `Files identified: ${filesIdentified.join(', ')}`;
            const msg = (0, message_writer_1.newInfoMessage)(msgText);
            msg.id = 'chat-reasoning';
            messageWriter.write(msg);
        }
        return filesIdentified;
    }), 
    // ask the question with the identified files
    (0, rxjs_1.concatMap)((filesIdentified) => {
        if (filesIdentified.length === 0) {
            const msgText = `We have not been able to identify any file the question refers to. Please, provide more context or rephrase the question.`;
            const msg = (0, message_writer_1.newInfoMessage)(msgText);
            // 'chat' is the id of a message that represents the response and not a reasoning step
            msg.id = 'chat';
            messageWriter.write(msg);
            // const resp: FullCompletionReponse = { explanation: msgText, prompt: '' }
            // return of(resp)
            return rxjs_1.EMPTY;
        }
        return askQuestionAboutFiles$(input, filesIdentified, executedCommands, messageWriter);
    }), 
    // log the chat
    (0, rxjs_1.concatMap)((response) => {
        return logChat$(response, input, projectDir, outputDirName);
    }), 
    // Send the response to the client
    (0, rxjs_1.map)((explanation) => {
        const responseString = explanation.trim();
        const msg = (0, message_writer_1.newInfoMessage)(responseString);
        msg.id = 'chat';
        messageWriter.write(msg);
        return responseString;
    }), (0, rxjs_1.catchError)(err => {
        const errMsg = `===>>> Error chatting about files - ${err.message}`;
        console.log(errMsg);
        executedCommands.push(errMsg);
        const _errMsg = (0, message_writer_1.newErrorMessage)(errMsg);
        messageWriter.write(_errMsg);
        return (0, rxjs_1.of)(errMsg);
    }));
}
// IDENTIFY THE FILES
function identifyFiles$(input, executedCommands, messageWriter = message_writer_1.DefaultMessageWriter) {
    const promptForChat = buildFullPromptToIdentifyFiles(input);
    const llmModel = input.llmModel;
    const msgText = `Trying to identify which are the files the question refers to`;
    const msg = (0, message_writer_1.newInfoMessage)(msgText);
    messageWriter.write(msg);
    return (0, openai_1.getFullCompletion$)(promptForChat, llmModel).pipe((0, rxjs_1.catchError)(err => {
        const errMsg = `===>>> Error chatting with LLM about files with diffs - ${err.message}`;
        console.log(errMsg);
        executedCommands.push(errMsg);
        const _errMsg = (0, message_writer_1.newErrorMessage)(errMsg);
        messageWriter.write(_errMsg);
        if (err.explanation) {
            const resp = { explanation: err.explanation, prompt: promptForChat };
            return (0, rxjs_1.of)(resp);
        }
        const resp = { explanation: `error in chatting with LLM about files with diffs.\n${err.message}`, prompt: promptForChat };
        return (0, rxjs_1.of)(resp);
    }));
}
function buildFullPromptToIdentifyFiles(input) {
    var _a;
    const question = input.question;
    const diffsStoreKey = input.diffsKey;
    const diffs = (_a = (0, cloc_git_diff_rel_between_tag_branch_commit_1.getDiffsFromStore)(diffsStoreKey)) === null || _a === void 0 ? void 0 : _a.diffs;
    if (!diffs) {
        throw new Error(`No diffs found for key: ${diffsStoreKey}`);
    }
    const fileNames = (0, cloc_git_diff_rel_between_tag_branch_commit_1.getFileNamesFromDiffs)(diffs);
    // create the path to the prompts directory this way so that it can work also when the code is packaged
    // and used, for instance, with npx
    const promptsDir = path_1.default.join(__dirname, "..", "..", "..", "prompts");
    const promptTemplate = fs_1.default.readFileSync(path_1.default.join(promptsDir, 'identify-files-template.txt'), 'utf-8');
    // check that the expected placeholders are in the prompt
    const promptPlaceholders = ['{{question}}', '{{files}}'];
    promptPlaceholders.forEach(placeholder => {
        if (!promptTemplate.includes(placeholder)) {
            const errMsg = `Prompt does not include placeholder: ${placeholder}`;
            throw new Error(errMsg);
        }
    });
    const prompt = promptTemplate.replaceAll('{{question}}', question).replaceAll('{{files}}', fileNames.join('\n'));
    if (prompt.includes('{{')) {
        throw new Error(`Prompt still includes placeholders: ${prompt}`);
    }
    return prompt;
}
// ASK THE QUESTION ABOUT THE FILES
function askQuestionAboutFiles$(input, filesIdentified, executedCommands, messageWriter = message_writer_1.DefaultMessageWriter) {
    const promptForChat = buildFullPromptToAskQuestion(input, filesIdentified);
    const llmModel = input.llmModel;
    const msgText = `Asking the question about the files identified`;
    const msg = (0, message_writer_1.newInfoMessage)(msgText);
    messageWriter.write(msg);
    return (0, openai_1.getFullCompletion$)(promptForChat, llmModel).pipe((0, rxjs_1.catchError)(err => {
        const errMsg = `===>>> Error asking the LLM about files with diffs - ${err.message}`;
        console.log(errMsg);
        executedCommands.push(errMsg);
        const _errMsg = (0, message_writer_1.newErrorMessage)(errMsg);
        messageWriter.write(_errMsg);
        if (err.explanation) {
            const resp = { explanation: err.explanation, prompt: promptForChat };
            return (0, rxjs_1.of)(resp);
        }
        const resp = { explanation: `error asking the LLM about files with diffs.\n${err.message}`, prompt: promptForChat };
        return (0, rxjs_1.of)(resp);
    }));
}
function buildFullPromptToAskQuestion(input, filesIdentified) {
    var _a;
    const question = input.question;
    const languages = input.languages;
    const diffsStoreKey = input.diffsKey;
    const diffs = (_a = (0, cloc_git_diff_rel_between_tag_branch_commit_1.getDiffsFromStore)(diffsStoreKey)) === null || _a === void 0 ? void 0 : _a.diffs;
    if (!diffs) {
        throw new Error(`No diffs found for key: ${diffsStoreKey}`);
    }
    // for each of the file identified append a string with the file name and the diff and the file content
    const filesStringForPrompt = filesIdentified.reduce((_filesStringForPrompt, fileName) => {
        var _a;
        // each file can have multiple diffs, one for each commit
        const diffsForFile = diffs.filter(diff => diff.File === fileName);
        const diff = diffsForFile.map(d => d.diffLines).join('\n\n');
        const fileContent = ((_a = diffs.find(d => d.File === fileName)) === null || _a === void 0 ? void 0 : _a.fileContent) || '';
        const fileString = `FILE NAME: ${fileName}\n\n*DIFFS*\n${diff}\n\n*CONTENT*\n${fileContent}`;
        _filesStringForPrompt += fileString;
        return _filesStringForPrompt;
    }, '');
    // create the path to the prompts directory this way so that it can work also when the code is packaged
    // and used, for instance, with npx
    const promptsDir = path_1.default.join(__dirname, "..", "..", "..", "prompts");
    const promptTemplate = fs_1.default.readFileSync(path_1.default.join(promptsDir, 'chat-about-files-template.txt'), 'utf-8');
    // check that the expected placeholders are in the prompt
    const promptPlaceholders = ['{{languages}}', '{{question}}', '{{files}}'];
    promptPlaceholders.forEach(placeholder => {
        if (!promptTemplate.includes(placeholder)) {
            const errMsg = `Prompt does not include placeholder: ${placeholder}`;
            throw new Error(errMsg);
        }
    });
    const prompt = promptTemplate
        .replaceAll('{{question}}', question)
        .replaceAll('{{files}}', filesStringForPrompt)
        .replaceAll('{{languages}}', languages);
    if (prompt.includes('{{')) {
        throw new Error(`Prompt still includes placeholders: ${prompt}`);
    }
    return prompt;
}
// // CONVERT A STRING TO A LIST OF FILES
// export function transformStringToFileList$(
//     input: string, 
//     llmModel: string,
//     executedCommands: string[], 
//     messageWriter: MessageWriter = DefaultMessageWriter
// ) {
//     const promptForChat = buildFullPromptToTransformStringIntoListOfFiles(input)
//     const msgText = `Trying to transform this string "${input}" into a list of files`
//     const msg = newInfoMessage(msgText)
//     messageWriter.write(msg)
//     return getFullCompletion$(promptForChat, llmModel).pipe(
//         catchError(err => {
//             const errMsg = `===>>> Error transforming a string into a list of files - ${err.message}`
//             console.log(errMsg)
//             executedCommands.push(errMsg)
//             const _errMsg = newErrorMessage(errMsg)
//             messageWriter.write(_errMsg)
//             if (err.explanation) {
//                 const resp: FullCompletionReponse = { explanation: err.explanation, prompt: promptForChat }
//                 return of(resp)
//             }
//             const resp: FullCompletionReponse = { explanation: `Error transforming a string into a list of files.\n${err.message}`, prompt: promptForChat }
//             return of(resp)
//         }),
//     )
// }
// function buildFullPromptToTransformStringIntoListOfFiles(
//     input: string,
// ) {
//     // create the path to the prompts directory this way so that it can work also when the code is packaged
//     // and used, for instance, with npx
//     const promptsDir = path.join(__dirname, "..", "..", "..", "prompts");
//     const promptTemplate = fs.readFileSync(path.join(promptsDir, 'transform-string-to-file-list.txt'), 'utf-8')
//     // check that the expected placeholders are in the prompt
//     const promptPlaceholders = ['{{string}}']
//     promptPlaceholders.forEach(placeholder => {
//         if (!promptTemplate.includes(placeholder)) {
//             const errMsg = `Prompt does not include placeholder: ${placeholder}`
//             throw new Error(errMsg)
//         }
//     })
//     return promptTemplate.replaceAll('{{string}}', input)
// }
// log the chat
function logChat$(response, input, projectDir, outputDirName) {
    const qAndA = `Q: ${input.question}\nA: ${response.explanation}\n\n\n`;
    const appentToChat$ = (0, observable_fs_1.appendFileObs)(path_1.default.join(projectDir, outputDirName, 'chat-about-files.txt'), qAndA);
    const promptForChat = `Response: ${response.explanation}\n\n\n`;
    const appendToChatLog$ = (0, observable_fs_1.appendFileObs)(path_1.default.join(projectDir, outputDirName, 'chat-about-files-log.txt'), promptForChat);
    return (0, rxjs_1.forkJoin)([appentToChat$, appendToChatLog$]).pipe((0, rxjs_1.map)(() => {
        return response.explanation;
    }));
}
//# sourceMappingURL=chat-about-files.js.map