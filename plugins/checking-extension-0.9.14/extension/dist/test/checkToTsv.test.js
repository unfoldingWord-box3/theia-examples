"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const resourceUtils_1 = require("../utilities/resourceUtils");
// @ts-ignore
const fs = __importStar(require("fs-extra"));
const assert = __importStar(require("assert"));
const path = __importStar(require("path"));
// @ts-ignore
const ospath = __importStar(require("ospath"));
// @ts-ignore
const lodash_clonedeep_1 = __importDefault(require("lodash.clonedeep"));
// @ts-ignore
const deep_equal_1 = __importDefault(require("deep-equal"));
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = __importStar(require("vscode"));
// import * as myExtension from '../extension';
const TEST_FILE = './src/test/fixtures/tit.twl_check';
function autoDetectProjectFolder() {
    const home = ospath.home();
    let projectFolder = path.join(__dirname, '../..');
    if (!fs.existsSync(path.join(projectFolder, TEST_FILE))) { // check relative to test folder
        projectFolder = path.join(__dirname, '..');
        if (!fs.existsSync(path.join(projectFolder, TEST_FILE))) { // check relative to parent folder
            projectFolder = home;
            if (!fs.existsSync(path.join(projectFolder, TEST_FILE))) { // check relative to home folder
                projectFolder = '.'; // try to use current
            }
        }
    }
    return projectFolder;
}
const projectFolder = autoDetectProjectFolder();
// to run unit tests in debugger set path to project relative to home
// const projectFolder = path.join(home, 'Development/VsCode/checking-extension')
// to run unit tests regularly, just use `.`
const files = fs.readdirSync(projectFolder);
console.log(files);
suite('Test twl_check to twl selections tsv', () => {
    suiteTeardown(() => {
        vscode.window.showInformationMessage('All Test twl_check to twl selections tsv!');
    });
    test('Test Titus', () => {
        const checkData = fs.readJsonSync(path.join(projectFolder, './src/test/fixtures/tit.twl_check'));
        assert.ok(checkData);
        const groupData = (0, resourceUtils_1.flattenGroupData)(checkData);
        fs.outputJsonSync(path.join(projectFolder, './testResults_twl.json'), groupData, { spaces: 2 });
        assert.ok(Object.keys(groupData).length > 5);
        const results = (0, resourceUtils_1.checkDataToTwl)(groupData);
        assert.ok(results);
        fs.outputFileSync(path.join(projectFolder, './testResults_twl.tsv'), results, 'UTF-8');
    });
    test('Test Titus remap refs', () => {
        const targetBookUsfm = fs.readFileSync(path.join(projectFolder, './src/test/fixtures/es-419-gst-tit.usfm'), "UTF-8")?.toString() || '';
        assert.ok(targetBookUsfm);
        const targetBook = (0, resourceUtils_1.getParsedUSFM)(targetBookUsfm);
        const checkData = fs.readJsonSync(path.join(projectFolder, './src/test/fixtures/tit.tn_check'));
        assert.ok(checkData);
        const originalData = (0, lodash_clonedeep_1.default)(checkData);
        const bookId = 'tit';
        (0, resourceUtils_1.reMapGlVerseRefsToTarget_)(checkData, bookId, targetBook.chapters);
        fs.outputJsonSync(path.join(projectFolder, './testResults.tn_check.json'), checkData, { spaces: 2 });
        assert.ok(!(0, deep_equal_1.default)(checkData, originalData));
    });
});
suite('Test import twl selections tsv to twl_check', () => {
    suiteTeardown(() => {
        vscode.window.showInformationMessage('Test twl selections tsv to twl_check!');
    });
    test('Test Titus import identical selections should not change', async () => {
        const checkData = fs.readJsonSync(path.join(projectFolder, './src/test/fixtures/tit.twl_check'));
        assert.ok(checkData);
        const originalCheckData = (0, lodash_clonedeep_1.default)(checkData);
        const selectionData = fs.readFileSync(path.join(projectFolder, './testResults_twl.tsv'), "UTF-8")?.toString() || '';
        assert.ok(selectionData);
        const { tsvItems } = (0, resourceUtils_1.tsvToObjects)(selectionData);
        assert.ok(tsvItems.length);
        const { updatedCount, errors, importedLines } = (0, resourceUtils_1.importSelectionsDataIntoCheckData)(tsvItems, checkData);
        const sameData = (0, deep_equal_1.default)(checkData, originalCheckData);
        assert.ok(sameData);
        assert.equal(updatedCount, 3);
        assert.equal(errors?.length, 0);
        assert.equal(importedLines, 188);
    });
    test('Test Titus import change one selection', async () => {
        const checkData = fs.readJsonSync(path.join(projectFolder, './src/test/fixtures/tit.twl_check'));
        assert.ok(checkData);
        const originalCheckData = (0, lodash_clonedeep_1.default)(checkData);
        const selectionData = fs.readFileSync(path.join(projectFolder, './testResults_twl.tsv'), "UTF-8")?.toString() || '';
        assert.ok(selectionData);
        const { tsvItems } = (0, resourceUtils_1.tsvToObjects)(selectionData);
        assert.ok(tsvItems.length);
        const modifiedTsvItem = tsvItems[1];
        const newSelection = 'Christ';
        modifiedTsvItem.selections = JSON.stringify(newSelection);
        const { updatedCount, errors, importedLines } = (0, resourceUtils_1.importSelectionsDataIntoCheckData)(tsvItems, checkData);
        const sameData = (0, deep_equal_1.default)(checkData, originalCheckData);
        assert.ok(!sameData);
        assert.equal(updatedCount, 4);
        assert.equal(errors?.length, 0);
        assert.equal(importedLines, 188);
        const changedItem = checkData['kt'].groups['christ'][0];
        assert.equal(changedItem.selections, newSelection);
    });
    test('Test Titus import unmatched item', async () => {
        const checkData = fs.readJsonSync(path.join(projectFolder, './src/test/fixtures/tit.twl_check'));
        assert.ok(checkData);
        const originalCheckData = (0, lodash_clonedeep_1.default)(checkData);
        const selectionData = fs.readFileSync(path.join(projectFolder, './testResults_twl.tsv'), "UTF-8")?.toString() || '';
        assert.ok(selectionData);
        const { tsvItems } = (0, resourceUtils_1.tsvToObjects)(selectionData);
        assert.ok(tsvItems.length);
        const modifiedTsvItem = tsvItems[1];
        modifiedTsvItem.selections = JSON.stringify('Christ');
        modifiedTsvItem.ID = 'abcd';
        const { updatedCount, errors, importedLines } = (0, resourceUtils_1.importSelectionsDataIntoCheckData)(tsvItems, checkData);
        const sameData = (0, deep_equal_1.default)(checkData, originalCheckData);
        assert.ok(sameData);
        assert.equal(updatedCount, 3);
        assert.equal(errors?.length, 1);
        assert.equal(importedLines, 188);
    });
});
suite('Test tn_check to tn selections tsv', () => {
    suiteTeardown(() => {
        vscode.window.showInformationMessage('All Test tn_check to tn selections tsv!');
    });
    test('Test Titus', () => {
        const checkData = fs.readJsonSync(path.join(projectFolder, './src/test/fixtures/tit.tn_check'));
        assert.ok(checkData);
        const groupData = (0, resourceUtils_1.flattenGroupData)(checkData);
        fs.outputJsonSync(path.join(projectFolder, './testResults_tn.json'), groupData, { spaces: 2 });
        assert.ok(Object.keys(groupData).length > 5);
        const results = (0, resourceUtils_1.checkDataToTn)(groupData);
        assert.ok(results);
        fs.outputFileSync(path.join(projectFolder, './testResults_tn.tsv'), results, 'UTF-8');
    });
    test('Test Titus import identical selections should not change', async () => {
        const checkData = fs.readJsonSync(path.join(projectFolder, './src/test/fixtures/tit.tn_check'));
        assert.ok(checkData);
        const originalCheckData = (0, lodash_clonedeep_1.default)(checkData);
        const selectionData = fs.readFileSync(path.join(projectFolder, './testResults_tn.tsv'), "UTF-8")?.toString() || '';
        assert.ok(selectionData);
        const { tsvItems } = (0, resourceUtils_1.tsvToObjects)(selectionData);
        assert.ok(tsvItems.length);
        const { updatedCount, errors, importedLines } = (0, resourceUtils_1.importSelectionsDataIntoCheckData)(tsvItems, checkData);
        const sameData = (0, deep_equal_1.default)(checkData, originalCheckData);
        assert.ok(sameData);
        assert.equal(updatedCount, 0);
        assert.equal(errors?.length, 0);
        assert.equal(importedLines, 156);
    });
    test('Test Titus import change one selection', async () => {
        const checkData = fs.readJsonSync(path.join(projectFolder, './src/test/fixtures/tit.tn_check'));
        assert.ok(checkData);
        const originalCheckData = (0, lodash_clonedeep_1.default)(checkData);
        const selectionData = fs.readFileSync(path.join(projectFolder, './testResults_tn.tsv'), "UTF-8")?.toString() || '';
        assert.ok(selectionData);
        const { tsvItems } = (0, resourceUtils_1.tsvToObjects)(selectionData);
        assert.ok(tsvItems.length);
        const modifiedTsvItem = tsvItems[1];
        const newSelection = 'Faith';
        modifiedTsvItem.selections = JSON.stringify(newSelection);
        const { updatedCount, errors, importedLines } = (0, resourceUtils_1.importSelectionsDataIntoCheckData)(tsvItems, checkData);
        const sameData = (0, deep_equal_1.default)(checkData, originalCheckData);
        assert.ok(!sameData);
        assert.equal(updatedCount, 1);
        assert.equal(errors?.length, 0);
        assert.equal(importedLines, 156);
        const changedItem = checkData['grammar'].groups['figs-abstractnouns'][0];
        assert.equal(changedItem.selections, newSelection);
    });
});
//# sourceMappingURL=checkToTsv.test.js.map