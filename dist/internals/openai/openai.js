"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFullCompletion$ = getFullCompletion$;
const rxjs_1 = require("rxjs");
const openai_1 = require("openai");
const apiKey = process.env.OPENAI_API_KEY; // Store your API key in environment variables
const client = new openai_1.OpenAI({
    apiKey
});
function getFullCompletion$(prompt, llmModel, temperature = 0) {
    const params = {
        messages: [{ role: 'user', content: prompt }],
        model: llmModel,
        temperature,
    };
    if (llmModel === 'o1-mini') {
        // remove the temperature parameter for the o1-mini model
        delete params.temperature;
    }
    const _completion = client.chat.completions.create(params);
    return (0, rxjs_1.from)(_completion).pipe((0, rxjs_1.map)((completion) => {
        const _explanation = completion.choices[0].message.content || 'no explanation received';
        const resp = { explanation: _explanation, prompt };
        return resp;
    }), (0, rxjs_1.catchError)(err => {
        console.log(`Error in getFullCompletion$: ${err.message}`);
        const resp = { explanation: `error in chatting with LLM.\n${err.message}`, prompt };
        return (0, rxjs_1.of)(resp);
    }));
}
//# sourceMappingURL=openai.js.map