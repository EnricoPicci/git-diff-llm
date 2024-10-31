"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWebServer = startWebServer;
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = 3000;
function startWebServer() {
    app.get('/', (_, res) => {
        res.send('Hello, TypeScript with Express!');
    });
    app.listen(port, () => {
        console.log(`Server is running at <http://localhost>:${port}`);
    });
}
//# sourceMappingURL=start-web-server.js.map