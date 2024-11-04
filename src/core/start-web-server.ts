import fs from 'fs';
import http from 'http';
import express, { Request, Response } from 'express';
import ws from 'ws';
import cors from 'cors';
import { cloneRepo$ } from '../internals/git/git-clone';
import { listTags$, listBranches$, listCommits$ } from '../internals/git/git-list-tags-branches-commits';
import { AddRemoteParams, addRemote$ } from '../internals/git/git-remote';
import { GenerateMdReportParams, writeAllDiffsForProjectWithExplanationToMarkdown$ } from '../internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit';
import { ComparisonParams } from '../internals/cloc-git/cloc-diff-rel';
import { readLinesObs } from 'observable-fs';
import { concatMap, tap } from 'rxjs';

const app = express();
const port = 3000;
const server = http.createServer(app);
const wss = new ws.Server({ server });

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

  // WebSocket connection
  const actions: {[key: string]: (webSocket: ws.Server, data: any) => void} = {
    "generate-report": launchGenerateReport
  }
  wss.on('connection', (ws: ws.WebSocket) => {
    console.log('New client connected');
  
    ws.on('message', (messageData: ws.Data) => {
      console.log(`Received message: ${messageData}`);
      const message = JSON.parse(messageData.toString());
      const action: string = message.action;
      const actionFunction = actions[action];
      // const actionFunction: any = actions[action];
      actionFunction(wss, message.data);

      ws.send(`You said: ${message}`);
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
      url_to_remote_repo: remoteUrl,
      name_of_git_remote: remoteName,
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

  // Use server.listen instead of app.listen to allow WebSocket connections
  server.listen(port, () => {
    console.log(`git-diff-llm server is running at http://localhost:${port}`);
  });
}

function launchGenerateReport(webSocket: ws.Server, data: any) {
  const languages: string[] = data.languages.split(',');
  const comparisonParams: ComparisonParams = {
    projectDir: data.tempDir,
    from_tag_branch_commit: data.from_tag_branch_commit,
    to_tag_branch_commit: data.to_tag_branch_commit,
    url_to_remote_repo: data.url_to_remote_repo,
    use_ssh: data.use_ssh
  };
  const inputParams: GenerateMdReportParams = {
    comparisonParams: comparisonParams,
    promptTemplates: data.promptTemplates,
    outdir: data.tempDir,
    llmModel: data.llmModel,
    languages
  }
  console.log('Generating report with params:', inputParams);
  writeAllDiffsForProjectWithExplanationToMarkdown$(inputParams).pipe(
    concatMap(({ markdownFilePath }) => { 
      return readLinesObs(markdownFilePath)
    }),
    tap({
      next: lines => {
        const mdContent = lines.join('\n');
        webSocket.clients.forEach(client => {
          client.send(JSON.stringify({ messageId: 'report-generated', data: mdContent }));
        });
      }
    })
  ).subscribe({
      error: (err) => {
        console.error(`Error generating report: ${err}`);
        webSocket.clients.forEach(client => {
          client.send(JSON.stringify({ messageId: 'error', data: err }));
        });
      }
    });
}

// npm run tsc && node dist/lib/command.js