#!/usr/bin/env node

import path from 'path';
import { startWebServer } from '../core/start-web-server';

// Read the version from package.json
const packageJson = require('../../package.json');
const version = packageJson.version;
console.log(`Starting git-diff-llm server. Version: ${version}\n`);

startWebServer();

const clientPartialUrl = path.join(__dirname, '..', '..', 'src', 'core', 'browser-client.html');
console.log(`url to paste on the browser: file:/${clientPartialUrl}\n`);
console.log(`url to paste on the browser (if using wsl and Ubuntu): file://wsl.localhost/Ubuntu${clientPartialUrl}\n\n`);

// npm run tsc && node dist/lib/command.js
