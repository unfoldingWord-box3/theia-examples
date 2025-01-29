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
exports.getRepoTree = getRepoTree;
exports.getOwners = getOwners;
exports.getCheckingRepos = getCheckingRepos;
exports.getReposForOwner = getReposForOwner;
exports.searchCatalogByTopic = searchCatalogByTopic;
exports.checkIfRepoExists = checkIfRepoExists;
exports.createCheckingRepository = createCheckingRepository;
exports.createRepoBranch = createRepoBranch;
exports.checkCommitInBranch = checkCommitInBranch;
exports.uploadRepoFile = uploadRepoFile;
exports.uploadRepoFileFromPath = uploadRepoFileFromPath;
exports.modifyRepoFile = modifyRepoFile;
exports.uploadRepoDiffPatchFile = uploadRepoDiffPatchFile;
exports.deleteRepoFile = deleteRepoFile;
exports.checkBranchExists = checkBranchExists;
exports.getRepoBranches = getRepoBranches;
exports.getManualPullRequest = getManualPullRequest;
exports.createPullRequest = createPullRequest;
exports.getChangedFiles = getChangedFiles;
exports.getFileFromBranch = getFileFromBranch;
exports.squashMergePullRequest = squashMergePullRequest;
exports.updatePullRequest = updatePullRequest;
exports.getOpenPullRequests = getOpenPullRequests;
exports.deleteBranch = deleteBranch;
exports.getRepoBranch = getRepoBranch;
exports.addTopicToRepo = addTopicToRepo;
const axios_1 = __importDefault(require("axios"));
// @ts-ignore
const fs = __importStar(require("fs-extra"));
// @ts-ignore
const base_64_1 = __importDefault(require("base-64"));
// @ts-ignore
const utf8_1 = __importDefault(require("utf8"));
async function getRepoTree(server, owner, repo, sha, token = '') {
    const url = `${server}/api/v1/repos/${owner}/${repo}/git/trees/${sha}?recursive=true`;
    try {
        const headers = token ?
            {
                "Authorization": `token ${token}`,
            } : {};
        const response = await axios_1.default.get(url, { headers });
        return response.data;
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
async function getOwners(server, token = '') {
    const url = `${server}/api/v1/catalog/list/owners?stage=latest`;
    const headers = token ?
        {
            Authorization: `token ${token}`,
        }
        : {};
    try {
        const response = await axios_1.default.get(url, { headers });
        const owners = response.data.data;
        return { owners };
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
async function getCheckingRepos(server, token = '') {
    const url = `${server}/api/v1/repos/search?q=%5C_checking`;
    const headers = token ?
        {
            Authorization: `token ${token}`,
        }
        : {};
    try {
        const response = await axios_1.default.get(url, { headers });
        const repos = response.data.data;
        return { repos };
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
async function getReposForOwner(server, owner, token = '') {
    const url = `${server}/api/v1/repos/search?owner=${owner}`;
    const headers = token ?
        {
            Authorization: `token ${token}`,
        }
        : {};
    try {
        const response = await axios_1.default.get(url, { headers });
        const repos = response.data.data;
        return { repos };
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
async function searchCatalogByTopic(server, topic, token = '') {
    const url = `${server}/api/v1/catalog/search?topic=${topic}&stage=latest`;
    const headers = token ?
        {
            "Authorization": `token ${token}`,
        } : {};
    try {
        const response = await axios_1.default.get(url, { headers });
        const catalog = response.data.data;
        return { catalog };
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
async function checkIfRepoExists(server, owner, repo, token) {
    const url = `${server}/api/v1/repos/${owner}/${repo}`;
    try {
        await axios_1.default.get(url, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        return true; // Repository exists
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error?.response?.status;
        if (status === 404) {
            return false; // Repository does not exist
        }
        else {
            // @ts-ignore
            console.error(`Error: ${error.message}`);
            throw error;
        }
    }
}
async function createCheckingRepository(server, owner, repoName, token) {
    const url = `${server}/api/v1/user/repos`;
    const data = {
        name: repoName,
        description: "Translation Checking Repo",
        auto_init: true,
        private: false,
        license: "MIT",
        default_branch: "master"
    };
    try {
        const response = await axios_1.default.post(url, data, {
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
async function createRepoBranch(server, owner, repo, newBranch, token, sourceBranch = 'master') {
    const url = `${server}/api/v1/repos/${owner}/${repo}/branches`;
    // const url = `${server}/api/v1/repos/${owner}/${repo}/git/refs`;
    const data = {
        new_branch_name: newBranch,
        old_ref_name: sourceBranch,
    };
    try {
        const response = await axios_1.default.post(url, data, {
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
async function checkCommitInBranch(server, repoOwner, repoName, branch, commitSha, token) {
    try {
        const results = await getCommitsInBranch(server, repoOwner, repoName, branch, token);
        const commits = results?.commits;
        const containsCommit = commits?.some((commit) => commit.sha === commitSha);
        return {
            containsCommit,
            commitSha,
            message: containsCommit ? 'Commit is in the master branch.' : 'Commit is not in the master branch.'
        };
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            // @ts-ignore
            error: message,
            status: status
        };
    }
}
async function getCommitsInBranch(server, repoOwner, repoName, branchName, token) {
    const apiUrl = `${server}/api/v1/repos/${repoOwner}/${repoName}/commits?sha=${branchName}`;
    try {
        const response = await axios_1.default.get(apiUrl, {
            headers: {
                Authorization: `token ${token}`
            }
        });
        const commits = response.data.map((commit) => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: {
                name: commit.commit.author.name,
                email: commit.commit.author.email,
                date: commit.commit.author.date
            },
            committer: {
                name: commit.commit.committer.name,
                email: commit.commit.committer.email,
                date: commit.commit.committer.date
            }
        }));
        return { commits };
    }
    catch (error) {
        // @ts-ignore
        console.error('Error:', error.message);
        throw error;
    }
}
async function uploadRepoFile(server, owner, repo, branch, filePath, content, token) {
    const url = `${server}/api/v1/repos/${owner}/${repo}/contents/${filePath}`;
    const data = {
        content: Buffer.from(content).toString('base64'),
        message: `Create ${filePath}`,
        branch: branch
    };
    try {
        const response = await axios_1.default.post(url, data, {
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
async function uploadRepoFileFromPath(server, owner, repo, branch, uploadPath, sourceFilePath, token) {
    const content = fs.readFileSync(sourceFilePath, "UTF-8")?.toString();
    const results = await uploadRepoFile(server, owner, repo, branch, uploadPath, content, token);
    return results;
}
async function modifyRepoFile(server, owner, repo, branch, filePath, content, token, sha) {
    const encodedContent = base_64_1.default.encode(utf8_1.default.encode(content || ''));
    const url = `${server}/api/v1/repos/${owner}/${repo}/contents/${filePath}`;
    const data = {
        content: encodedContent,
        message: `Update ${filePath}`,
        branch: branch,
        sha: sha
    };
    try {
        const response = await axios_1.default.put(url, data, {
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
async function uploadRepoDiffPatchFile(server, owner, repo, branch, filePath, patch, sha, token) {
    const url = `${server}/api/v1/repos/${owner}/${repo}/diffpatch`;
    const headers = {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
    };
    const author_ = {
        email: '',
        name: owner,
    };
    var date = new Date();
    var isoDate = date.toISOString();
    const data = {
        author: author_,
        branch: branch,
        committer: author_,
        content: patch || '',
        from_path: '.',
        dates: {
            author: isoDate,
            committer: isoDate
        },
        message: 'Applying diffpatch',
        sha,
        signoff: true
    };
    try {
        const response = await axios_1.default.post(url, data, { headers });
        return response.data;
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
async function deleteRepoFile(server, owner, repo, branch, filePath, token, sha) {
    const url = `${server}/api/v1/repos/${owner}/${repo}/contents/${filePath}`;
    const data = {
        message: `Delete ${filePath}`,
        branch: branch,
        sha: sha
    };
    try {
        const response = await axios_1.default.delete(url, {
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            data
        });
        return response.data;
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
async function checkBranchExists(server, owner, repo, branch, token) {
    const url = `${server}/api/v1/repos/${owner}/${repo}/branches/${branch}`;
    try {
        await axios_1.default.get(url, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        return true; // Branch exists
    }
    catch (error) {
        // @ts-ignore
        if (error.response && error.response.status === 404) {
            return false; // Branch does not exist
        }
        else {
            // @ts-ignore
            console.error(`Error: ${error.message}`);
            throw error;
        }
    }
}
async function getRepoBranches(server, repoOwner, repoName, accessToken) {
    try {
        const response = await axios_1.default.get(`${server}/api/v1/repos/${repoOwner}/${repoName}/branches`, {
            headers: {
                Authorization: `token ${accessToken}`,
            },
        });
        return {
            branches: response.data
        };
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
function getManualPullRequest(server, owner, repo, prNumber) {
    const url = `${server}/${owner}/${repo}/pulls/${prNumber}`;
    return url;
}
async function createPullRequest(server, owner, repo, branchToMergeFrom, branchToMergeInto, title, body, token) {
    const url = `${server}/api/v1/repos/${owner}/${repo}/pulls`;
    const data = {
        head: branchToMergeFrom,
        base: branchToMergeInto,
        title: title,
        body: body
    };
    try {
        const response = await axios_1.default.post(url, data, {
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
    catch (error) {
        // @ts-ignore
        console.error(`Error: ${error.message}`);
        throw error;
    }
}
async function getChangedFiles(server, repoOwner, repoName, pullRequestId, accessToken) {
    try {
        const url = `${server}/api/v1/repos/${repoOwner}/${repoName}/pulls/${pullRequestId}/files`;
        const response = await axios_1.default.get(url, {
            headers: {
                Authorization: `token ${accessToken}`,
            },
        });
        // console.log(response)
        return response.data;
    }
    catch (error) {
        // @ts-ignore
        console.error('Error getting changed files:', error);
        throw error;
    }
}
async function getFileFromBranch(server, owner, repo, branch, filePath, token) {
    const url = `${server}/api/v1/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
    const headers = {
        Authorization: `token ${token}`,
    };
    try {
        const response = await axios_1.default.get(url, { headers });
        const fileData = response.data;
        if (response?.data?.encoding === 'base64') {
            const decodedContent = Buffer.from(fileData.content, "base64").toString("utf-8");
            // @ts-ignore
            fileData.content = decodedContent;
        }
        return fileData;
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            // @ts-ignore
            error: message,
            status: status
        };
    }
}
async function squashMergePullRequest(server, owner, repo, pullNumber, autoDelete, token, retryCount = 0) {
    const url = `${server}/api/v1/repos/${owner}/${repo}/pulls/${pullNumber}/merge`;
    const data = {
        Do: "squash",
        MergeMessageField: `Squash merge pull request #${pullNumber}`,
        delete_branch_after_merge: autoDelete,
    };
    let message = '';
    let status = 0;
    for (let i = 0; i < retryCount + 1; i++) {
        try {
            const response = await axios_1.default.post(url, data, {
                headers: {
                    "Authorization": `token ${token}`,
                    "Content-Type": "application/json",
                },
            });
            return response.data;
        }
        catch (error) {
            // @ts-ignore
            message = `Error: ${error.message}`;
            // @ts-ignore
            status = error.status;
            if ((status === 405) && (i < retryCount)) {
                console.warn(`squashMergePullRequest(), got error ${status}, retry ${i + 1}`);
                continue;
            }
            else {
                break;
            }
        }
    }
    // @ts-ignore
    return {
        error: message,
        status: status
    };
}
async function updatePullRequest(server, repoOwner, repoName, pullRequestId, accessToken, updateData) {
    try {
        const url = `${server}/api/v1/repos/${repoOwner}/${repoName}/pulls/${pullRequestId}`;
        const response = await axios_1.default.patch(url, updateData, {
            headers: {
                Authorization: `token ${accessToken}`,
            },
        });
        return response.data;
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
async function getOpenPullRequests(server, repoOwner, repoName, accessToken) {
    try {
        const response = await axios_1.default.get(`${server}/api/v1/repos/${repoOwner}/${repoName}/pulls?state=open`, {
            headers: {
                Authorization: `token ${accessToken}`,
            },
        });
        return {
            pullRequests: response.data
        };
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            error: message,
            status: status
        };
    }
}
async function deleteBranch(server, repoOwner, repoName, branchName, accessToken) {
    try {
        const url = `${server}/api/v1/repos/${repoOwner}/${repoName}/branches/${branchName}`;
        const response = await axios_1.default.delete(url, {
            headers: {
                Authorization: `token ${accessToken}`,
            },
        });
        return true;
    }
    catch (error) {
        console.error('Error deleting branch:', error);
    }
    return false;
}
async function getRepoBranch(server, repoOwner, repoName, branchName, accessToken) {
    try {
        const url = `${server}/api/v1/repos/${repoOwner}/${repoName}/branches/${branchName}`;
        const response = await axios_1.default.get(url, {
            headers: {
                Authorization: `token ${accessToken}`,
            },
        });
        return response.data;
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            // @ts-ignore
            error: message,
            status: status
        };
    }
}
async function createTag(server, owner, repo, tagName, tagMessage, target, token) {
    const url = `${server}/api/v1/repos/${owner}/${repo}/tags`;
    const headers = {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
    };
    const data = {
        tag: tagName,
        message: tagMessage,
        target: target,
    };
    try {
        const response = await axios_1.default.post(url, data, { headers });
        return response.data;
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            // @ts-ignore
            error: message,
            status: status
        };
    }
}
async function addTopicToRepo(server, owner, repo, topic, token) {
    const url = `${server}/api/v1/repos/${owner}/${repo}/topics/${topic}`;
    const headers = {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
    };
    const data = {};
    try {
        const response = await axios_1.default.put(url, data, { headers });
        const content = response.data;
        return { content };
    }
    catch (error) {
        // @ts-ignore
        const message = `Error: ${error.message}`;
        // @ts-ignore
        const status = error.status;
        // @ts-ignore
        return {
            // @ts-ignore
            error: message,
            status: status
        };
    }
}
//# sourceMappingURL=gitUtils.js.map