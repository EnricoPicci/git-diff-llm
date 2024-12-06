import { catchError, from, map, of } from "rxjs";
import { OpenAI } from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources";

const apiKey = process.env.OPENAI_API_KEY; // Store your API key in environment variables
const client = new OpenAI({
    apiKey
});

export type FullCompletionReponse = {
    explanation: string,
    prompt: string
}

export function getFullCompletion$(prompt: string, llmModel: string, temperature = 0) {
    const params: ChatCompletionCreateParamsNonStreaming = {
        messages: [{ role: 'user', content: prompt }],
        model: llmModel,
        temperature,
    };
    if (llmModel === 'o1-mini') {
        // remove the temperature parameter for the o1-mini model
        delete params.temperature;
    }
    const _completion = client.chat.completions.create(params);

    return from(_completion).pipe(
        map((completion) => {
            const _explanation = completion.choices[0].message.content || 'no explanation received';
            const resp: FullCompletionReponse = { explanation: _explanation, prompt };
            return resp;
        }),
        catchError(err => {
            console.log(`Error in getFullCompletion$: ${err.message}`);
            const resp: FullCompletionReponse = { explanation: `error in chatting with LLM.\n${err.message}`, prompt };
            return  of(resp);
        })
    )
}
