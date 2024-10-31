"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFullCompletion$ = getFullCompletion$;
const rxjs_1 = require("rxjs");
const openai_1 = require("openai");
const apiKey = process.env.OPENAI_API_KEY; // Store your API key in environment variables
const client = new openai_1.OpenAI({
    apiKey
});
function getFullCompletion$(prompt, model = 'gpt-4o', temperature = 0) {
    const _completion = client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model,
        temperature,
    });
    return (0, rxjs_1.from)(_completion).pipe((0, rxjs_1.map)((completion) => {
        const _explanation = completion.choices[0].message.content || 'no explanation received';
        return _explanation;
    }));
}
//# sourceMappingURL=openai.js.map