"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const convert_ssh_https_url_1 = require("./convert-ssh-https-url");
describe(`convertHttpsToSshUrl`, () => {
    it(`should return the ssh url from an https url`, () => {
        const httpsUrl = 'https://abc.corp.com/group/subgroup/project.git';
        const expectedSshUrl = 'git@abc.corp.com:group/subgroup/project.git';
        const sshUrl = (0, convert_ssh_https_url_1.convertHttpsToSshUrl)(httpsUrl);
        (0, chai_1.expect)(sshUrl).equal(expectedSshUrl);
    });
});
//# sourceMappingURL=convert-ssh-https-url.spec.js.map