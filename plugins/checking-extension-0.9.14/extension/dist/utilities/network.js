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
Object.defineProperty(exports, "__esModule", { value: true });
exports.bibleCheckingTopic = exports.mergeFromMasterBranch = exports.mergeToMasterBranch = void 0;
exports.setStatusUpdatesCallback = setStatusUpdatesCallback;
exports.sendStatusUpdates = sendStatusUpdates;
exports.sendUpdateUploadStatus = sendUpdateUploadStatus;
exports.sendUpdateUploadErrorStatus = sendUpdateUploadErrorStatus;
exports.getOwnersFromRepoList = getOwnersFromRepoList;
exports.getOwnerReposFromRepoList = getOwnerReposFromRepoList;
exports.getCheckingOwners = getCheckingOwners;
exports.getCheckingReposForOwner = getCheckingReposForOwner;
exports.getRepoName = getRepoName;
exports.getTimeStamp = getTimeStamp;
exports.getNewBranchName = getNewBranchName;
exports.modifyRepoFileFromPath = modifyRepoFileFromPath;
exports.downloadRepoFromDCS = downloadRepoFromDCS;
exports.downloadPublicRepoFromBranch = downloadPublicRepoFromBranch;
exports.updateContentOnDCS = updateContentOnDCS;
exports.getCheckingFiles = getCheckingFiles;
exports.uploadRepoToDCS = uploadRepoToDCS;
const resourceUtils_1 = require("./resourceUtils");
// @ts-ignore
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const fileUtils_1 = require("./fileUtils");
const gitUtils_1 = require("./gitUtils");
// @ts-ignore
const tc_source_content_updater_1 = require("tc-source-content-updater");
exports.mergeToMasterBranch = 'merge_changes_to_master';
exports.mergeFromMasterBranch = 'update_from_master';
exports.bibleCheckingTopic = 'bible-checking';
let contextLines = 4;
let statusUpdatesCallBack = null;
function setStatusUpdatesCallback(callback) {
    statusUpdatesCallBack = callback;
}
function sendStatusUpdates(message) {
    statusUpdatesCallBack && statusUpdatesCallBack(message);
}
function sendUpdateUploadStatus(methodName, statusMessage) {
    console.log(`${methodName} - ${statusMessage}`);
    sendStatusUpdates(statusMessage);
}
function sendUpdateUploadErrorStatus(methodName, statusMessage) {
    console.error(`${methodName} - ${statusMessage}`);
    sendStatusUpdates(statusMessage);
}
function sortAndRemoveDuplicates(strings) {
    // Convert the list to a Set to remove duplicates
    const uniqueStrings = new Set(strings);
    // Convert the Set back to an array and sort it
    const sortedStrings = Array.from(uniqueStrings).sort();
    return sortedStrings;
}
function getOwnersFromRepoList(repos) {
    // @ts-ignore
    let owners = repos.map(repo => repo?.owner?.login);
    return sortAndRemoveDuplicates(owners);
}
function getOwnerReposFromRepoList(repos, owner) {
    // @ts-ignore
    const filteredRepos = repos.filter(repo => (repo?.owner?.login === owner));
    return filteredRepos;
}
async function getCheckingOwners(server) {
    const results = await (0, gitUtils_1.getCheckingRepos)(server);
    if (!results?.error) {
        const repos = results?.repos || [];
        const owners = getOwnersFromRepoList(repos);
        return owners;
    }
    return null;
}
const checkingRegex = /_checking$/;
async function getCheckingReposForOwner(server, owner, token = '') {
    const results = await (0, gitUtils_1.getReposForOwner)(server, owner);
    const checkingRepos = results?.repos?.filter(repo => checkingRegex.test(repo.name)) || [];
    results.repos = checkingRepos;
    return results;
}
function getRepoName(targetLanguageId, targetBibleId, glLanguageId, bookId = '') {
    let repoName = (0, resourceUtils_1.getRepoFileName)(targetLanguageId, targetBibleId, glLanguageId, bookId);
    repoName += '_checking';
    return repoName;
}
function getTimeStamp() {
    // TRICKY: macOS does not support `:` in file names, so convert them and the macOS `/` to `-`.
    const timestamp = (new Date()).toISOString().replace(/[:/]/g, "_");
    return timestamp;
}
function getNewBranchName(targetLanguageId, targetBibleId, glLanguageId, bookId = '') {
    const branchName = `update_${getTimeStamp()}`;
    return branchName;
}
function getContextLines() {
    return contextLines;
}
function incrementContextLines() {
    contextLines++;
    if (contextLines > 7) {
        contextLines = 2;
    }
}
async function modifyRepoFileFromPath(server, owner, repo, branch, uploadPath, sourceFilePath, token, sha, downloadAndDiff = false, completedStr = '') {
    let results;
    let forcedUpload = false;
    if (!downloadAndDiff) {
        forcedUpload = true;
    }
    else {
        forcedUpload = false;
        //  https://git.door43.org/unfoldingWord/en_ult/raw/branch/auto-pjoakes-TIT/manifest.yaml
        // const fileData = await getFileFromBranch(server, owner, repo, branch, uploadPath, token);
        const importsFolder = path.join(resourceUtils_1.projectsBasePath, 'imports');
        const tempFolder = path.join(importsFolder, 'temp');
        sendUpdateUploadStatus(`modifyRepoFileFromPath`, `${completedStr} - downloading DCS file content ${uploadPath}`);
        const fileData = await (0, resourceUtils_1.fetchFileFromRepo)(server, owner, repo, branch, tempFolder, uploadPath);
        if (fileData?.error) {
            // @ts-ignore
            return fileData;
        }
        const tempFile = path.join(tempFolder, uploadPath);
        const dcsContent = fs.readFileSync(tempFile, "UTF-8")?.toString();
        const content = fs.readFileSync(sourceFilePath, "UTF-8")?.toString();
        if (dcsContent === content) { // if no change
            console.log(`modifyRepoFileFromPath - no change, skipping`);
            sendUpdateUploadStatus(`modifyRepoFileFromPath`, `${completedStr} - no change, skipping upload`);
            // nothing to do
            return {
                // @ts-ignore
                success: true,
                content,
            };
        }
        else if (dcsContent) {
            const patchFileName = uploadPath[0] === '/' ? uploadPath : '/' + uploadPath;
            const diffPatch = (0, fileUtils_1.getPatch)(patchFileName, dcsContent, content, false, getContextLines());
            console.log(`modifyRepoFileFromPath - patching file length ${diffPatch.length}`);
            const ratio = diffPatch.length / content.length;
            if ((ratio > 0.5) || (diffPatch.length > 100000)) {
                forcedUpload = true;
                sendUpdateUploadStatus(`modifyRepoFileFromPath`, `${completedStr} - diff file too large ${diffPatch.length}, reverting to full upload`);
                console.log(`modifyRepoFileFromPath - dcsContent length ${dcsContent.length}, local content length ${content.length}`);
                console.log(`modifyRepoFileFromPath - patch length too large ${diffPatch.length}`);
            }
            else {
                forcedUpload = false;
                sendUpdateUploadStatus(`modifyRepoFileFromPath`, `${completedStr} - uploading patch content ${uploadPath}`);
                // @ts-ignore
                results = await (0, gitUtils_1.uploadRepoDiffPatchFile)(server, owner, repo, branch, uploadPath, diffPatch, sha, token);
                results.content = content;
                if (results?.error) {
                    incrementContextLines();
                    const diffPatch = (0, fileUtils_1.getPatch)(patchFileName, dcsContent, content, false, getContextLines());
                    await (0, fileUtils_1.delay)(1000);
                    sendUpdateUploadStatus(`modifyRepoFileFromPath`, `${completedStr} - retrying upload of patch content ${uploadPath}`);
                    // @ts-ignore
                    results = await (0, gitUtils_1.uploadRepoDiffPatchFile)(server, owner, repo, branch, uploadPath, diffPatch, sha, token);
                    results.content = content;
                }
            }
        }
        else {
            forcedUpload = true;
        }
    }
    if (forcedUpload) {
        sendUpdateUploadStatus(`modifyRepoFileFromPath`, `${completedStr} - uploading new file content ${uploadPath}`);
        const content = fs.readFileSync(sourceFilePath, "UTF-8")?.toString();
        results = await (0, gitUtils_1.modifyRepoFile)(server, owner, repo, branch, uploadPath, content, token, sha);
    }
    // @ts-ignore
    return results;
}
const dcsStatusFile = '.dcs_upload_status';
async function deleteTheBranchAndPR(server, owner, repo, pr, token, branch) {
    const updateData = {
        state: 'closed'
    };
    sendUpdateUploadStatus(`deleteTheBranchAndPR`, `closing PR #${pr.number}`);
    const results = await (0, gitUtils_1.updatePullRequest)(server, owner, repo, pr.number, token, updateData);
    if (results.error) {
        sendUpdateUploadErrorStatus(`deleteTheBranchAndPR`, `PR #${pr.number} closing failed`);
    }
    else {
        sendUpdateUploadStatus(`deleteTheBranchAndPR`, `deleting branch ${branch}`);
        const success = await (0, gitUtils_1.deleteBranch)(server, owner, repo, branch, token);
        if (!success) {
            sendUpdateUploadErrorStatus(`deleteTheBranchAndPR`, `branch  ${branch} deletion failed`);
        }
        else {
            return true;
        }
    }
    return false;
}
async function updateFilesInBranch(localFiles, localRepoPath, unHandledFiles, uploadedFiles, server, owner, repo, branch, token) {
    let changedFiles = 0;
    const importsFolder = path.join(resourceUtils_1.projectsBasePath, 'imports');
    fs.emptyDirSync(importsFolder);
    const total = localFiles.length + 1;
    let counter = 0;
    for (const localFile of localFiles) {
        counter++;
        const completedStr = `${Math.round(100 * counter / total)}%`;
        if (localFile.includes(dcsStatusFile) || localFile.includes(".DS_Store")) { // skip over DCS data file, and system files
            continue;
        }
        const fullFilePath = path.join(localRepoPath, localFile);
        let doUpload = false;
        let skip = false;
        let localChecksum = "";
        const remoteFileData = unHandledFiles[localFile];
        const isOnDcs = !!remoteFileData;
        if (!isOnDcs) {
            doUpload = true;
        }
        else {
            localChecksum = await (0, fileUtils_1.getChecksum)(fullFilePath);
            const lastUploadData = uploadedFiles[localFile];
            const lastSha = lastUploadData?.sha;
            const checksumUnchanged = lastUploadData?.checksum === localChecksum;
            const shaUnchanged = remoteFileData?.sha === lastSha;
            if (checksumUnchanged && shaUnchanged) {
                // if checksum unchanged and sha unchanged, then skip this file
                skip = true;
            }
        }
        let results = null;
        if (!skip) {
            if (doUpload) { // uploading changed file
                sendUpdateUploadStatus(`updateFilesInBranch`, `${completedStr} - uploading file ${localFile}`);
                results = await (0, gitUtils_1.uploadRepoFileFromPath)(server, owner, repo, branch, localFile, fullFilePath, token);
            }
            else {
                sendUpdateUploadStatus(`updateFilesInBranch`, `${completedStr} - updating changed file ${localFile}`);
                const sha = remoteFileData?.sha || "";
                results = await modifyRepoFileFromPath(server, owner, repo, branch, localFile, fullFilePath, token, sha, true, completedStr);
            }
            changedFiles++;
            if (!results?.error) {
                // @ts-ignore
                const fileData = results.content;
                const checksum = await (0, fileUtils_1.getChecksum)(fullFilePath);
                const newFileData = {
                    ...fileData,
                    checksum,
                };
                // @ts-ignore
                delete newFileData["content"];
                uploadedFiles[localFile] = newFileData;
                if (isOnDcs) {
                    delete unHandledFiles[localFile];
                    changedFiles++;
                }
            }
            else {
                // @ts-ignore
                results.errorUploading = true;
                console.error(results.error);
                return results;
            }
        }
        else {
            delete unHandledFiles[localFile];
        }
    }
    for (const file of Object.keys(unHandledFiles)) {
        const fileData = unHandledFiles[file];
        const fileType = fileData?.type;
        if (fileType === "file" || fileType === "blob") {
            sendUpdateUploadStatus(`updateFilesInBranch`, `deleting ${file}`);
            const sha = fileData?.sha || "";
            const results = await (0, gitUtils_1.deleteRepoFile)(server, owner, repo, branch, file, token, sha);
            if (results?.error) {
                sendUpdateUploadErrorStatus(`updateFilesInBranch`, `deletion failed: ${file}`);
            }
        }
    }
    console.log(`updateFilesInBranch - files changed count ${changedFiles}`);
    return { changedFiles };
}
async function downloadRepoFromDCS(server, owner, repo, backup = false) {
    const localRepoPath = path.join(resourceUtils_1.projectsBasePath, repo);
    let backupRepoPath = '';
    if (fs.existsSync(localRepoPath)) {
        if (!backup) {
            return {
                error: `local project already exists ${localRepoPath}`,
                errorLocalProjectExists: true,
            };
        }
        try {
            backupRepoPath = localRepoPath + '.OLD_' + getTimeStamp();
            fs.moveSync(localRepoPath, backupRepoPath);
        }
        catch (e) {
            return {
                error: `Could not backup local project ${localRepoPath}`,
                errorMessage: e.toString(),
                errorRenameFailure: true,
            };
        }
    }
    const results = await downloadPublicRepoFromBranch(localRepoPath, server, owner, repo, 'master');
    results.backupRepoPath = backupRepoPath;
    return results;
}
async function downloadPublicRepoFromBranch(localRepoPath, server, owner, repo, branch) {
    fs.ensureDirSync(localRepoPath);
    const treeResults = await (0, gitUtils_1.getRepoTree)(server, owner, repo, branch);
    if (treeResults.error) {
        return treeResults;
    }
    const dcsFiles = {};
    for (const file of treeResults?.tree || []) { // make object indexed by path
        // @ts-ignore
        dcsFiles[file.path] = file;
    }
    const commit = treeResults.sha || '';
    const results = await downloadFilesInBranch(localRepoPath, dcsFiles, server, owner, repo, branch);
    const newStatus = {
        files: dcsFiles,
        commit,
        lastState: {
            downloaded: true
        },
    };
    fs.outputJsonSync(path.join(localRepoPath, dcsStatusFile, owner), newStatus);
    results.localRepoPath = localRepoPath;
    return results;
}
async function checkDownloadedFiles(dcsFiles, localRepoPath) {
    let changedFiles = 0;
    const files = Object.keys(dcsFiles);
    for (const fileName of files) {
        if ((fileName.includes(dcsStatusFile)) || (fileName === ".DS_Store")) { // skip over DCS data file, and system files
            continue;
        }
        const fullFilePath = path.join(localRepoPath, fileName);
        const dcsFileData = dcsFiles[fileName];
        let localChecksum = "";
        let results = null;
        const fileType = dcsFileData?.type;
        if (fileType === "file" || fileType === "blob") {
            console.log(`checkDownloadedFiles - validating file ${fileName}`);
            changedFiles++;
            localChecksum = await (0, fileUtils_1.getChecksum)(fullFilePath);
            dcsFileData.checksum = localChecksum;
            // @ts-ignore
            delete dcsFileData["content"];
        }
    }
    // @ts-ignore
    return { changedFiles };
}
async function downloadFilesInBranch(localRepoPath, dcsFiles, server, owner, repo, branch) {
    const zipFileName = repo + '.zip';
    const importsFolder = path.join(resourceUtils_1.projectsBasePath, 'imports');
    fs.emptyDirSync(importsFolder);
    const zipFilePath = path.join(importsFolder, owner, zipFileName);
    const downloadUrl = `${server}/${owner}/${repo}/archive/${branch}.zip`;
    console.log(`downloadFilesInBranch - downloading zip ${downloadUrl}`);
    const results = await (0, resourceUtils_1.fetchFromUrl)(downloadUrl, zipFilePath);
    if (results.status !== 200) {
        return {
            ...results,
            error: `fetchFileFromUrl(${downloadUrl}) - returned status ${results.status}`
        };
    }
    try {
        console.log(`downloadFilesInBranch - unzipping ${zipFilePath}`);
        await tc_source_content_updater_1.zipFileHelpers.extractZipFile(zipFilePath, resourceUtils_1.projectsBasePath);
        fs.emptyDirSync(importsFolder);
    }
    catch (e) {
        return {
            errorObject: e,
            error: `unzip failed: ${e.toString()}`
        };
    }
    const { changedFiles } = await checkDownloadedFiles(dcsFiles, localRepoPath);
    console.log(`downloadFilesInBranch - download completed`);
    return { success: true, changedFiles };
}
async function makeSureBranchExists(server, owner, repo, token, branch, branchAlreadyExists = false, previousCommit = '') {
    let newRepo = false;
    let newBranch = false;
    let repoExists = false;
    if (branchAlreadyExists) { // if we know branch already exists, no need to check repo
        repoExists = true;
    }
    else {
        repoExists = await (0, gitUtils_1.checkIfRepoExists)(server, owner, repo, token);
    }
    if (!repoExists) {
        sendUpdateUploadStatus(`makeSureBranchExists`, `creating repo ${owner}/${repo}`);
        const results = await (0, gitUtils_1.createCheckingRepository)(server, owner, repo, token);
        if (results?.error) {
            sendUpdateUploadErrorStatus(`makeSureBranchExists`, `error creating repo ${owner}/${repo}`);
            return {
                error: results?.error,
                errorCreatingRepo: true,
                newRepo,
            };
        }
        newRepo = true;
    }
    const branchExists = await (0, gitUtils_1.checkBranchExists)(server, owner, repo, branch, token);
    if (!branchExists) {
        let head = 'master';
        if (previousCommit && !newRepo) {
            const result = await (0, gitUtils_1.checkCommitInBranch)(server, owner, repo, 'master', previousCommit, token);
            if (result?.containsCommit) {
                head = previousCommit;
            }
        }
        sendUpdateUploadStatus(`makeSureBranchExists`, `creating repo branch from ${head}`);
        const results = await (0, gitUtils_1.createRepoBranch)(server, owner, repo, branch, token, head);
        if (results?.error) {
            sendUpdateUploadErrorStatus(`makeSureBranchExists`, `error creating branch ${branch}`);
            return {
                error: results?.error,
                errorCreatingBranch: true,
                newRepo,
            };
        }
        else {
            newBranch = true;
        }
    }
    return { newRepo, newBranch };
}
async function getMergeToMasterPR(server, owner, repo, token, state) {
    const prResults = await (0, gitUtils_1.getOpenPullRequests)(server, owner, repo, token);
    if (!prResults.error) {
        console.log(`updateFilesInBranch - found ${prResults?.pullRequests?.length} PRs`);
        const pullRequest = prResults?.pullRequests.find(pr => {
            const baseBranch = pr?.base?.ref;
            const headBranch = pr?.head?.ref;
            const match = (baseBranch === "master") && (headBranch === exports.mergeToMasterBranch);
            return match;
        });
        if (pullRequest) {
            prResults.matchedPullRequest = pullRequest;
            state.prNumber = pullRequest.number;
            state.prURL = (0, gitUtils_1.getManualPullRequest)(server, owner, repo, pullRequest.number);
        }
    }
    return prResults;
}
async function updateFilesAndMergeToMaster(localRepoPath, server, owner, repo, token, dcsState, state, updateSavedData) {
    const branch = exports.mergeToMasterBranch;
    const localFiles = (0, fileUtils_1.getAllFiles)(localRepoPath);
    const results = await (0, gitUtils_1.getRepoTree)(server, owner, repo, branch, token);
    const unHandledFiles = {};
    let uploadedFiles = dcsState?.files || {};
    if (state.newRepo) { // if new repo then upload everything
        uploadedFiles = {};
    }
    for (const file of results?.tree || []) { // make object indexed by path
        // @ts-ignore
        unHandledFiles[file.path] = file;
    }
    const updateFilesResults = await updateFilesInBranch(localFiles, localRepoPath, unHandledFiles, uploadedFiles, server, owner, repo, branch, token);
    if (updateFilesResults.error) {
        return updateFilesResults;
    }
    state.filesChangedOnBranchCount = updateFilesResults.changedFiles;
    let pr;
    if (state.branchPreviouslyCreated) { // check if already PR for branch
        const prResults = await getMergeToMasterPR(server, owner, repo, token, state);
        if (prResults.error) {
            return prResults;
        }
        if (prResults.matchedPullRequest) {
            pr = prResults.matchedPullRequest;
        }
    }
    // @ts-ignore
    if (pr) {
        sendUpdateUploadStatus(`updateFilesAndMergeToMaster`, `PR already exists`);
    }
    else {
        sendUpdateUploadStatus(`updateFilesAndMergeToMaster`, `creating PR`);
        const title = `Merge ${branch} into master`;
        const body = `This pull request merges ${branch} into master.`;
        pr = await (0, gitUtils_1.createPullRequest)(server, owner, repo, branch, "master", title, body, token);
        sendUpdateUploadStatus(`updateFilesAndMergeToMaster`, `Pull request created: #${pr.number} - ${pr.url}`);
        state.prNumber = pr.number;
        state.prURL = (0, gitUtils_1.getManualPullRequest)(server, owner, repo, pr.number);
    }
    const prStatus = await (0, gitUtils_1.getChangedFiles)(server, owner, repo, pr.number, token);
    if (!prStatus?.length) {
        sendUpdateUploadStatus(`updateFilesAndMergeToMaster`, `PR #${pr.number} has no changes, deleting PR`);
        state.mergeComplete = await deleteTheBranchAndPR(server, owner, repo, pr, token, branch);
        state.noChanges = true;
        updateSavedData = true; // need to update in case sha data is out ouf sync
    }
    else {
        sendUpdateUploadStatus(`updateFilesAndMergeToMaster`, `PR #${pr.number} has ${prStatus?.length} changes`);
        if (!pr.mergeable) {
            sendUpdateUploadErrorStatus(`updateFilesAndMergeToMaster`, `PR #${pr.number} is not mergeable`);
            return {
                error: `PR #${pr.number} is not mergeable`
            };
        }
        else if (pr.merged) {
            sendUpdateUploadErrorStatus(`updateFilesAndMergeToMaster`, `PR #${pr.number} has already been merged, deleting PR`);
            state.mergeComplete = await deleteTheBranchAndPR(server, owner, repo, pr, token, branch);
            state.noChanges = true;
            updateSavedData = true; // need to update in case sha data is out ouf sync
        }
        else {
            sendUpdateUploadStatus(`updateFilesAndMergeToMaster`, `merging PR #${pr.number}`);
            const response = await (0, gitUtils_1.squashMergePullRequest)(server, owner, repo, pr.number, true, token, 2);
            if (response.error) {
                return response;
            }
            sendUpdateUploadStatus(`updateFilesAndMergeToMaster`, ` merged PR #${pr.number}`);
            state.mergeComplete = true;
            updateSavedData = true;
        }
    }
    if (updateSavedData) {
        console.log(`updateContentOnDCS - updating saved data`);
        const branch = await (0, gitUtils_1.getRepoBranch)(server, owner, repo, "master", token);
        const commit = branch?.commit?.id || '';
        const treeResults = await (0, gitUtils_1.getRepoTree)(server, owner, repo, commit, token);
        if (!treeResults?.error) {
            for (const file of treeResults?.tree || []) {
                // @ts-ignore
                const filePath = file.path;
                const uploadedFile = uploadedFiles[filePath];
                if (uploadedFile) {
                    uploadedFile.sha = file.sha;
                }
            }
        }
        state.updatedSavedData = true;
        // save latest upload data
        const newStatus = {
            files: uploadedFiles,
            commit,
            lastState: state,
        };
        fs.outputJsonSync(path.join(localRepoPath, dcsStatusFile, owner), newStatus);
    }
    sendUpdateUploadStatus(`updateFilesAndMergeToMaster`, ` upload complete - saving state`);
    // @ts-ignore
    return {
        localFiles,
        uploadedFiles,
        lastState: state,
    };
}
async function makeSureRepoAndBranchExistUploadChangedContentAndMerge(server, owner, repo, token, repoExists, localRepoPath, dcsState, state, updateSavedData) {
    // @ts-ignore
    const previousCommit = dcsState?.commit || '';
    const _results = await makeSureBranchExists(server, owner, repo, token, exports.mergeToMasterBranch, repoExists, previousCommit);
    if (_results?.error) {
        return _results;
    }
    state.newRepo = _results?.newRepo;
    state.newBranch = _results?.newBranch;
    if (!state.newBranch) {
        state.branchPreviouslyCreated = true;
    }
    return await updateFilesAndMergeToMaster(localRepoPath, server, owner, repo, token, dcsState, state, updateSavedData);
}
async function checkIfMasterBranchHasChanged(dcsState, server, owner, repo, token) {
    // @ts-ignore
    const lastMasterCommit = dcsState?.commit;
    const masterCurrent = await (0, gitUtils_1.getRepoBranch)(server, owner, repo, "master", token);
    const masterCommit = masterCurrent?.commit?.id || null;
    // validate the last update against the current branch commit
    const masterChanged = lastMasterCommit && (masterCommit !== lastMasterCommit);
    return masterChanged;
}
function checkforCheckingMergeBranches(branchesResult, state) {
    console.log(`updateContentOnDCS - found ${branchesResult?.branches?.length} Branches`);
    const mergeToMaster = branchesResult.branches.find(branch => (branch.name === exports.mergeToMasterBranch));
    const mergeFromMaster = branchesResult.branches.find(branch => (branch.name === exports.mergeFromMasterBranch));
    state.branchExists = !!mergeToMaster;
    state.branchPreviouslyCreated = state.branchExists;
    if (mergeToMaster) {
        state.mergeToMaster = exports.mergeToMasterBranch;
    }
    if (mergeFromMaster) {
        state.mergeToMaster = exports.mergeFromMasterBranch;
    }
    if (state.branchPreviouslyCreated) {
        sendUpdateUploadStatus(`checkforCheckingMergeBranches`, ` merge to master branch already exists`);
    }
    return { mergeToMaster, mergeFromMaster };
}
async function handleFreshDcsUpload(repoExists, server, owner, repo, token, localRepoPath, dcsState, state, updateSavedData) {
    if (repoExists) {
        sendUpdateUploadErrorStatus(`handleFreshDcsUpload`, `content already exists on server`);
        const message = `updateContentOnDCS - content already exists on server`;
        console.warn(message);
        return {
            error: message,
            errorPreviousContentOnServer: true,
        };
    }
    else {
        // if no repo yet, do fresh upload
        return await makeSureRepoAndBranchExistUploadChangedContentAndMerge(server, owner, repo, token, repoExists, localRepoPath, dcsState, state, updateSavedData);
    }
}
async function handlePreviousDcsUpload(repoExists, server, owner, repo, token, localRepoPath, dcsState, state, updateSavedData) {
    state.previousState = dcsState.lastState;
    if (!repoExists) {
        return await makeSureRepoAndBranchExistUploadChangedContentAndMerge(server, owner, repo, token, repoExists, localRepoPath, dcsState, state, updateSavedData);
    }
    else {
        const masterChanged = await checkIfMasterBranchHasChanged(dcsState, server, owner, repo, token);
        if (masterChanged) {
            const message = `updateContentOnDCS - master branch SHA changed`;
            console.error(message);
            return {
                error: message,
                errorMergeConflict: true,
            };
        }
        // else master unchanged from last upload
        const branchesResult = await (0, gitUtils_1.getRepoBranches)(server, owner, repo, token);
        if (branchesResult?.error) {
            return branchesResult;
        }
        const { mergeToMaster, mergeFromMaster } = checkforCheckingMergeBranches(branchesResult, state);
        if (!mergeToMaster) {
            return await makeSureRepoAndBranchExistUploadChangedContentAndMerge(server, owner, repo, token, repoExists, localRepoPath, dcsState, state, updateSavedData);
        }
        else {
            return await updateFilesAndMergeToMaster(localRepoPath, server, owner, repo, token, dcsState, state, updateSavedData);
        }
    }
}
async function updateContentOnDCS(server, owner, repo, token, localRepoPath, state) {
    console.log(`updateContentOnDCS - updating repo ${owner}/${repo}`);
    let dcsState = (0, fileUtils_1.readJsonFile)(path.join(localRepoPath, dcsStatusFile, owner));
    state.branchExists = false;
    state.branchPreviouslyCreated = false;
    state.newBranch = false;
    state.newRepo = false;
    let updateSavedData = false;
    state.mergeComplete = false;
    state.server = server;
    state.owner = owner;
    state.repo = repo;
    state.localRepoPath = localRepoPath;
    const repoExists = await (0, gitUtils_1.checkIfRepoExists)(server, owner, repo, token);
    const lastState = dcsState?.lastState;
    if (!lastState) {
        return await handleFreshDcsUpload(repoExists, server, owner, repo, token, localRepoPath, dcsState, state, updateSavedData);
    }
    else { // if previous upload
        return await handlePreviousDcsUpload(repoExists, server, owner, repo, token, localRepoPath, dcsState, state, updateSavedData);
    }
    return {
        error: 'Unhandled DCS State',
        errorUnhandledState: true,
    };
}
function updateDcsStatus(key, state, localRepoPath, owner) {
    if (key) {
        const statusPath = path.join(localRepoPath, dcsStatusFile, owner);
        const dcsState = (0, fileUtils_1.readJsonFile)(statusPath) || {};
        dcsState[key] = state;
        fs.outputJsonSync(statusPath, dcsState);
    }
}
function addErrorToDcsStatus(state, errorResults, localRepoPath, owner) {
    const newState = {
        ...state,
        ...errorResults,
    };
    updateDcsStatus('lastState', newState, localRepoPath, owner);
}
function getProjectsForChecking(localRepoPath, checkingSubPath, checkingFileType, projects) {
    try {
        // get checking files
        const tnCheckingPath = path.join(localRepoPath, checkingSubPath);
        let files = (0, fileUtils_1.getFilesOfType)(tnCheckingPath, checkingFileType);
        files.forEach((file) => {
            const bookId = path.basename(file);
            const project = {
                identifier: file,
                title: `Checking ${bookId}`,
                path: `./${checkingSubPath}/${file}`,
            };
            projects.push(project);
        });
    }
    catch (e) {
        sendUpdateUploadErrorStatus(`getProjectsForChecking`, `error updating projects list for ${checkingSubPath}`);
    }
}
function getCheckingFiles(localRepoPath) {
    const projects = [];
    getProjectsForChecking(localRepoPath, "checking/tn", ".tn_check", projects);
    getProjectsForChecking(localRepoPath, "checking/twl", ".twl_check", projects);
    return projects;
}
function updateOutputFiles(localRepoPath) {
    const outputFolder = "output_READONLY";
    try {
        // output tn TSV
        const tnCheckingPath = path.join(localRepoPath, "checking/tn");
        let files = (0, fileUtils_1.getFilesOfType)(tnCheckingPath, ".tn_check");
        files.forEach((file) => {
            const filePath = path.join(tnCheckingPath, file);
            const checkData = (0, fileUtils_1.readJsonFile)(filePath);
            const groupData = (0, resourceUtils_1.flattenGroupData)(checkData);
            const tsv = (0, resourceUtils_1.checkDataToTn)(groupData);
            if (tsv) {
                const outputPath = path.join(localRepoPath, outputFolder, file + ".tsv");
                fs.outputFileSync(outputPath, tsv, "UTF-8");
            }
        });
    }
    catch (e) {
        sendUpdateUploadErrorStatus(`updateOutputFiles`, `error updating tN tsv`);
    }
    try {
        // output twl TSV
        const twlCheckingPath = path.join(localRepoPath, "checking/twl");
        const files = (0, fileUtils_1.getFilesOfType)(twlCheckingPath, ".twl_check");
        files.forEach((file) => {
            const filePath = path.join(twlCheckingPath, file);
            const checkData = (0, fileUtils_1.readJsonFile)(filePath);
            const groupData = (0, resourceUtils_1.flattenGroupData)(checkData);
            const tsv = (0, resourceUtils_1.checkDataToTwl)(groupData);
            if (tsv) {
                const outputPath = path.join(localRepoPath, outputFolder, file + ".tsv");
                fs.outputFileSync(outputPath, tsv, "UTF-8");
            }
        });
    }
    catch (e) {
        sendUpdateUploadErrorStatus(`updateOutputFiles`, `error updating twl tsv`);
    }
    try {
        const metaData = (0, resourceUtils_1.getMetaData)(localRepoPath);
        const { targetLanguageId } = metaData?.["translation.checker"];
        const targetBiblePath = path.join(localRepoPath, 'targetBible');
        const books = (0, resourceUtils_1.getBibleBookFolders)(targetBiblePath);
        books.forEach((bookId) => {
            const bookPath = path.join(targetBiblePath, bookId);
            const chapters = (0, fileUtils_1.getFilesOfType)(bookPath, `.json`);
            const bookData = { chapters: {} };
            chapters.forEach((fileName) => {
                const filePath = path.join(bookPath, fileName);
                const chapterData = (0, fileUtils_1.readJsonFile)(filePath);
                if (fileName.toLowerCase() === 'headers.json') {
                    // @ts-ignore
                    bookData.headers = chapterData;
                }
                else {
                    const chapter = path.parse(fileName).name;
                    // @ts-ignore
                    bookData.chapters[chapter] = chapterData;
                }
            });
            const USFM = (0, resourceUtils_1.convertJsonToUSFM)(bookData);
            const outputPath = path.join(localRepoPath, outputFolder, `targetBible-${targetLanguageId}-${bookId}.USFM`);
            fs.outputFileSync(outputPath, USFM, "UTF-8");
        });
    }
    catch (e) {
        sendUpdateUploadErrorStatus(`updateOutputFiles`, `error updating target bible`);
    }
}
async function uploadRepoToDCS(server, owner, repo, token, localRepoPath) {
    updateOutputFiles(localRepoPath);
    const state = {}; // for keeping track of current state
    try {
        const results = await updateContentOnDCS(server, owner, repo, token, localRepoPath, state);
        if (results.error) {
            sendUpdateUploadErrorStatus(`uploadRepoToDCS`, `upload error: ${results.error}`);
            addErrorToDcsStatus(state, results, localRepoPath, owner);
            results.lastState = state;
        }
        else {
            const results = await (0, gitUtils_1.addTopicToRepo)(server, owner, repo, exports.bibleCheckingTopic, token);
        }
        return results;
    }
    catch (error) {
        // @ts-ignore
        const message = error?.message || error?.toString();
        sendUpdateUploadErrorStatus(`uploadRepoToDCS`, `upload error: ${message}`);
        const _message = `Error: ${message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        const _error = {
            // @ts-ignore
            error: _message,
            errorData: error,
            status: status,
        };
        addErrorToDcsStatus(state, _error, localRepoPath, owner);
        return _error;
    }
}
//# sourceMappingURL=network.js.map