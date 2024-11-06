import fs from 'fs';
import path from 'path';
import http from 'http';
import express, { Request, Response } from 'express';
import ws from 'ws';
import cors from 'cors';
import archiver from 'archiver';

import { concatMap } from 'rxjs';

import { readLinesObs } from 'observable-fs';

import { cloneRepo$ } from '../internals/git/git-clone';
import { listTags$, listBranches$, listCommits$ } from '../internals/git/git-list-tags-branches-commits';
import { AddRemoteParams, addRemote$ } from '../internals/git/git-remote';
import { GenerateMdReportParams, writeAllDiffsForProjectWithExplanationToMarkdown$ } from '../internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit';
import { ComparisonParams } from '../internals/cloc-git/cloc-diff-rel';
import { MessageWriter } from '../internals/message-writer/message-writer';
import { ComparisonEnd } from '../internals/git/git-diffs';

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

  // WebSocket connection
  const actions: {[key: string]: (webSocket: ws.WebSocket, data: any) => void} = {
    "generate-report": launchGenerateReport
  }
  wss.on('connection', (ws: ws.WebSocket) => {
    console.log('New client connected');
  
    ws.on('message', (messageData: ws.Data) => {
      console.log(`Received message: ${messageData}`);
      const message = JSON.parse(messageData.toString());
      const action: string = message.action;
      const actionFunction = actions[action];
      actionFunction(ws, message.data);
    });

    ws.on('error', (error: Error) => {
      console.error(`WebSocket error: ${error.message}`);
    });
  
    ws.on('close', () => {
      console.log('Client disconnected');
    });
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
    const { tempDir, remoteUrl, remoteName } = req.body;
    // add the remote
    const executedCommands: string[] = [];
    const addRemoteParams: AddRemoteParams = {
      url_to_repo: remoteUrl,
      git_remote_name: remoteName,
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
  });
}

const GitRemoteNameForSecondRepo = 'git-diff-llm'
function launchGenerateReport(webSocket: ws.WebSocket, data: any) {
  // the client must provide these data - some properties must be undefined but this is the structure expected from the client
  const projectDir = data.tempDir
  const url_to_repo = data.url_to_repo
  const from_tag_branch_commit = data.from_tag_branch_commit
  const to_tag_branch_commit = data.to_tag_branch_commit
  const languages: string[] = data.languages.split(',');
  const url_to_second_repo = data.url_to_second_repo
  const is_second_repo_used_as_from_repo = data.is_second_repo_used_as_from_repo
  const is_second_repo_used_as_to_repo = data.is_second_repo_used_as_to_repo
  const use_ssh = data.use_ssh
  const llmModel = data.llmModel

  // first we set the values of from_tag_branch_commit and to_tag_branch_commit to the values they would have
  // if no url_to_second_repo is sent
  const from: ComparisonEnd = {
    url_to_repo,
    git_remote_name: 'origin',
    tag_branch_commit: from_tag_branch_commit
  }
  const to: ComparisonEnd = {
    url_to_repo,
    git_remote_name: 'origin',
    tag_branch_commit: to_tag_branch_commit
  }
  // if url_to_second_repo is defined, it means that the client has specified a second repo to compare with
  if (url_to_second_repo) {
    if (is_second_repo_used_as_from_repo) {
      from.url_to_repo = url_to_second_repo
      from.git_remote_name = GitRemoteNameForSecondRepo
    } else if (is_second_repo_used_as_to_repo) {
      to.url_to_repo = url_to_second_repo
      to.git_remote_name = GitRemoteNameForSecondRepo
    } else {
      const errMsg = `"url_to_second_repo" set but neither "is_url_to_second_repo_from" nor "is_url_to_second_repo_to" are set to true. 
Data received:
${JSON.stringify(data, null, 2)}`
      throw errMsg
    }
  }

  const comparisonParams: ComparisonParams = {
    projectDir,
    url_to_repo,
    from_tag_branch_commit: from,
    to_tag_branch_commit: to,
    use_ssh
  };
  const inputParams: GenerateMdReportParams = {
    comparisonParams: comparisonParams,
    promptTemplates: data.promptTemplates,
    outdir: path.join(projectDir, outputDirName),
    llmModel,
    languages
  }
  console.log('Generating report with params:', inputParams);
  const messageWriterToRemoteClient: MessageWriter = {
    write: (msg) => {
      console.log(`Message to client: ${JSON.stringify(msg)}`);
      webSocket.send(JSON.stringify(msg));
    }
  }
  writeAllDiffsForProjectWithExplanationToMarkdown$(inputParams, messageWriterToRemoteClient).pipe(
    concatMap(({ markdownFilePath }) => { 
      return readLinesObs(markdownFilePath)
    }),
  ).subscribe({
      error: (err) => {
        console.error(`Error generating report: ${err}`);
        webSocket.send(JSON.stringify({ messageId: 'error', data: err }));
      },
    });
}

// npm run tsc && node dist/lib/command.js