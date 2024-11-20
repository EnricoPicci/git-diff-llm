#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const start_web_server_1 = require("../core/start-web-server");
// Read the version from package.json
const packageJson = require('../../package.json');
const version = packageJson.version;
console.log(`Starting git-diff-llm server. Version: ${version}\n`);
(0, start_web_server_1.startWebServer)();
const clientPartialUrl = path_1.default.join(__dirname, '..', '..', 'src', 'core', 'browser-client.html');
console.log(`url to paste on the browser: file:/${clientPartialUrl}\n`);
console.log(`url to paste on the browser (if using wsl and Ubuntu): file://wsl.localhost/Ubuntu${clientPartialUrl}\n\n`);
// npm run tsc && node dist/lib/command.js
//# sourceMappingURL=command.js.map