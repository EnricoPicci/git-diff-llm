import ws from 'ws';

import { Subject } from "rxjs";

export function stopProcessing(_webSocket: ws.WebSocket, _data: any, stop$: Subject<any>) {
    console.log('Stopping processing');
    stop$.next(null);
    stop$.complete();
}