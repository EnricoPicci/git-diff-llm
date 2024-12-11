import ws from 'ws';

import { Subject } from "rxjs";
import { MessageWriter, newInfoMessage } from '../internals/message-writer/message-writer';

export function stopProcessing(_webSocket: ws.WebSocket, messageWriterToRemoteClient: MessageWriter, _data: any, stop$: Subject<any>) {
    console.log('Stopping processing');
    stop$.next(null);
    const msg = newInfoMessage('Processing stopped');
    msg.id = 'processing-stopped';
    messageWriterToRemoteClient.write(msg);
}