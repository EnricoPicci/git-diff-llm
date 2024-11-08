"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchGenerateReport = launchGenerateReport;
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const observable_fs_1 = require("observable-fs");
const cloc_git_diff_rel_between_tag_branch_commit_1 = require("../internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit");
const message_writer_1 = require("../internals/message-writer/message-writer");
const prompt_templates_1 = require("../internals/prompt-templates/prompt-templates");
const GitRemoteNameForSecondRepo = 'git-diff-llm-remote-name';
function launchGenerateReport(webSocket, data) {
    // the client must provide these data - some properties must be undefined but this is the structure expected from the client
    const projectDir = data.tempDir;
    const url_to_repo = data.url_to_repo;
    const from_tag_branch_commit = data.from_tag_branch_commit;
    const to_tag_branch_commit = data.to_tag_branch_commit;
    const languages = data.languages.split(',').map((lang) => lang.trim());
    const url_to_second_repo = data.url_to_second_repo;
    const is_second_repo_used_as_from_repo = data.is_second_repo_used_as_from_repo;
    const is_second_repo_used_as_to_repo = data.is_second_repo_used_as_to_repo;
    const use_ssh = data.use_ssh;
    const llmModel = data.llmModel;
    const outputDirName = data.outputDirName;
    const promptFromClient = data.prompt;
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
            throw errMsg;
        }
    }
    const comparisonParams = {
        projectDir,
        url_to_repo,
        from_tag_branch_commit: from,
        to_tag_branch_commit: to,
        use_ssh
    };
    const promptTemplates = (0, prompt_templates_1.getDefaultPromptTemplates)();
    promptTemplates.changedFile.prompt = promptFromClient;
    const inputParams = {
        comparisonParams: comparisonParams,
        promptTemplates: promptTemplates,
        outdir: path_1.default.join(projectDir, outputDirName),
        llmModel,
        languages
    };
    console.log('Generating report with params:', inputParams);
    const messageWriterToRemoteClient = {
        write: (msg) => {
            console.log(`Message to client: ${JSON.stringify(msg)}`);
            webSocket.send(JSON.stringify(msg));
        }
    };
    (0, cloc_git_diff_rel_between_tag_branch_commit_1.writeAllDiffsForProjectWithExplanationToMarkdown$)(inputParams, messageWriterToRemoteClient).pipe((0, rxjs_1.concatMap)(({ markdownFilePath }) => {
        return (0, observable_fs_1.readLinesObs)(markdownFilePath);
    })).subscribe({
        next: lines => {
            const mdContent = lines.join('\n');
            const msg = (0, message_writer_1.newInfoMessage)(mdContent);
            msg.id = 'report-generated';
            messageWriterToRemoteClient.write(msg);
        },
        error: (err) => {
            console.error(`Error generating report: ${err}`);
            webSocket.send(JSON.stringify({ messageId: 'error', data: err }));
        },
    });
}
//# sourceMappingURL=launch-report.js.map