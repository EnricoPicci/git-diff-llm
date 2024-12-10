import ws from 'ws';
import { MessageWriter, newInfoMessage } from '../internals/message-writer/message-writer';
import { chatWithDiffsAndWriteChat$, ChatWithDiffsParams } from '../internals/chat/chat-with-diffs';
import { chatAboutFilesAndWriteChat$, ChatAboutFilesParams } from '../internals/chat/chat-about-files';

export function chat(webSocket: ws.WebSocket, data: any) {
    const inputParams: ChatWithDiffsParams = {
        diffs: data.diffs,
        languages: data.languages.split(','),
        llmModel: data.llmModel,
        prompt: data.promptTemplate,
    }

    const projectDir = data.tempDir;
    const outputDirName = data.outputDirName;

    console.log('Chatting with params:', inputParams);

    const messageWriterToRemoteClient: MessageWriter = {
      write: (msg) => {
        console.log(`Message to client: ${JSON.stringify(msg)}`);
        webSocket.send(JSON.stringify(msg));
      }
    }

    const executedCommands: string[] = [];

    chatWithDiffsAndWriteChat$(inputParams, projectDir, outputDirName, executedCommands, messageWriterToRemoteClient).subscribe({
        next: response => {
          const msg = newInfoMessage(response)
          msg.id = 'chat'
          messageWriterToRemoteClient.write(msg)
        },
        error: (err) => {
          console.error(`Error chatting with diffs: ${err}`);
          webSocket.send(JSON.stringify({ messageId: 'error', data: err }));
        },
      });
}

export function chatAboutFiles$(webSocket: ws.WebSocket, data: any) {
    const inputParams: ChatAboutFilesParams = {
        llmModel: data.llmModel,
        question: data.question,
        languages: data.languages,
        diffsKey: data.diffsKey,
    }

    const projectDir = data.tempDir;
    const outputDirName = data.outputDirName;

    console.log('Chatting about files with params:', inputParams);

    const messageWriterToRemoteClient: MessageWriter = {
      write: (msg) => {
        console.log(`Message to client: ${JSON.stringify(msg)}`);
        webSocket.send(JSON.stringify(msg));
      }
    }

    const executedCommands: string[] = [];

    chatAboutFilesAndWriteChat$(inputParams, projectDir, outputDirName, executedCommands, messageWriterToRemoteClient).subscribe({
        next: response => {
          const msg = newInfoMessage(response)
          msg.id = 'chat-about-files'
          messageWriterToRemoteClient.write(msg)
        },
        error: (err) => {
          console.error(`Error chatting about files: ${err}`);
          webSocket.send(JSON.stringify({ messageId: 'error', data: err }));
        },
      });

}