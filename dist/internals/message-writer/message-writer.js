"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultMessageWriter = void 0;
exports.newInfoMessage = newInfoMessage;
exports.newErrorMessage = newErrorMessage;
exports.newWarningMessage = newWarningMessage;
exports.DefaultMessageWriter = {
    write: (msg) => {
        console.log(`Message to client: ${JSON.stringify(msg)}`);
    }
};
function newInfoMessage(data) {
    return {
        type: 'info',
        data
    };
}
function newErrorMessage(data) {
    return {
        type: 'error',
        data
    };
}
function newWarningMessage(data) {
    return {
        type: 'warning',
        data
    };
}
//# sourceMappingURL=message-writer.js.map