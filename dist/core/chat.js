"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatAboutFiles = chatAboutFiles;
const message_writer_1 = require("../internals/message-writer/message-writer");
const chat_about_files_1 = require("../internals/chat/chat-about-files");
function chatAboutFiles(webSocket, messageWriterToRemoteClient, data) {
    const inputParams = {
        llmModel: data.llmModel,
        question: data.question,
        languages: data.languages,
        diffsKey: data.diffsKey,
    };
    const projectDir = data.tempDir;
    const outputDirName = data.outputDirName;
    console.log('Chatting about files with params:', inputParams);
    const executedCommands = [];
    (0, chat_about_files_1.chatAboutFilesAndWriteChat$)(inputParams, projectDir, outputDirName, executedCommands, messageWriterToRemoteClient).subscribe({
        next: response => {
            const msg = (0, message_writer_1.newInfoMessage)(response);
            msg.id = 'chat-about-files';
            messageWriterToRemoteClient.write(msg);
        },
        error: (err) => {
            console.error(`Error chatting about files: ${err}`);
            webSocket.send(JSON.stringify({ messageId: 'error', data: err }));
        },
    });
}
//# sourceMappingURL=chat.js.map