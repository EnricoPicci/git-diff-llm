"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopProcessing = stopProcessing;
function stopProcessing(_webSocket, _data, stop$) {
    console.log('Stopping processing');
    stop$.next(null);
    stop$.complete();
}
//# sourceMappingURL=stop.js.map