#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const start_web_server_1 = require("../core/start-web-server");
(0, start_web_server_1.startWebServer)();
const clientAddress = path_1.default.join(process.cwd(), 'src', 'core', 'browser-client.html');
console.log(`clientAddress: file:/${clientAddress}\n`);
console.log(`clientAddress (if using wsl and Ubuntu): file://wsl.localhost/Ubuntu${clientAddress}\n\n`);
// npm run tsc && node dist/lib/command.js
//# sourceMappingURL=command.js.map