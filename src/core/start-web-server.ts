import fs from 'fs';
import path from 'path';
import http from 'http';
import express, { Request, Response } from 'express';
import ws from 'ws';
import cors from 'cors';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';

import { Subject } from 'rxjs';

import { cloneRepo$ } from '../internals/git/git-clone';
import { listTags$, listBranches$, listCommits$ } from '../internals/git/git-list-tags-branches-commits';
import { AddRemoteParams, addRemote$ } from '../internals/git/git-remote';
import { launchGenerateReport } from './launch-report';
import { chat, chatAboutFiles$ } from './chat';
import { getDefaultPromptTemplates } from '../internals/prompt-templates/prompt-templates';
import { stopProcessing } from './stop';

const app = express();
const port = 3000;
const server = http.createServer(app);
const wss = new ws.Server({ server });

app.use(cors());
app.use(express.json());

const outputDirName = 'output';

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

  // Serve static files from current directory
  app.use(express.static(__dirname));

  // Specific route for html pages
  app.get('/browser-client.html', (_req, res) => {
    const cwd = process.cwd();
    console.log(`Serving browser-client.html from ${cwd}`);
    res.sendFile(path.join(cwd, 'src', 'core', 'browser-client.html'));
});
  app.get('/file-viewer.html', (_req, res) => {
    const cwd = process.cwd();
    console.log(`Serving file-viewer.html from ${cwd}`);
    res.sendFile(path.join(cwd, 'src', 'core', 'file-viewer.html'));
  });
  app.get('/git-diff-viewer.html', (_req, res) => {
    const cwd = process.cwd();
    console.log(`Serving git-diff-viewer.html from ${cwd}`);
    res.sendFile(path.join(cwd, 'src', 'core', 'git-diff-viewer.html'));
  });

  // WebSocket connection
  type EnrichedWebSocket = ws.WebSocket & { id: string; stop$: Subject<any> };
  const actions: {[key: string]: (webSocket: EnrichedWebSocket, data: any, stop$: Subject<any>) => void} = {
    "generate-report": launchGenerateReport,
    "chat": chat,
    "chat-about-files": chatAboutFiles$,
    "stop-processing": stopProcessing,
  }

  wss.on('connection', (ws: EnrichedWebSocket) => {
    const connectionId = uuidv4();
    ws['id'] = connectionId;
    // stop$ is a Subject that can be used to stop the action - it is attached to each ws object
    ws['stop$'] = new Subject();
    console.log(`New client connected with ID: ${connectionId}`);
    ws.send(JSON.stringify({ id: 'connection-established', data: connectionId  }));
    
  
    ws.on('message', (messageData: ws.Data) => {
      console.log(`Received message: ${messageData}`);
      const message = JSON.parse(messageData.toString());
      const action: string = message.action;
      const actionFunction = actions[action];

      const data = message.data;
      // check if data has a prop named outputDirName
      if (data.outputDirName) {
        console.error('outputDirName is a reserved property and cannot be used in the data object');
        return;
      }
      // add the outputDirName to the data object - this is used for instance by the chat function
      // to save the chat to a file in the output directory which will be downloaded with the download endpoint
      data.outputDirName = outputDirName;
      actionFunction(ws, message.data, ws['stop$']);
    });

    ws.on('error', (error: Error) => {
      console.error(`WebSocket error: ${error.message}`);
    });
  
    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  app.get('/api/v1/default-prompts', (_req: Request, res: Response) => {
    const promptTemplates = getDefaultPromptTemplates();
    res.send(promptTemplates);
  });

  app.post('/api/v1/clone-repo', (req: Request, res: Response) => {
    const { repoUrl, use_ssh } = req.body;
    // Create a temporary directory to clone the repo
    const tempDir = fs.mkdtempSync('git-diff-llm-');
    tempDirectories.push(tempDir);
    console.log(`Created temp directory: ${tempDir}`);
    // clone the repo
    cloneRepo$(repoUrl, tempDir, use_ssh).subscribe({
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

  app.get('/api/v1/list-tags', (req: Request, res: Response) => {
    const tempDir = req.query.tempDir as string;
    const remote = req.query.remote as string;
    // read the tags
    listTags$(tempDir, remote).subscribe({
      next: (tags) => {
        console.log(`Tags for ${remote} read`);
        res.send({ tags, remote });
      },
      error: (err) => {
        console.error(`Error listing tags: ${err}`);
        res.status(500).send(`Error listing tags: ${err}`);
      },
    });
  });

  app.get('/api/v1/list-branches', (req: Request, res: Response) => {
    const tempDir = req.query.tempDir as string;
    const remote = req.query.remote as string;
    // read the branches
    listBranches$(tempDir, remote).subscribe({
      next: (branches) => {
        console.log(`Branches for ${remote} read`);
        res.send({ branches, remote });
      },
      error: (err) => {
        console.error(`Error listing branches: ${err}`);
        res.status(500).send(`Error listing branches: ${err}`);
      },
    });
  });

  app.get('/api/v1/list-commits', (req: Request, res: Response) => {
    const tempDir = req.query.tempDir as string;
    const remote = req.query.remote as string;
    // read the commits
    listCommits$(tempDir, remote).subscribe({
      next: (commits) => {
        console.log(`Commits for ${remote} read`);
        res.send({ commits, remote });
      },
      error: (err) => {
        console.error(`Error listing commits: ${err}`);
        res.status(500).send(`Error listing commits: ${err}`);
      },
    });
  });

  app.post('/api/v1/add-remote', (req: Request, res: Response) => {
    const { tempDir, remoteUrl, remoteName, use_ssh } = req.body;
    // add the remote
    const executedCommands: string[] = [];
    const addRemoteParams: AddRemoteParams = {
      url_to_repo: remoteUrl,
      git_remote_name: remoteName,
      use_ssh
    };

    addRemote$(tempDir, addRemoteParams, executedCommands).subscribe({
      next: () => {
        console.log(`Remote "${remoteName}" with url "${remoteUrl}" added`);
        res.send({ remoteName });
      },
      error: (err) => {
        console.error(`Error adding remote: ${err}`);
        res.status(500).send(`Error adding remote: ${err}`);
      },
    });
  });
  
  app.get('/api/v1/download-output', (req: Request, res: Response) => {
    const tempDir = req.query.tempDir as string;

    // Sanitize the dirName to prevent directory traversal attacks
    const sanitizedDirName = path.basename(tempDir); // Extract only the directory name
    const outputDir = path.join(sanitizedDirName, outputDirName);
    if (!fs.existsSync(outputDir)) {
      res.status(404).send('Output directory not found: ' + outputDir);
      return
    }
  
    const zipFileName = `${outputDir}.zip`;
    const output = fs.createWriteStream(zipFileName);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Set the compression level
    });

    output.on('close', () => {
      res.download(zipFileName, (err) => {
        if (err) {
          console.error(`Error sending zip file: ${err}`);
          res.status(500).send('Error sending zip file');
        } else if (fs.existsSync(zipFileName)) {
          fs.unlinkSync(zipFileName); // Delete the zip file after sending
        }
      });
    });
  
    archive.on('error', (err) => {
      console.error(`Error creating zip file: ${err}`);
      res.status(500).send('Error creating zip file');
    });
  
    archive.pipe(output);
    archive.directory(outputDir, false);
    archive.finalize();
  });

  // Use server.listen instead of app.listen to allow WebSocket connections
  server.listen(port, () => {
    console.log(`git-diff-llm server is running at http://localhost:${port}`);
    console.log('Press Ctrl+C to stop the server');
    console.log('Open the client in a browser at http://localhost:3000/browser-client.html');
  })
}

// npm run tsc && node dist/lib/command.js