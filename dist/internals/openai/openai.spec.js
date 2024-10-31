"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const openai_1 = require("./openai");
const rxjs_1 = require("rxjs");
describe(`getFullCompletion$`, () => {
    it(`should fetch a full completion`, (done) => {
        const prompt = "Say this is a test";
        const model = 'gpt-3.5-turbo';
        const temperature = 0.7;
        (0, openai_1.getFullCompletion$)(prompt, model, temperature).pipe((0, rxjs_1.tap)({
            next: (completion) => {
                (0, chai_1.expect)(completion).to.be.a('string');
            },
            error: (error) => {
                done(error);
            },
            complete: () => done()
        })).subscribe();
    }).timeout(10000);
});
//# sourceMappingURL=openai.spec.js.map