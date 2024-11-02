"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const git_remotes_1 = require("./git-remotes");
describe(`getRemotes$`, () => {
    it(`should return remotes of the local repo of this project`, (done) => {
        let count = 0;
        const repoPath = './';
        (0, git_remotes_1.getRemotes$)(repoPath).subscribe({
            next: (remotes) => {
                count++;
                (0, chai_1.expect)(remotes).to.be.an('array');
                (0, chai_1.expect)(remotes.length).to.be.greaterThan(0);
            },
            error: (err) => {
                done(err);
            },
            complete: () => {
                (0, chai_1.expect)(count).equal(1, 'should have only one next');
                done();
            }
        });
    });
});
//# sourceMappingURL=git-remotes.spec.js.map