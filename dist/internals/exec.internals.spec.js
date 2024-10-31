"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const exec_internals_1 = require("./exec-internals");
describe(`execInternals`, () => {
    it(`should return a string`, () => {
        const result = (0, exec_internals_1.execInternals)();
        (0, chai_1.expect)(typeof result).equal(`string`);
    });
});
//# sourceMappingURL=exec.internals.spec.js.map