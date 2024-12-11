"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWebServer = startWebServer;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const ws_1 = __importDefault(require("ws"));
const cors_1 = __importDefault(require("cors"));
const archiver_1 = __importDefault(require("archiver"));
const uuid_1 = require("uuid");
const git_clone_1 = require("../internals/git/git-clone");
const git_list_tags_branches_commits_1 = require("../internals/git/git-list-tags-branches-commits");
const git_remote_1 = require("../internals/git/git-remote");
const launch_report_1 = require("./launch-report");
const chat_1 = require("./chat");
const prompt_templates_1 = require("../internals/prompt-templates/prompt-templates");
const rxjs_1 = require("rxjs");
const stop_1 = require("./stop");
const app = (0, express_1.default)();
const port = 3000;
const server = http_1.default.createServer(app);
const wss = new ws_1.default.Server({ server });
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const outputDirName = 'output';
// Read the version from package.json
const packageJson = require('../../package.json');
const version = packageJson.version;
// create an array where we save the temporary directories created
const tempDirectories = [];
// Handle shutdown signals
function handleShutdown() {
    console.log('Shutting down git-diff-llm server');
    tempDirectories.forEach((dir) => {
        console.log(`Deleting temp directory: ${dir}`);
        // delete the temp directory
        fs_1.default.rmdirSync(dir, { recursive: true });
    });
    process.exit(0);
}
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
function startWebServer() {
    app.get('/', (_, res) => {
        res.send(`git-diff-llm server started. Version: ${version}`);
    });
    // Serve static files from current directory
    app.use(express_1.default.static(__dirname));
    // Specific route for html pages
    app.get('/browser-client.html', (_req, res) => {
        const cwd = process.cwd();
        console.log(`Serving browser-client.html from ${cwd}`);
        res.sendFile(path_1.default.join(cwd, 'src', 'core', 'browser-client.html'));
    });
    app.get('/file-viewer.html', (_req, res) => {
        const cwd = process.cwd();
        console.log(`Serving file-viewer.html from ${cwd}`);
        res.sendFile(path_1.default.join(cwd, 'src', 'core', 'file-viewer.html'));
    });
    app.get('/git-diff-viewer.html', (_req, res) => {
        const cwd = process.cwd();
        console.log(`Serving git-diff-viewer.html from ${cwd}`);
        res.sendFile(path_1.default.join(cwd, 'src', 'core', 'git-diff-viewer.html'));
    });
    const actions = {
        "generate-report": launch_report_1.launchGenerateReport,
        "chat": chat_1.chat,
        "chat-about-files": chat_1.chatAboutFiles$,
        "stop-processing": stop_1.stopProcessing,
    };
    wss.on('connection', (ws) => {
        const connectionId = (0, uuid_1.v4)();
        ws['id'] = connectionId;
        // stop$ is a Subject that can be used to stop the action - it is attached to each ws object
        ws['stop$'] = new rxjs_1.Subject();
        console.log(`New client connected with ID: ${connectionId}`);
        ws.send(JSON.stringify({ id: 'connection-established', data: connectionId }));
        ws.on('message', (messageData) => {
            console.log(`Received message: ${messageData}`);
            const message = JSON.parse(messageData.toString());
            const action = message.action;
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
        ws.on('error', (error) => {
            console.error(`WebSocket error: ${error.message}`);
        });
        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });
    app.get('/api/v1/default-prompts', (_req, res) => {
        const promptTemplates = (0, prompt_templates_1.getDefaultPromptTemplates)();
        res.send(promptTemplates);
    });
    app.post('/api/v1/clone-repo', (req, res) => {
        const { repoUrl, use_ssh } = req.body;
        // Create a temporary directory to clone the repo
        const tempDir = fs_1.default.mkdtempSync('git-diff-llm-');
        tempDirectories.push(tempDir);
        console.log(`Created temp directory: ${tempDir}`);
        // clone the repo
        (0, git_clone_1.cloneRepo$)(repoUrl, tempDir, use_ssh).subscribe({
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
    app.get('/api/v1/list-tags', (req, res) => {
        const tempDir = req.query.tempDir;
        const remote = req.query.remote;
        // read the tags
        (0, git_list_tags_branches_commits_1.listTags$)(tempDir, remote).subscribe({
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
    app.get('/api/v1/list-branches', (req, res) => {
        const tempDir = req.query.tempDir;
        const remote = req.query.remote;
        // read the branches
        (0, git_list_tags_branches_commits_1.listBranches$)(tempDir, remote).subscribe({
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
    app.get('/api/v1/list-commits', (req, res) => {
        const tempDir = req.query.tempDir;
        const remote = req.query.remote;
        // read the commits
        (0, git_list_tags_branches_commits_1.listCommits$)(tempDir, remote).subscribe({
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
    app.post('/api/v1/add-remote', (req, res) => {
        const { tempDir, remoteUrl, remoteName, use_ssh } = req.body;
        // add the remote
        const executedCommands = [];
        const addRemoteParams = {
            url_to_repo: remoteUrl,
            git_remote_name: remoteName,
            use_ssh
        };
        (0, git_remote_1.addRemote$)(tempDir, addRemoteParams, executedCommands).subscribe({
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
    app.get('/api/v1/download-output', (req, res) => {
        const tempDir = req.query.tempDir;
        // Sanitize the dirName to prevent directory traversal attacks
        const sanitizedDirName = path_1.default.basename(tempDir); // Extract only the directory name
        const outputDir = path_1.default.join(sanitizedDirName, outputDirName);
        if (!fs_1.default.existsSync(outputDir)) {
            res.status(404).send('Output directory not found: ' + outputDir);
            return;
        }
        const zipFileName = `${outputDir}.zip`;
        const output = fs_1.default.createWriteStream(zipFileName);
        const archive = (0, archiver_1.default)('zip', {
            zlib: { level: 9 }, // Set the compression level
        });
        output.on('close', () => {
            res.download(zipFileName, (err) => {
                if (err) {
                    console.error(`Error sending zip file: ${err}`);
                    res.status(500).send('Error sending zip file');
                }
                else if (fs_1.default.existsSync(zipFileName)) {
                    fs_1.default.unlinkSync(zipFileName); // Delete the zip file after sending
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
    });
}
// npm run tsc && node dist/lib/command.js
//# sourceMappingURL=start-web-server.js.map