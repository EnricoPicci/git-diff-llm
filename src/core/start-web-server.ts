import fs from 'fs';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { cloneRepo$ } from '../internals/git/repo';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Read the version from package.json
const packageJson = require('../../package.json');
const version = packageJson.version;

// create an array where we save the temporary directories created
const tempDirectories: string[] = [];

// Handle shutdown signals
function handleShutdown() {
  console.log('Shutting down git-diff-llm server');
  tempDirectories.forEach((dir) => {
    console.log(`Deleting temp directory: ${dir}`);
    // delete the temp directory
    fs.rmdirSync(dir, { recursive: true });
  });
  process.exit(0);
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

export function startWebServer() {
  app.get('/', (_: Request, res: Response) => {
    res.send(`git-diff-llm server started. Version: ${version}`);
  });

  app.post('/api/v1/clone-repo', (req: Request, res: Response) => {
    const { repoUrl } = req.body;
    // Create a temporary directory to clone the repo
    const tempDir = fs.mkdtempSync('git-diff-llm-');
    tempDirectories.push(tempDir);
    console.log(`Created temp directory: ${tempDir}`);
    // clone the repo
    cloneRepo$(repoUrl, tempDir).subscribe({
      next: () => {
        console.log(`Repo cloned to: ${tempDir}`);
        // send the temp directory path as response in a JSON object
        res.send({ tempDir });
      },
      error: (err) => {
        console.error(`Error cloning repo: ${err}`);
        res.status(500).send(`Error cloning repo: ${err}`);
      },
    });
    
  });

  app.listen(port, () => {
    console.log(`git-diff-llm server is running at <http://localhost>:${port} - Version: ${version}`);
  });
}

// npm run tsc && node dist/lib/command.js