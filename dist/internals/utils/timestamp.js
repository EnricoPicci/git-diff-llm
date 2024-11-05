"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimestampYYYYMMDDhhmmss = getTimestampYYYYMMDDhhmmss;
function getTimestampYYYYMMDDhhmmss() {
    return new Date().toISOString().replace(/:/g, '-').split('.')[0];
}
//# sourceMappingURL=timestamp.js.map