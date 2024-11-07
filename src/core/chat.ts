import ws from 'ws';
import { MessageWriter, newInfoMessage } from '../internals/message-writer/message-writer';
import { chatWithDiffsAndWriteChat$, ChatWithDiffsParams } from '../internals/chat/chat-with-diffs';

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