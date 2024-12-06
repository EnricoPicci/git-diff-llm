#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const start_web_server_1 = require("../core/start-web-server");
// Read the version from package.json
const packageJson = require('../../package.json');
const version = packageJson.version;
console.log(`Starting git-diff-llm server. Version: ${version}\n`);
(0, start_web_server_1.startWebServer)();
// npm run tsc && node dist/lib/command.js
//# sourceMappingURL=command.js.map