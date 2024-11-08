import { expect } from 'chai';
import { getFullCompletion$ } from './openai';
import { tap } from 'rxjs';

describe(`getFullCompletion$`, () => {
    it(`should fetch a full completion`, (done) => {
        const prompt = "Say this is a test";
        const model = 'gpt-3.5-turbo';
        const temperature = 0.7;
        getFullCompletion$(prompt, model, temperature).pipe(
            tap({
                next: (completion) => {
                    expect(completion.explanation).to.be.a('string');
                    expect(completion.prompt).to.be.a('string');
                },
                error: (error) => {
                    done(error);
                },
                complete: () => done()
            })
        ).subscribe();
    }).timeout(10000);
});
