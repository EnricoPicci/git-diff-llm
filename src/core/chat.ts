import ws from 'ws';
import { MessageWriter, newInfoMessage } from '../internals/message-writer/message-writer';
import { chatAboutFilesAndWriteChat$, ChatAboutFilesParams } from '../internals/chat/chat-about-files';

export function chatAboutFiles(webSocket: ws.WebSocket, messageWriterToRemoteClient: MessageWriter, data: any) {
    const inputParams: ChatAboutFilesParams = {
        llmModel: data.llmModel,
        question: data.question,
        languages: data.languages,
        diffsKey: data.diffsKey,
    }

    const projectDir = data.tempDir;
    const outputDirName = data.outputDirName;

    console.log('Chatting about files with params:', inputParams);

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