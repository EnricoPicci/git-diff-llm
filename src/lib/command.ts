#!/usr/bin/env node

import { startWebServer } from '../core/start-web-server';

// Read the version from package.json
const packageJson = require('../../package.json');
const version = packageJson.version;
console.log(`Starting git-diff-llm server. Version: ${version}\n`);

startWebServer();

// npm run tsc && node dist/lib/command.js
