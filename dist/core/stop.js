"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopProcessing = stopProcessing;
const message_writer_1 = require("../internals/message-writer/message-writer");
function stopProcessing(_webSocket, messageWriterToRemoteClient, _data, stop$) {
    console.log('Stopping processing');
    stop$.next(null);
    const msg = (0, message_writer_1.newInfoMessage)('Processing stopped');
    msg.id = 'processing-stopped';
    messageWriterToRemoteClient.write(msg);
}
//# sourceMappingURL=stop.js.map