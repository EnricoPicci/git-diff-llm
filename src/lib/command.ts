#!/usr/bin/env node

import path from 'path';
import { startWebServer } from '../core/start-web-server';

// Read the version from package.json
const packageJson = require('../../package.json');
const version = packageJson.version;
console.log(`Starting git-diff-llm server. Version: ${version}\n`);

startWebServer();

const clientAddress = path.join(__dirname, '..', '..', 'src', 'core', 'browser-client.html');
console.log(`clientAddress: file:/${clientAddress}\n`);
console.log(`clientAddress (if using wsl and Ubuntu): file://wsl.localhost/Ubuntu${clientAddress}\n\n`);

// npm run tsc && node dist/lib/command.js
