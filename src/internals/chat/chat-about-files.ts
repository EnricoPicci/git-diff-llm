
import path from "path"
import fs from "fs"

import { catchError, concatMap, EMPTY, forkJoin, map, of } from "rxjs"

import { appendFileObs } from "observable-fs"

import { getDiffsFromStore, getFileNamesFromDiffs } from "../cloc-git/cloc-git-diff-rel-between-tag-branch-commit"
import { DefaultMessageWriter, MessageWriter, newErrorMessage, newInfoMessage } from "../message-writer/message-writer"
import { FullCompletionReponse, getFullCompletion$ } from "../openai/openai"

export type ChatAboutFilesParams = {
    llmModel: string,
    question: string,
    languages: string,
    diffsKey: string,
}

export function chatAboutFilesAndWriteChat$(
    input: ChatAboutFilesParams,
    projectDir: string,
    outputDirName: string,
    executedCommands: string[],
    messageWriter: MessageWriter = DefaultMessageWriter
) {
    const promptForChat = buildFullPromptToIdentifyFiles(input)
    return appendFileObs(path.join(projectDir, outputDirName, 'chat-about-files-log.txt'), `Full prompt: ${promptForChat}\n`).pipe(
        // identify the files the question refers to
        concatMap(() => {
            return identifyFiles$(input, executedCommands, messageWriter)
        }),
        // log the chat
        concatMap((response) => {
            return logChat$(response, input, projectDir, outputDirName)
        }),
        // Split the response into a list of files and update the client of the reasoning step
        map((explanation) => {
            const responseString = explanation.trim()
            const filesIdentified = responseString.length === 0 ? [] : responseString.split(',').map(f => f.trim())
            if (filesIdentified.length > 0) {
                const msgText = `Files identified: ${filesIdentified.join(', ')}`
                const msg = newInfoMessage(msgText)
                msg.id = 'chat-reasoning'
                messageWriter.write(msg)
            }
            return filesIdentified
        }),
        // ask the question with the identified files
        concatMap((filesIdentified) => {
            if (filesIdentified.length === 0) {
                const msgText = `We have not been able to identify any file the question refers to. Please, provide more context or rephrase the question.`
                const msg = newInfoMessage(msgText)
                // 'chat' is the id of a message that represents the response and not a reasoning step
                msg.id = 'chat'
                messageWriter.write(msg)
                // const resp: FullCompletionReponse = { explanation: msgText, prompt: '' }
                // return of(resp)
                return EMPTY
            }
            return askQuestionAboutFiles$(input, filesIdentified, executedCommands, messageWriter)
        }),
        // log the chat
        concatMap((response) => {
            return logChat$(response, input, projectDir, outputDirName)
        }),
        // Send the response to the client
        map((explanation) => {
            const responseString = explanation.trim()
            const msg = newInfoMessage(responseString)
            msg.id = 'chat'
            messageWriter.write(msg)
            return responseString
        }),
        catchError(err => {
            const errMsg = `===>>> Error chatting about files - ${err.message}`
            console.log(errMsg)
            executedCommands.push(errMsg)
            const _errMsg = newErrorMessage(errMsg)
            messageWriter.write(_errMsg)
            return of(errMsg)
        })
    )
}


// IDENTIFY THE FILES
export function identifyFiles$(
    input: ChatAboutFilesParams, 
    executedCommands: string[], 
    messageWriter: MessageWriter = DefaultMessageWriter
) {
    const promptForChat = buildFullPromptToIdentifyFiles(input)
    const llmModel = input.llmModel

    const msgText = `Trying to identify which are the files the question refers to`
    const msg = newInfoMessage(msgText)
    messageWriter.write(msg)
    return getFullCompletion$(promptForChat, llmModel).pipe(
        catchError(err => {
            const errMsg = `===>>> Error chatting with LLM about files with diffs - ${err.message}`
            console.log(errMsg)
            executedCommands.push(errMsg)
            const _errMsg = newErrorMessage(errMsg)
            messageWriter.write(_errMsg)
            if (err.explanation) {
                const resp: FullCompletionReponse = { explanation: err.explanation, prompt: promptForChat }
                return of(resp)
            }
            const resp: FullCompletionReponse = { explanation: `error in chatting with LLM about files with diffs.\n${err.message}`, prompt: promptForChat }
            return of(resp)
        }),
    )
}

