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
const archiver_1 = __importDefault(require("archiver"));
const git_clone_1 = require("../internals/git/git-clone");
const git_list_tags_branches_commits_1 = require("../internals/git/git-list-tags-branches-commits");
const git_remote_1 = require("../internals/git/git-remote");
const cloc_git_diff_rel_between_tag_branch_commit_1 = require("../internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit");
const observable_fs_1 = require("observable-fs");
const rxjs_1 = require("rxjs");
const console_1 = require("console");
const path_1 = __importDefault(require("path"));
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
    // WebSocket connection
    const actions = {
        "generate-report": launchGenerateReport
    };
    wss.on('connection', (ws) => {
        console.log('New client connected');
        ws.on('message', (messageData) => {
            console.log(`Received message: ${messageData}`);
            const message = JSON.parse(messageData.toString());
            const action = message.action;
            const actionFunction = actions[action];
            // const actionFunction: any = actions[action];
            actionFunction(wss, message.data);
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
            url_to_repo: remoteUrl,
            git_remote_name: remoteName,
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
    });
}
const GitRemoteNameForSecondRepo = 'git-diff-llm';
function launchGenerateReport(webSocket, data) {
    // the client must provide these data - some properties must be undefined but this is the structure expected from the client
    const projectDir = data.tempDir;
    const url_to_repo = data.url_to_repo;
    const from_tag_branch_commit = data.from_tag_branch_commit;
    const to_tag_branch_commit = data.to_tag_branch_commit;
    const languages = data.languages.split(',');
    const url_to_second_repo = data.url_to_second_repo;
    const is_second_repo_used_as_from_repo = data.is_second_repo_used_as_from_repo;
    const is_second_repo_used_as_to_repo = data.is_second_repo_used_as_to_repo;
    const use_ssh = data.use_ssh;
    const llmModel = data.llmModel;
    // first we set the values of from_tag_branch_commit and to_tag_branch_commit to the values they would have
    // if no url_to_second_repo is sent
    const from = {
        url_to_repo,
        git_remote_name: 'origin',
        tag_branch_commit: from_tag_branch_commit
    };
    const to = {
        url_to_repo,
        git_remote_name: 'origin',
        tag_branch_commit: to_tag_branch_commit
    };
    // if url_to_second_repo is defined, it means that the client has specified a second repo to compare with
    if (url_to_second_repo) {
        if (is_second_repo_used_as_from_repo) {
            from.url_to_repo = url_to_second_repo;
            from.git_remote_name = GitRemoteNameForSecondRepo;
        }
        else if (is_second_repo_used_as_to_repo) {
            to.url_to_repo = url_to_second_repo;
            to.git_remote_name = GitRemoteNameForSecondRepo;
        }
        else {
            const errMsg = `"url_to_second_repo" set but neither "is_url_to_second_repo_from" nor "is_url_to_second_repo_to" are set to true. 
Data received:
${JSON.stringify(data, null, 2)}`;
            throw (0, console_1.error)(errMsg);
        }
    }
    const comparisonParams = {
        projectDir,
        url_to_repo,
        from_tag_branch_commit: from,
        to_tag_branch_commit: to,
        use_ssh
    };
    const inputParams = {
        comparisonParams: comparisonParams,
        promptTemplates: data.promptTemplates,
        outdir: path_1.default.join(projectDir, outputDirName),
        llmModel,
        languages
    };
    console.log('Generating report with params:', inputParams);
    const messageWriterToRemoteClient = {
        write: (msg) => {
            console.log(`Message to client: ${JSON.stringify(msg)}`);
            webSocket.clients.forEach(client => {
                client.send(JSON.stringify(msg));
            });
        }
    };
    (0, cloc_git_diff_rel_between_tag_branch_commit_1.writeAllDiffsForProjectWithExplanationToMarkdown$)(inputParams, messageWriterToRemoteClient).pipe((0, rxjs_1.concatMap)(({ markdownFilePath }) => {
        return (0, observable_fs_1.readLinesObs)(markdownFilePath);
    }), (0, rxjs_1.tap)({
        next: lines => {
            const mdContent = lines.join('\n');
            webSocket.clients.forEach(client => {
                client.send(JSON.stringify({ messageId: 'report-generated', mdReport: mdContent }));
            });
        }
    })).subscribe({
        error: (err) => {
            console.error(`Error generating report: ${err}`);
            webSocket.clients.forEach(client => {
                client.send(JSON.stringify({ messageId: 'error', data: err }));
            });
        },
    });
}
// npm run tsc && node dist/lib/command.js
//# sourceMappingURL=start-web-server.js.map