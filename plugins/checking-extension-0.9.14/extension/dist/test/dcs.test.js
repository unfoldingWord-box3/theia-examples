"use strict";
// ############################
// for development of DCS
// ############################
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
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const fs = __importStar(require("fs-extra"));
const assert = __importStar(require("assert"));
const path = __importStar(require("path"));
// @ts-ignore
const ospath = __importStar(require("ospath"));
const fileUtils_1 = require("../utilities/fileUtils");
const network_1 = require("../utilities/network");
const gitUtils_1 = require("../utilities/gitUtils");
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
const envPath = path.join(projectFolder, '.env.json');
const env = (0, fileUtils_1.readJsonFile)(envPath) || {};
suite.skip('Tests', () => {
    test('Test CRC', async () => {
        const filePath = path.join(projectFolder, './src/test/fixtures/tit.tn_check');
        assert.ok(fs.existsSync(filePath));
        const checksum = await (0, fileUtils_1.getChecksum)(filePath);
        assert.equal(checksum, 'b28d94cdc04a30619fb81aabd3500eaf885824b835ecd1e061f11e69fe336225');
    });
});
const server = 'https://git.door43.org';
const token = env.TOKEN || '';
const owner = env.USER || '';
const targetLanguageId = 'pizza';
const targetBibleId = 'ult';
const glLanguageId = 'en';
const bookId = 'tit';
const repo = (0, network_1.getRepoName)(targetLanguageId, targetBibleId, glLanguageId, bookId);
const testBranchName = 'update_current';
const testProject = env.TEST_PROJECT || '';
const testRepoPath = path.join(ospath.home(), testProject);
suite.skip('Repo Tests', async () => {
    test('Test getRepoName', () => {
        const repoName = (0, network_1.getRepoName)(targetLanguageId, targetBibleId, glLanguageId, bookId);
        assert.equal(repoName, "pigeon_ult_en_tit_checking");
    });
    test('Test getRepoTree', async () => {
        const sha = 'master'; // or a specific commit SHA
        const results = await (0, gitUtils_1.getRepoTree)(server, owner, repo, sha, token);
        assert.ok(!results.error);
        assert.ok(results.tree?.length);
        console.warn(results);
    });
    test('Test createRepoBranch', async () => {
        const newBranch = testBranchName;
        const branch = await (0, gitUtils_1.createRepoBranch)(server, owner, repo, newBranch, token);
        assert.ok(!branch.error);
        assert.equal(branch.name, newBranch);
    });
    test('Test getOwners', async () => {
        const results = await (0, gitUtils_1.getOwners)(server);
        assert.ok(!results.error);
        const ownerNames = results?.owners?.map(owner => owner.login) || [];
        console.log(`ownerNames length ${ownerNames?.length}`, ownerNames);
        assert.ok(results.owners?.length);
    });
    test('Test getCheckingOwners', async () => {
        const owners = await (0, network_1.getCheckingOwners)(server);
        assert.ok(owners);
    });
    test('Test getReposForOwner', async () => {
        const results = await (0, gitUtils_1.getReposForOwner)(server, owner);
        assert.ok(!results.error);
        const repoNames = results?.repos?.map(repo => repo.name) || [];
        console.log(`repoNames length ${repoNames?.length}`, repoNames);
        assert.ok(results.repos?.length);
    });
    test('Test getCheckingReposForOwner', async () => {
        const results = await (0, network_1.getCheckingReposForOwner)(server, owner);
        assert.ok(!results.error);
        const repoNames = results?.repos?.map(repo => repo.name) || [];
        console.log(`repoNames length ${repoNames?.length}`, repoNames);
        // assert.ok(results.repos?.length)
    });
    test('Test downloadPublicRepoFromBranch', async () => {
        const branch = 'master';
        const repo = env.REPO || '';
        const results = await (0, network_1.downloadPublicRepoFromBranch)(testRepoPath, server, owner, repo, branch);
        assert.ok(!results.error);
    });
    test('Test downloadRepoFromDCS', async () => {
        const repo = 'es-419_glt_en_3jn_checking';
        const results = await (0, network_1.downloadRepoFromDCS)(server, owner, repo, true);
        assert.ok(!results.error);
    });
    test('Test addTopicToRepo', async () => {
        const topic = network_1.bibleCheckingTopic;
        const repo = env.REPO || '';
        const results = await (0, gitUtils_1.addTopicToRepo)(server, owner, repo, topic, token);
        assert.ok(!results.error);
    });
    test('Test searchCatalogByTopic', async () => {
        const topic = network_1.bibleCheckingTopic;
        const repo = env.REPO || '';
        const results = await (0, gitUtils_1.searchCatalogByTopic)(server, topic);
        assert.ok(!results.error);
    });
    test('Test getCheckingRepos', async () => {
        const repo = env.REPO || '';
        const results = await (0, gitUtils_1.getCheckingRepos)(server);
        assert.ok(!results.error);
        const repos = results?.repos || [];
        const owners = (0, network_1.getOwnersFromRepoList)(repos);
        console.log(owners);
        const filteredRepos = (0, network_1.getOwnerReposFromRepoList)(repos, owner);
        const repoNames = filteredRepos.map(repo => repo.name).sort();
        console.log(repoNames);
    });
    test('Test createRepoFile', async () => {
        const branch = testBranchName;
        const filePath = path.join(projectFolder, './src/test/fixtures/tit.tn_check');
        const branchFilePath = 'fixtures/tit.tn_check';
        const results = await (0, gitUtils_1.uploadRepoFileFromPath)(server, owner, repo, branch, branchFilePath, filePath, token);
        assert.ok(!results.error);
        assert.ok(results.content.html_url);
        assert.equal(results.content.name, branchFilePath);
    });
    test('Test getAllFiles', async () => {
        const files = (0, fileUtils_1.getAllFiles)(testRepoPath);
        assert.ok(files.length);
        for (const file of files) {
            const fullFilePath = path.join(testRepoPath, file);
            assert.ok(fs.existsSync(fullFilePath));
        }
    });
    test('Test getChangedFiles', async () => {
        const results = await (0, gitUtils_1.getChangedFiles)(server, owner, repo, 8, token);
        console.log(results);
    });
    test('Test updateFilesInDCS', async () => {
        const state = {};
        const results = await (0, network_1.updateContentOnDCS)(server, owner, repo, token, testRepoPath, state);
        console.log(results);
    });
    test('Test uploadRepoToDCS', async () => {
        const results = await (0, network_1.uploadRepoToDCS)(server, owner, repo, token, testRepoPath);
        console.log(results);
    });
    test.skip('Test createRepository', async () => {
        const results = await (0, gitUtils_1.createCheckingRepository)(server, owner, repo, token);
        assert.ok(!results.error);
        assert.equal(results.name, repo);
    });
});
//# sourceMappingURL=dcs.test.js.map