function buildFullPromptToIdentifyFiles(
    input: ChatAboutFilesParams,
) {
    const question = input.question
    const diffsStoreKey = input.diffsKey
    const diffs = getDiffsFromStore(diffsStoreKey)?.diffs
    if (!diffs) {
        throw new Error(`No diffs found for key: ${diffsStoreKey}`)
    }
    const fileNames = getFileNamesFromDiffs(diffs)

    // create the path to the prompts directory this way so that it can work also when the code is packaged
    // and used, for instance, with npx
    const promptsDir = path.join(__dirname, "..", "..", "..", "prompts");
    const promptTemplate = fs.readFileSync(path.join(promptsDir, 'identify-files-template.txt'), 'utf-8')

    // check that the expected placeholders are in the prompt
    const promptPlaceholders = ['{{question}}', '{{files}}']
    promptPlaceholders.forEach(placeholder => {
        if (!promptTemplate.includes(placeholder)) {
            const errMsg = `Prompt does not include placeholder: ${placeholder}`
            throw new Error(errMsg)
        }
    })

    const prompt = promptTemplate.replaceAll('{{question}}', question).replaceAll('{{files}}', fileNames.join('\n'))
    if (prompt.includes('{{')) {
        throw new Error(`Prompt still includes placeholders: ${prompt}`)
    }
    return prompt
}


// ASK THE QUESTION ABOUT THE FILES
export function askQuestionAboutFiles$(
    input: ChatAboutFilesParams,
    filesIdentified: string[],
    executedCommands: string[], 
    messageWriter: MessageWriter = DefaultMessageWriter
) {
    const promptForChat = buildFullPromptToAskQuestion(input, filesIdentified)
    const llmModel = input.llmModel

    const msgText = `Asking the question about the files identified`
    const msg = newInfoMessage(msgText)
    messageWriter.write(msg)
    return getFullCompletion$(promptForChat, llmModel).pipe(
        catchError(err => {
            const errMsg = `===>>> Error asking the LLM about files with diffs - ${err.message}`
            console.log(errMsg)
            executedCommands.push(errMsg)
            const _errMsg = newErrorMessage(errMsg)
            messageWriter.write(_errMsg)
            if (err.explanation) {
                const resp: FullCompletionReponse = { explanation: err.explanation, prompt: promptForChat }
                return of(resp)
            }
            const resp: FullCompletionReponse = { explanation: `error asking the LLM about files with diffs.\n${err.message}`, prompt: promptForChat }
            return of(resp)
        }),
    )
}

