import path from "path";
import fs from "fs";

import { catchError, of } from "rxjs";

import { getFullCompletion$ } from "../openai/openai";
import { DefaultMessageWriter, MessageWriter, newErrorMessage, newInfoMessage } from "../message-writer/message-writer";

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
            return of('error in chatting with LLM about diffs')
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