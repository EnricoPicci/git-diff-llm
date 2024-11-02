import { expect } from 'chai';
import { getRemotes$ } from './git-remotes';

describe(`getRemotes$`, () => {
    it(`should return remotes of the local repo of this project`, (done) => {
        let count = 0;
        const repoPath = './';
        getRemotes$(repoPath).subscribe({
            next: (remotes) => {
                count++;
                expect(remotes).to.be.an('array');
                expect(remotes.length).to.be.greaterThan(0);
            },
            error: (err) => {
                done(err)
            },
            complete: () => {
                expect(count).equal(1, 'should have only one next');
                done();
            }
        })
    });

});