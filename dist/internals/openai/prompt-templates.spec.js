"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const prompt_templates_1 = require("./prompt-templates");
describe(`fillPromptTemplate`, () => {
    it(`should fill the prompt template`, () => {
        const template = "Hello, {{name}}! I am {{age}} years old.";
        const templateData = {
            name: "John",
            age: 30
        };
        const expectedFilledTemplate = "Hello, John! I am 30 years old.";
        const templateFilled = (0, prompt_templates_1.fillPromptTemplate)(template, templateData);
        (0, chai_1.expect)(templateFilled).to.equal(expectedFilledTemplate);
    });
});
describe(`fillPromptTemplateFromFile`, () => {
    it(`should fill the prompt template read from a file`, () => {
        const _cwd = process.cwd();
        const templateFile = "/prompts/explain-diff.txt";
        const templateFileFullPath = `${_cwd}${templateFile}`;
        const templateData = {
            language: "Java",
            fileName: "my-file.java",
            fileContent: "public class MyClass { }",
            diffs: "Come diffs from git diff command"
        };
        const templateFilled = (0, prompt_templates_1.fillPromptTemplateFromFile)(templateFileFullPath, templateData);
        (0, chai_1.expect)(templateFilled.includes(templateData.fileName)).to.be.true;
        (0, chai_1.expect)(templateFilled.includes(templateData.fileContent)).to.be.true;
        (0, chai_1.expect)(templateFilled.includes(templateData.diffs)).to.be.true;
    });
});
//# sourceMappingURL=prompt-templates.spec.js.map