function buildFullPromptToAskQuestion(
    input: ChatAboutFilesParams,
    filesIdentified: string[]
) {
    const question = input.question
    const languages = input.languages
    const diffsStoreKey = input.diffsKey
    const diffs = getDiffsFromStore(diffsStoreKey)?.diffs
    if (!diffs) {
        throw new Error(`No diffs found for key: ${diffsStoreKey}`)
    }
    
    // for each of the file identified append a string with the file name and the diff and the file content
    const filesStringForPrompt = filesIdentified.reduce((_filesStringForPrompt, fileName) => {
        // each file can have multiple diffs, one for each commit
        const diffsForFile = diffs.filter(diff => diff.File === fileName)
        const diff = diffsForFile.map(d => d.diffLines).join('\n\n')
        const fileContent = diffs.find(d => d.File === fileName)?.fileContent || ''
        const fileString = `FILE NAME: ${fileName}\n\n*DIFFS*\n${diff}\n\n*CONTENT*\n${fileContent}`
        _filesStringForPrompt += fileString
        return _filesStringForPrompt
    }, '')

    // create the path to the prompts directory this way so that it can work also when the code is packaged
    // and used, for instance, with npx
    const promptsDir = path.join(__dirname, "..", "..", "..", "prompts");
    const promptTemplate = fs.readFileSync(path.join(promptsDir, 'chat-about-files-template.txt'), 'utf-8')

    // check that the expected placeholders are in the prompt
    const promptPlaceholders = ['{{languages}}', '{{question}}', '{{files}}']
    promptPlaceholders.forEach(placeholder => {
        if (!promptTemplate.includes(placeholder)) {
            const errMsg = `Prompt does not include placeholder: ${placeholder}`
            throw new Error(errMsg)
        }
    })

    const prompt = promptTemplate
        .replaceAll('{{question}}', question)
        .replaceAll('{{files}}', filesStringForPrompt)
        .replaceAll('{{languages}}', languages)
    if (prompt.includes('{{')) {
        throw new Error(`Prompt still includes placeholders: ${prompt}`)
    }
    return prompt
}

// // CONVERT A STRING TO A LIST OF FILES
// export function transformStringToFileList$(
//     input: string, 
//     llmModel: string,
//     executedCommands: string[], 
//     messageWriter: MessageWriter = DefaultMessageWriter
// ) {
//     const promptForChat = buildFullPromptToTransformStringIntoListOfFiles(input)

//     const msgText = `Trying to transform this string "${input}" into a list of files`
//     const msg = newInfoMessage(msgText)
//     messageWriter.write(msg)
//     return getFullCompletion$(promptForChat, llmModel).pipe(
//         catchError(err => {
//             const errMsg = `===>>> Error transforming a string into a list of files - ${err.message}`
//             console.log(errMsg)
//             executedCommands.push(errMsg)
//             const _errMsg = newErrorMessage(errMsg)
//             messageWriter.write(_errMsg)
//             if (err.explanation) {
//                 const resp: FullCompletionReponse = { explanation: err.explanation, prompt: promptForChat }
//                 return of(resp)
//             }
//             const resp: FullCompletionReponse = { explanation: `Error transforming a string into a list of files.\n${err.message}`, prompt: promptForChat }
//             return of(resp)
//         }),
//     )
// }


// function buildFullPromptToTransformStringIntoListOfFiles(
//     input: string,
// ) {
//     // create the path to the prompts directory this way so that it can work also when the code is packaged
//     // and used, for instance, with npx
//     const promptsDir = path.join(__dirname, "..", "..", "..", "prompts");
//     const promptTemplate = fs.readFileSync(path.join(promptsDir, 'transform-string-to-file-list.txt'), 'utf-8')

//     // check that the expected placeholders are in the prompt
//     const promptPlaceholders = ['{{string}}']
//     promptPlaceholders.forEach(placeholder => {
//         if (!promptTemplate.includes(placeholder)) {
//             const errMsg = `Prompt does not include placeholder: ${placeholder}`
//             throw new Error(errMsg)
//         }
//     })

//     return promptTemplate.replaceAll('{{string}}', input)
// }

// log the chat
function logChat$(response: FullCompletionReponse, input: ChatAboutFilesParams, projectDir: string, outputDirName: string) {
    const qAndA = `Q: ${input.question}\nA: ${response.explanation}\n\n\n`
    const appentToChat$ = appendFileObs(path.join(projectDir, outputDirName, 'chat-about-files.txt'), qAndA)
    const promptForChat = `Response: ${response.explanation}\n\n\n`
    const appendToChatLog$ = appendFileObs(path.join(projectDir, outputDirName, 'chat-about-files-log.txt'), promptForChat)
    return forkJoin([appentToChat$, appendToChatLog$]).pipe(
        map(() => {
            return response.explanation
        })
    )
}