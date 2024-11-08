import path from "path";
import fs from "fs";

import { catchError, concatMap, forkJoin, map, of } from "rxjs";

import { FullCompletionReponse, getFullCompletion$ } from "../openai/openai";
import { DefaultMessageWriter, MessageWriter, newErrorMessage, newInfoMessage } from "../message-writer/message-writer";
import { appendFileObs } from "observable-fs";

export type ChatWithDiffsParams = {
    diffs: string[],
    languages: string[] | undefined,
    llmModel: string,
    prompt: string,
}
export function chatWithDiffs$(
    input: ChatWithDiffsParams,
    executedCommands: string[],
    messageWriter: MessageWriter = DefaultMessageWriter
) {
    const diffs = input.diffs
    const languages = input.languages
    const llmModel = input.llmModel
    const prompt = input.prompt

    let languageSpecilization = ''
    if (languages) {
        languageSpecilization = languages.join(', ')
    }

    const promptForChat = fillPromptForChat(prompt, diffs, languageSpecilization)

    const msgText = `Chat with LLM with all diffs`
    const msg = newInfoMessage(msgText)
    messageWriter.write(msg)
    return getFullCompletion$(promptForChat, llmModel).pipe(
        catchError(err => {
            const errMsg = `===>>> Error chatting with LLM with all diffs - ${err.message}`
            console.log(errMsg)
            executedCommands.push(errMsg)
            const _errMsg = newErrorMessage(errMsg)
            messageWriter.write(_errMsg)
            if (err.explanation) {
                const resp: FullCompletionReponse = { explanation: err.explanation, prompt: promptForChat }
                return of(resp)
            }
            const resp: FullCompletionReponse = { explanation: `error in chatting with LLM about diffs.\n${err.message}`, prompt: promptForChat }
            return of(resp)
        }),
    )
}

export function chatWithDiffsAndWriteChat$(
    input: ChatWithDiffsParams,
    projectDir: string,
    outputDirName: string,
    executedCommands: string[],
    messageWriter: MessageWriter = DefaultMessageWriter
) {
    const outDir = path.join(projectDir, outputDirName)
    return chatWithDiffs$(input, executedCommands, messageWriter).pipe(
        concatMap((response) => {
            const qAndA = `Q: ${input.prompt}\nA: ${response.explanation}\n\n\n`
            const appentToChat$ = appendFileObs(path.join(outDir, 'chat.txt'), qAndA)
            const fullLogEntry = `Full prompt: ${response.prompt}\nResponse: ${response.explanation}\n\n\n`
            const appendToChatLog$ = appendFileObs(path.join(outDir, 'chat-log.txt'), fullLogEntry)
            return forkJoin([appentToChat$, appendToChatLog$]).pipe(
                map(() => {
                    return response.explanation
                })
            )
        }),
    )
}


function fillPromptForChat(prompt: string, diffs: string[], languageSpecilization: string): string {
    // create the path to the prompts directory this way so that it can work also when the code is packaged
    // and used, for instance, with npx
    const promptsDir = path.join(__dirname, "..", "..", "..", "prompts");
    const chatPromptTemplate = fs.readFileSync(path.join(promptsDir, 'chat-template.txt'), 'utf-8')
    return chatPromptTemplate.replace(/{{diffs}}/g, diffs.join('\n'))
        .replace(/{{languages}}/g, languageSpecilization)
        .replace(/{{prompt}}/g, prompt)
}