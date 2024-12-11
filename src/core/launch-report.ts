import path from "path"
import ws from 'ws';

import { concatMap, Observable, takeUntil, tap } from "rxjs"

import { readLinesObs } from "observable-fs"

import { ComparisonParams } from "../internals/cloc-git/cloc-diff-rel"
import { GenerateMdReportParams, writeAllDiffsForProjectWithExplanationToMarkdown$ } from "../internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit"
import { ComparisonEnd } from "../internals/git/git-diffs"
import { MessageWriter, newInfoMessage } from "../internals/message-writer/message-writer"
import { getDefaultPromptTemplates } from "../internals/prompt-templates/prompt-templates";


const GitRemoteNameForSecondRepo = 'git-diff-llm-remote-name'
export function launchGenerateReport(webSocket: ws.WebSocket, data: any, stop$: Observable<any>) {
  // the client must provide these data - some properties must be undefined but this is the structure expected from the client
  const projectDir = data.tempDir
  const url_to_repo = data.url_to_repo
  const from_tag_branch_commit = data.from_tag_branch_commit
  const to_tag_branch_commit = data.to_tag_branch_commit
  const languages: string[] = data.languages.split(',').map((lang: string) => lang.trim());
  const url_to_second_repo = data.url_to_second_repo
  const is_second_repo_used_as_from_repo = data.is_second_repo_used_as_from_repo
  const is_second_repo_used_as_to_repo = data.is_second_repo_used_as_to_repo
  const use_ssh = data.use_ssh
  const llmModel = data.llmModel
  const diffsKey = data.diffsKey
  const outputDirName = data.outputDirName
  const promptFromClient = data.prompt

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
  const promptTemplates = getDefaultPromptTemplates();
  promptTemplates.changedFile.prompt = promptFromClient;

  const inputParams: GenerateMdReportParams = {
    comparisonParams: comparisonParams,
    promptTemplates: promptTemplates,
    outdir: path.join(projectDir, outputDirName),
    diffsKey,
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
    // the processing is terminated when the observable stop$ emits a value
    takeUntil(stop$.pipe(
      tap(() => {
        console.log('Stopping the report generation');
      })
    ))
  ).subscribe({
      next: lines => {
        const mdContent = lines.join('\n');
        const msg = newInfoMessage(mdContent)
        msg.id = 'report-generated'
        messageWriterToRemoteClient.write(msg)
      },
      error: (err) => {
        console.error(`Error generating report: ${err}`);
        webSocket.send(JSON.stringify({ messageId: 'error', data: err }));
      },
    });
}