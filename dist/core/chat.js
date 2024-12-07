"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chat = chat;
const message_writer_1 = require("../internals/message-writer/message-writer");
const chat_with_diffs_1 = require("../internals/chat/chat-with-diffs");
function chat(webSocket, data) {
    const inputParams = {
        diffs: data.diffs,
        languages: data.languages.split(','),
        llmModel: data.llmModel,
        prompt: data.promptTemplate,
    };
    const projectDir = data.tempDir;
    const outputDirName = data.outputDirName;
    console.log('Chatting with params:', inputParams);
    const messageWriterToRemoteClient = {
        write: (msg) => {
            console.log(`Message to client: ${JSON.stringify(msg)}`);
            webSocket.send(JSON.stringify(msg));
        }
    };
    const executedCommands = [];
    (0, chat_with_diffs_1.chatWithDiffsAndWriteChat$)(inputParams, projectDir, outputDirName, executedCommands, messageWriterToRemoteClient).subscribe({
        next: response => {
            const msg = (0, message_writer_1.newInfoMessage)(response);
            msg.id = 'chat';
            messageWriterToRemoteClient.write(msg);
        },
        error: (err) => {
            console.error(`Error chatting with diffs: ${err}`);
            webSocket.send(JSON.stringify({ messageId: 'error', data: err }));
        },
    });
}
//# sourceMappingURL=chat.js.map