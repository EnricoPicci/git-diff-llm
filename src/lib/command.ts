#!/usr/bin/env node

import path from 'path';
import { startWebServer } from '../core/start-web-server';

startWebServer();

const clientAddress = path.join(__dirname, '..', 'core', 'browser-client.html');
console.log(`clientAddress: file:/${clientAddress}\n`);
console.log(`clientAddress (if using wsl and Ubuntu): file://wsl.localhost/Ubuntu${clientAddress}\n\n`);

// npm run tsc && node dist/lib/command.js
