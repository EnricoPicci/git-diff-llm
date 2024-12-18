"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWebServer = startWebServer;
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const ws_1 = __importDefault(require("ws"));
const cors_1 = __importDefault(require("cors"));
const git_clone_1 = require("../internals/git/git-clone");
const git_list_tags_branches_commits_1 = require("../internals/git/git-list-tags-branches-commits");
const git_remote_1 = require("../internals/git/git-remote");
const app = (0, express_1.default)();
const port = 3000;
const server = http_1.default.createServer(app);
const wss = new ws_1.default.Server({ server });
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
    // WebSocket connection
    wss.on('connection', (ws) => {
        console.log('New client connected');
        ws.on('message', (message) => {
            console.log(`Received message: ${message}`);
            ws.send(`You said: ${message}`);
        });
        ws.on('error', (error) => {
            console.error(`WebSocket error: ${error.message}`);
        });
        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });
    app.post('/api/v1/clone-repo', (req, res) => {
        const { repoUrl } = req.body;
        // Create a temporary directory to clone the repo
        const tempDir = fs_1.default.mkdtempSync('git-diff-llm-');
        tempDirectories.push(tempDir);
        console.log(`Created temp directory: ${tempDir}`);
        // clone the repo
        (0, git_clone_1.cloneRepo$)(repoUrl, tempDir).subscribe({
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
        const { tempDir, remoteUrl, remoteName } = req.body;
        // add the remote
        const executedCommands = [];
        const addRemoteParams = {
            url_to_remote_repo: remoteUrl,
            name_of_git_remote: remoteName,
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
    // Use server.listen instead of app.listen to allow WebSocket connections
    server.listen(port, () => {
        console.log(`git-diff-llm server is running at http://localhost:${port}`);
    });
}
startWebServer();
// npm run tsc && node dist/core/ws.js
//# sourceMappingURL=ws.js.map