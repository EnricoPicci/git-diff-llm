#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const start_web_server_1 = require("../core/start-web-server");
console.log('Starting git-diff-llm server', process.cwd());
(0, start_web_server_1.startWebServer)();
// npm run tsc && node dist/lib/command.js
//# sourceMappingURL=command.js.map