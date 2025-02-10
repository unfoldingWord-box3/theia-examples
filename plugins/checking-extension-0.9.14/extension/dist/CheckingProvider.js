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
exports.CheckingProvider = void 0;
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
// @ts-ignore
const fs = __importStar(require("fs-extra"));
const TranslationCheckingPanel_1 = require("./panels/TranslationCheckingPanel");
const resourceUtils_1 = require("./utilities/resourceUtils");
const fileUtils_1 = require("./utilities/fileUtils");
const languages_1 = require("./utilities/languages");
const languages_2 = require("./utilities/languages");
// @ts-ignore
const deep_equal_1 = __importDefault(require("deep-equal"));
const BooksOfTheBible_1 = require("./utilities/BooksOfTheBible");
const network_1 = require("./utilities/network");
const gitUtils_1 = require("./utilities/gitUtils");
const path_1 = __importDefault(require("path"));
let _callbacks = {}; // stores callback by key
function saveCallBack(key, callback) {
    // @ts-ignore
    _callbacks[key] = callback;
}
function getCallBack(key) {
    // @ts-ignore
    const callback = _callbacks?.[key];
    return callback;
}
async function showInformationMessage(message, modal = false, detail = null) {
    if (modal) {
        const options = { modal: true };
        if (detail) {
            // @ts-ignore
            options.detail = detail;
        }
        vscode_1.window.showInformationMessage(message, options);
    }
    else {
        vscode_1.window.showInformationMessage(message);
    }
    console.log(message);
    await (0, fileUtils_1.delay)(100); // TRICKY: allows UI to update before moving on
}
async function showErrorMessage(message, modal = false, detail = null) {
    if (modal) {
        const options = { modal: true };
        if (detail) {
            // @ts-ignore
            options.detail = detail;
        }
        vscode_1.window.showErrorMessage(message, options);
    }
    else {
        vscode_1.window.showErrorMessage(message);
    }
    console.error(message);
    await (0, fileUtils_1.delay)(100); // TRICKY: allows UI to update before moving on
}
async function getWorkSpaceFolder() {
    let projectPath;
    let repoFolderExists = false;
    const workspaceFolder = vscode.workspace.workspaceFolders
        ? vscode.workspace.workspaceFolders[0]
        : undefined;
    if (workspaceFolder) {
        projectPath = workspaceFolder.uri.fsPath;
        repoFolderExists = await vscode.workspace.fs.stat(workspaceFolder.uri).then(() => true, () => false);
    }
    return { projectPath, repoFolderExists };
}
/**
 * Provider for tsv editors.
 *
 * Checking Editors are used for .tn_check and .twl_check files. This editor is specifically geared
 * making selections in the target language and saving them in the check file.
 *
 */
class CheckingProvider {
    context;
    static currentState = {};
    static secretStorage = null;
    constructor(context) {
        this.context = context;
    }
    static register(context) {
        let redirecting = false;
        let commandRegistration = null;
        //wrapper for registered commands, to prevent recursive calls
        const executeWithRedirecting = (command) => {
            return async (...args) => {
                if (redirecting) {
                    return;
                }
                redirecting = true;
                try {
                    await command(...args);
                }
                finally {
                    redirecting = false;
                }
            };
        };
        const subscriptions = [];
        const provider = new CheckingProvider(context);
        const providerRegistration = vscode_1.window.registerCustomEditorProvider(CheckingProvider.viewType, provider);
        subscriptions.push(providerRegistration);
        commandRegistration = vscode_1.commands.registerCommand("checking-extension.launchWorkflow", executeWithRedirecting(async () => {
            console.log(`starting "checking-extension.launchWorkflow"`);
            await vscode.commands.executeCommand(`workbench.action.openWalkthrough`, `unfoldingWord.checking-extension#initChecking`, false);
            await this.initializeWorkflow(false);
            const catalog = (0, resourceUtils_1.getSavedCatalog)(false);
            if (catalog) {
                await this.gotoWorkFlowStep('selectTargetBible');
                await this.setContext('fetchedCatalog', true);
            }
            await this.setContext('createNewFolder', true);
        }));
        subscriptions.push(commandRegistration);
        commandRegistration = vscode_1.commands.registerCommand("checking-extension.launchWorkflowPre", executeWithRedirecting(async () => {
            console.log(`starting "checking-extension.launchWorkflowPre - using PreRelease Resources"`);
            await vscode.commands.executeCommand(`workbench.action.openWalkthrough`, `unfoldingWord.checking-extension#initChecking`, false);
            await this.initializeWorkflow(true);
            const catalog = (0, resourceUtils_1.getSavedCatalog)(true);
            if (catalog) {
                await this.gotoWorkFlowStep('selectTargetBible');
                await this.setContext('fetchedCatalog', true);
            }
            await this.setContext('createNewFolder', true);
        }));
        subscriptions.push(commandRegistration);
        commandRegistration = vscode_1.commands.registerCommand("checking-extension.useReleased", executeWithRedirecting(async () => {
            console.log(`starting "checking-extension.useReleased"`);
            await vscode.commands.executeCommand(`workbench.action.openWalkthrough`, `unfoldingWord.checking-extension#initChecking`, false);
            await this.gotoWorkFlowStep('fetchCatalog');
            await this.setContext("preRelease", false);
            const catalog = (0, resourceUtils_1.getSavedCatalog)(false);
            if (catalog) {
                await this.setContext('fetchedCatalog', true);
            }
        }));
        subscriptions.push(commandRegistration);
        commandRegistration = vscode_1.commands.registerCommand("checking-extension.downloadCatalog", executeWithRedirecting(async () => {
            console.log("checking-extension.downloadCatalog");
            await (0, fileUtils_1.delay)(100);
            const preRelease = this.getContext('preRelease');
            const catalog = await (0, resourceUtils_1.getLatestResourcesCatalog)(resourceUtils_1.resourcesPath, preRelease);
            if (!catalog) {
                showErrorMessage(`Error Downloading Updated Resource Catalog!`, true);
            }
            else {
                (0, resourceUtils_1.saveCatalog)(catalog, preRelease);
                await this.gotoWorkFlowStep('selectTargetBible');
                await this.setContext('fetchedCatalog', true);
            }
        }));
        subscriptions.push(commandRegistration);
        commandRegistration = vscode_1.commands.registerCommand("checking-extension.selectTargetBible", executeWithRedirecting(async () => {
            console.log("checking-extension.selectTargetBible");
            const preRelease = this.getContext('preRelease');
            const catalog = (0, resourceUtils_1.getSavedCatalog)(preRelease);
            const { targetLanguagePick, targetOwnerPick, targetBibleIdPick } = await this.getTargetLanguageSelection(catalog);
            if (targetLanguagePick && targetOwnerPick && targetBibleIdPick) {
                const targetBibleOptions = {
                    languageId: targetLanguagePick,
                    owner: targetOwnerPick,
                    bibleId: targetBibleIdPick
                };
                const options = await this.getBookSelection(targetBibleOptions);
                if (options?.bookPick) {
                    await this.gotoWorkFlowStep("selectGatewayLanguage");
                    await this.setContext('selectedBook', options.bookPick);
                }
                await this.setContext('targetBibleOptions', targetBibleOptions);
            }
        }));
        subscriptions.push(commandRegistration);
        commandRegistration = vscode_1.commands.registerCommand("checking-extension.selectGL", executeWithRedirecting(async () => {
            console.log("checking-extension.selectGL");
            const preRelease = this.getContext('preRelease');
            const targetOptions = this.getContext('targetBibleOptions') || {};
            const targetLanguageId = targetOptions.languageId;
            const targetBibleId = targetOptions.bibleId || "";
            const targetOwner = targetOptions.owner;
            const bookId = this.getContext('selectedBook');
            if (targetLanguageId && targetBibleId && targetOwner && bookId) {
                const options = await this.getGatewayLangSelection(preRelease);
                const glSelected = !!(options && options.gwLanguagePick && options.gwOwnerPick);
                let glOptions = glSelected ? {
                    languageId: options.gwLanguagePick,
                    owner: options.gwOwnerPick
                }
                    : null;
                if (glOptions) {
                    const results = await this.loadResourcesWithProgress(glOptions.languageId, glOptions.owner || '', resourceUtils_1.resourcesPath, preRelease, bookId);
                    // @ts-ignore
                    if (results.error) {
                        await showErrorMessage(`Error Downloading Gateway Language resources!`, true);
                    }
                    else {
                        await this.gotoWorkFlowStep("loadTarget");
                        await this.setContext("loadedGlResources", true);
                        await showInformationMessage(`Gateway Language Resources Loaded`, true);
                    }
                    // await this.gotoWorkFlowStep("loadGlResources");
                    await this.setContext('selectedGL', glOptions);
                }
            }
            else {
                await showErrorMessage(`Target Bible has not been selected!`, true);
            }
        }));
        subscriptions.push(commandRegistration);
        commandRegistration = vscode_1.commands.registerCommand("checking-extension.loadTargetBible", async () => {
            console.log("checking-extension.loadTargetBible");
            const bookId = this.getContext('selectedBook');
            const targetOptions = this.getContext('targetBibleOptions');
            if (targetOptions) {
                const glOptions = this.getContext('selectedGL');
                const preRelease = this.getContext('preRelease');
                if (glOptions && glOptions.languageId && glOptions.owner) {
                    const catalog = (0, resourceUtils_1.getSavedCatalog)(preRelease) || [];
                    const targetLanguageId = targetOptions.languageId;
                    const targetBibleId = targetOptions.bibleId || "";
                    const targetOwner = targetOptions.owner;
                    const repoPath = (0, resourceUtils_1.getRepoPath)(targetLanguageId, targetBibleId, glOptions.languageId);
                    await showInformationMessage(`Downloading Target Bible ${targetOwner}/${targetLanguageId}/${targetBibleId}`);
                    const targetFoundPath = await (0, resourceUtils_1.downloadTargetBible)(targetOptions.bibleId, resourceUtils_1.resourcesPath, targetLanguageId, targetOwner, catalog, bookId, 'master');
                    if (targetFoundPath) {
                        console.log(`checking-extension.loadTargetBible - target Bible is at ${targetFoundPath}`);
                        const catalog = (0, resourceUtils_1.getSavedCatalog)(preRelease) || [];
                        const { repoInitSuccess, repoPath } = await this.doRepoInitAll(targetOptions.languageId, targetOptions.bibleId, glOptions.languageId, targetOptions.owner, glOptions.owner, catalog, bookId, preRelease);
                        await this.setContext("projectInitialized", repoInitSuccess);
                        if (repoInitSuccess) {
                            // navigate to new folder
                            const repoPathUri = vscode.Uri.file(repoPath);
                            await showInformationMessage(`Successfully initialized project at ${repoPath}`, true, 'You can now do checking by opening translationWords checks in `checking/twl` or translationNotes checks in `checking/tn`');
                            vscode.commands.executeCommand("vscode.openFolder", repoPathUri);
                        }
                    }
                    else {
                        await showErrorMessage(`Target Bible Failed to Load`, true);
                    }
                    await this.setContext("targetBibleLoaded", !!targetFoundPath);
                }
                else {
                    await showErrorMessage(`You must select Gateway Language Options first`, true);
                }
            }
            else {
                await showErrorMessage(`You must select a Target Bible first`, true);
            }
        });
        subscriptions.push(commandRegistration);
        commandRegistration = vscode_1.commands.registerCommand("checking-extension.downloadProject", executeWithRedirecting(async () => {
            console.log(`starting "checking-extension.downloadProject"`);
            const localRepoPath = await this.downloadCheckingProjectFromDCS();
            if (localRepoPath) {
                // navigate to new folder
                const repoPathUri = vscode.Uri.file(localRepoPath);
                vscode.commands.executeCommand("vscode.openFolder", repoPathUri);
            }
            console.log(`finished "checking-extension.downloadProject success=${!!localRepoPath}"`);
        }));
        subscriptions.push(commandRegistration);
        return subscriptions;
    }
    static async initializeWorkflow(preRelease = false) {
        await (0, fileUtils_1.delay)(100);
        await vscode.commands.executeCommand("resetGettingStartedProgress");
        await (0, fileUtils_1.delay)(100);
        // initialize configurations
        const catalog = (0, resourceUtils_1.getSavedCatalog)(preRelease);
        await this.setContext("createNewFolder", true);
        await this.setContext("selectedFolder", false);
        await this.setContext("fetchedCatalog", !!catalog);
        await this.setContext("selectedGL", null);
        await this.setContext("loadedGL", false);
        await this.setContext("loadedGlResources", false);
        await this.setContext("targetBibleOptions", null);
        await this.setContext("targetBibleLoaded", false);
        await this.setContext("projectInitialized", false);
        await this.setContext("preRelease", !!preRelease);
        await vscode.commands.executeCommand(`workbench.action.openWalkthrough`, `unfoldingWord.checking-extension#initChecking`, false);
        await (0, fileUtils_1.delay)(100);
    }
    static async showUserInformation(webviewPanel, options) {
        this.promptUserForOption(webviewPanel, options);
    }
    static async promptUserForOption(webviewPanel, options) {
        const _promptUserForOption = (options) => {
            const promise = new Promise((resolve) => {
                saveCallBack("promptUserForOption", resolve);
                webviewPanel.webview.postMessage({
                    command: "promptUserForOption",
                    text: "prompt User For Option",
                    data: options
                });
            });
            return promise;
        };
        const results = await _promptUserForOption(options);
        saveCallBack("promptUserForOption", null);
        return results;
    }
    static async createGlCheck(webviewPanel) {
        let success = false;
        let catalog = (0, resourceUtils_1.getSavedCatalog)(false);
        const preRelease = this.getContext('preRelease');
        let loadCatalog = true;
        if (catalog) {
            // prompt if we should load new catalog
            const data = await this.promptUserForOption(webviewPanel, { message: 'Do you wish to download the current catalog?', type: 'yes/No' });
            // @ts-ignore
            const reloadCatalog = !!data?.response;
            loadCatalog = reloadCatalog;
        }
        if (loadCatalog) {
            console.log("checking-extension.downloadCatalog");
            // show user we are loading new catalog
            this.showUserInformation(webviewPanel, { message: 'Downloading current catalog', busy: true });
            await (0, fileUtils_1.delay)(100);
            catalog = await (0, resourceUtils_1.getLatestResourcesCatalog)(resourceUtils_1.resourcesPath, preRelease);
            if (!catalog) {
                showErrorMessage(`Error Downloading Updated Resource Catalog!`, true);
                return {
                    errorMessage: `Error Downloading Updated Resource Catalog!`,
                    success: false
                };
            }
            (0, resourceUtils_1.saveCatalog)(catalog, preRelease);
        }
        //////////////////////////////////
        // Target language
        // @ts-ignore
        const targetLangChoices = (0, languages_2.getLanguagePrompts)((0, resourceUtils_1.getLanguagesInCatalog)(catalog));
        // prompt for GL language selection
        let data = await this.promptUserForOption(webviewPanel, { message: 'Select the target language:', type: 'option', choices: targetLangChoices });
        // @ts-ignore
        let targetLanguagePick = data?.responseStr;
        // @ts-ignore
        targetLanguagePick = (0, languages_2.getLanguageCodeFromPrompts)(targetLanguagePick) || 'en';
        if (!targetLanguagePick) {
            showErrorMessage(`No target language selected!`, true);
            return {
                errorMessage: `Error No target language selected!`,
                success: false
            };
        }
        await showInformationMessage(`Target Language selected ${targetLanguagePick}`);
        const targetOwners = (0, resourceUtils_1.findOwnersForLang)(catalog || [], targetLanguagePick);
        data = await this.promptUserForOption(webviewPanel, { message: 'Select the target organization:', type: 'option', choices: targetOwners });
        // @ts-ignore
        let targetOwnerPick = data?.responseStr;
        if (!targetOwnerPick) {
            showErrorMessage(`No target owner selected!`, true);
            return {
                errorMessage: `Error No target owner selected!`,
                success: false
            };
        }
        await showInformationMessage(`Target Language Owner selected ${targetOwnerPick}`);
        const resources = (0, resourceUtils_1.findResourcesForLangAndOwner)(catalog || [], targetLanguagePick, targetOwnerPick || '');
        const bibles = (0, resourceUtils_1.findBibleResources)(resources || []);
        const bibleIds = (0, resourceUtils_1.getResourceIdsInCatalog)(bibles || []);
        data = await this.promptUserForOption(webviewPanel, { message: 'Select the target Bible ID:', type: 'option', choices: bibleIds });
        // @ts-ignore
        let targetBibleIdPick = data?.responseStr;
        if (!targetBibleIdPick) {
            showErrorMessage(`No target Bible selected!`, true);
            return {
                errorMessage: `Error No target Bible selected!`,
                success: false
            };
        }
        await showInformationMessage(`Target Bible selected ${targetBibleIdPick}`);
        const targetBibleOptions = {
            languageId: targetLanguagePick,
            owner: targetOwnerPick,
            bibleId: targetBibleIdPick
        };
        // @ts-ignore
        const { manifest } = await (0, resourceUtils_1.fetchBibleManifest)('', targetBibleOptions.owner, targetBibleOptions.languageId, targetBibleOptions.bibleId, resourceUtils_1.resourcesPath, 'none', 'master');
        // @ts-ignore
        const bookIds = manifest?.projects?.map((project) => project.identifier);
        data = await this.promptUserForOption(webviewPanel, { message: 'Select the target Book:', type: 'option', choices: bookIds });
        const bookId = data?.responseStr;
        if (!bookId) {
            showErrorMessage(`No target Book selected!`, true);
            return {
                errorMessage: `Error No target Book selected!`,
                success: false
            };
        }
        //////////////////////////////////
        // select GL language
        const gatewayLanguages = (0, languages_2.getGatewayLanguages)();
        const glChoices = (0, languages_2.getLanguagePrompts)(gatewayLanguages);
        data = await this.promptUserForOption(webviewPanel, { message: 'Select the gateway checking language:', type: 'option', choices: glChoices });
        let gwLanguagePick = data?.responseStr;
        // @ts-ignore
        gwLanguagePick = (0, languages_2.getLanguageCodeFromPrompts)(gwLanguagePick) || "en";
        if (!gwLanguagePick) {
            showErrorMessage(`No GL checking language selected!`, true);
            return {
                errorMessage: `Error GL checking language selected!`,
                success: false
            };
        }
        await showInformationMessage(`GL checking language selected ${gwLanguagePick}`);
        const owners = (0, resourceUtils_1.findOwnersForLang)(catalog || [], gwLanguagePick);
        data = await this.promptUserForOption(webviewPanel, { message: 'Select the gateway checking organization:', type: 'option', choices: owners });
        const gwOwnerPick = data?.responseStr;
        if (!gwOwnerPick) {
            showErrorMessage(`No GL checking owner selected!`, true);
            return {
                errorMessage: `Error No GL checking owner selected!`,
                success: false
            };
        }
        await showInformationMessage(`GL checking language selected ${gwLanguagePick}`);
        this.showUserInformation(webviewPanel, { message: 'Initializing Project', busy: true });
        const glOptions = {
            languageId: gwLanguagePick,
            owner: gwOwnerPick
        };
        const results = await this.loadResourcesWithProgress(glOptions.languageId, glOptions.owner || '', resourceUtils_1.resourcesPath, preRelease, bookId);
        // @ts-ignore
        if (results.error) {
            showErrorMessage(`Error Downloading Gateway Language resources!`, true);
            return {
                errorMessage: `Error Downloading Gateway Language resources!`,
                success: false
            };
        }
        await showInformationMessage(`Gateway Language Resources Loaded`, true);
        const targetLanguageId = targetBibleOptions.languageId;
        const targetBibleId = targetBibleOptions.bibleId || "";
        const targetOwner = targetBibleOptions.owner;
        await showInformationMessage(`Downloading Target Bible ${targetOwner}/${targetLanguageId}/${targetBibleId}`);
        // @ts-ignore
        const targetFoundPath = await (0, resourceUtils_1.downloadTargetBible)(targetBibleId, resourceUtils_1.resourcesPath, targetLanguageId, targetOwner, catalog, bookId, 'master');
        if (!targetFoundPath) {
            await showErrorMessage(`Target Bible Failed to Load`, true);
            showErrorMessage(`Target Bible Failed to Load`, true);
            return {
                errorMessage: `Target Bible Failed to Load`,
                success: false
            };
        }
        const { repoInitSuccess, repoPath } = await this.doRepoInitAll(targetLanguageId, targetBibleId, glOptions.languageId, targetOwner, glOptions.owner, catalog, bookId, preRelease);
        if (!repoInitSuccess) {
            await showErrorMessage(`Failed to Initialize Checking Project`, true);
            showErrorMessage(`Failed to Initialize Checking Project`, true);
            return {
                errorMessage: `Failed to Initialize Checking Project`,
                success: false
            };
        }
        // navigate to new folder
        const repoPathUri = vscode.Uri.file(repoPath);
        await showInformationMessage(`Successfully initialized project at ${repoPath}`, true, 'You can now do checking by opening translationWords checks in `checking/twl` or translationNotes checks in `checking/tn`');
        vscode.commands.executeCommand("vscode.openFolder", repoPathUri);
        return { success: true };
    }
    static setConfiguration(key, value) {
        vscode.workspace.getConfiguration("checking-extension").update(key, value);
    }
    static getConfiguration(key) {
        return vscode.workspace.getConfiguration("checking-extension").get(key);
    }
    static async setContext(key, value) {
        await vscode.commands.executeCommand('setContext', key, value);
        // @ts-ignore
        this.currentState[key] = value;
        await (0, fileUtils_1.delay)(100);
    }
    static getContext(key) {
        // @ts-ignore
        return this.currentState[key];
    }
    static async gotoWorkFlowStep(step) {
        await (0, fileUtils_1.delay)(100);
        // const _step = `unfoldingWord.checking-extension#${step}`;
        await vscode.commands.executeCommand(`workbench.action.openWalkthrough`, {
            category: `unfoldingWord.checking-extension#initChecking`,
            step,
        }, false);
        await (0, fileUtils_1.delay)(100);
    }
    static async openWorkspace() {
        let workspaceFolder;
        const openFolder = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: "Choose project folder",
        });
        if (openFolder && openFolder.length > 0) {
            await vscode.commands.executeCommand("vscode.openFolder", openFolder[0], false);
            workspaceFolder = vscode.workspace.workspaceFolders
                ? vscode.workspace.workspaceFolders[0]
                : undefined;
        }
        return workspaceFolder;
    }
    static async initializeChecker(navigateToFolder = false) {
        await showInformationMessage("initializing Checker");
        const { projectPath, repoFolderExists } = await getWorkSpaceFolder();
        if (!repoFolderExists) {
            await this.initializeEmptyFolder();
        }
        else {
            let results;
            if (projectPath) {
                results = (0, resourceUtils_1.isRepoInitialized)(projectPath, resourceUtils_1.resourcesPath, null);
                // @ts-ignore
                const isValidBible = results.repoExists && results.manifest?.dublin_core;
                const initBibleRepo = isValidBible && !results.metaDataInitialized
                    && !results.checksInitialized && results.bibleBooksLoaded;
                if (initBibleRepo) {
                    return await this.initializeBibleFolder(results, projectPath);
                }
                else if (results.repoExists) {
                    if (results.metaDataInitialized && results.checksInitialized) {
                        return await showErrorMessage(`repo already has checking setup!`, true);
                    }
                    else {
                    }
                }
            }
        }
        await showErrorMessage(`repo already exists - but not valid!`, true);
    }
    static async initializeBibleFolder(results, projectPath, preRelease = false) {
        // @ts-ignore
        const dublin_core = results.manifest?.dublin_core;
        const targetLanguageId = dublin_core?.language?.identifier;
        const targetBibleId = dublin_core?.identifier;
        const targetOwner = "";
        let glLanguageId = '';
        let glOwner = '';
        let catalog = null;
        // @ts-ignore
        if (results?.glOptions) {
            catalog = (0, resourceUtils_1.getSavedCatalog)(preRelease);
            // @ts-ignore
            glLanguageId = results.glOptions.languageId;
            // @ts-ignore
            glOwner = results.glOptions.owner;
        }
        else {
            const options = await this.getGatewayLangSelection(preRelease);
            if (!(options && options.gwLanguagePick && options.gwOwnerPick)) {
                await showErrorMessage(`Options invalid: ${options}`, true);
                return null;
            }
            catalog = options.catalog;
            glLanguageId = options.gwLanguagePick;
            glOwner = options.gwOwnerPick;
        }
        const repoInitSuccess = await this.doRepoInit(projectPath, targetLanguageId, targetBibleId, glLanguageId, targetOwner, glOwner, catalog, null, preRelease);
        if (repoInitSuccess) {
            await showInformationMessage(`Checking has been set up in project`);
        }
        else {
            await showErrorMessage(`repo init failed!`, true);
        }
        return repoInitSuccess;
    }
    static async initializeEmptyFolder(preRelease = false) {
        const options = await this.getCheckingOptions();
        if (options && options.gwLanguagePick && options.gwOwnerPick) {
            const { catalog, gwLanguagePick: glLanguageId, gwOwnerPick: glOwner, targetLanguagePick: targetLanguageId, targetOwnerPick: targetOwner, targetBibleIdPick: targetBibleId, } = options;
            const { repoInitSuccess, repoPath, } = await this.doRepoInitAll(targetLanguageId, targetBibleId, glLanguageId, targetOwner, glOwner, catalog, null, preRelease);
            let navigateToFolder = repoInitSuccess;
            if (!repoInitSuccess) {
                await showErrorMessage(`repo init failed!`, true);
                // const repoExists = fileExists(repoPath)
                // if (repoExists) {
                //     navigateToFolder = true // if we created the folder, even if it failed to add checks, navigate to it
                // }
            }
            if (navigateToFolder) {
                const uri = vscode.Uri.file(repoPath);
                await vscode.commands.executeCommand("vscode.openFolder", uri);
            }
        }
        else {
            await showErrorMessage(`Options invalid: ${options}`, true);
        }
    }
    static async doRepoInitAll(targetLanguageId, targetBibleId, glLanguageId, targetOwner, glOwner, catalog, bookId, preRelease = false) {
        let repoInitSuccess = false;
        const repoPath = (0, resourceUtils_1.getRepoPath)(targetLanguageId, targetBibleId || "", glLanguageId, undefined, bookId || '');
        const repoExists = (0, fileUtils_1.fileExists)(repoPath);
        if (!repoExists) {
            if (targetLanguageId && targetBibleId && targetOwner) {
                repoInitSuccess = await this.doRepoInit(repoPath, targetLanguageId, targetBibleId, glLanguageId, targetOwner, glOwner, catalog, bookId, preRelease);
            }
            else {
                await showErrorMessage(`Cannot create project, target language not selected ${{ targetLanguageId, targetBibleId, targetOwner }}`, true);
            }
        }
        else {
            await showErrorMessage(`Cannot create project, folder already exists at ${repoPath}`, true);
        }
        return { repoInitSuccess, repoPath };
    }
    static async doRepoInit(repoPath, targetLanguageId, targetBibleId, glLanguageId, targetOwner, glOwner, catalog, bookId, preRelease = false) {
        let repoInitSuccess = false;
        if (glLanguageId && glOwner) {
            await showInformationMessage(`Initializing project which can take a while if resources have to be downloaded, at ${repoPath}`);
            // @ts-ignore
            const results = await this.initProjectWithProgress(repoPath, targetLanguageId, targetOwner, targetBibleId, glLanguageId, glOwner, catalog, bookId, preRelease);
            // @ts-ignore
            if (results.success) {
                let validResources = true;
                let missingMessage = '';
                // verify that we have the necessary resources
                for (const projectId of ['twl', 'tn']) {
                    const OT = false;
                    const NT = true;
                    let testamentsToCheck = [OT, NT];
                    if (bookId) {
                        const _isNT = (0, BooksOfTheBible_1.isNT)(bookId);
                        testamentsToCheck = [_isNT];
                    }
                    for (const _isNT of testamentsToCheck) {
                        const _bookId = bookId || (0, resourceUtils_1.getBookForTestament)(repoPath, _isNT);
                        if (_bookId) {
                            const _resources = (0, resourceUtils_1.getResourcesForChecking)(repoPath, resourceUtils_1.resourcesPath, projectId, _bookId);
                            // @ts-ignore
                            if (!_resources.validResources) {
                                const testament = _isNT ? 'NT' : 'OT';
                                const message = `Missing ${projectId} needed ${testament} resources`;
                                // @ts-ignore
                                missingMessage = missingMessage + `${message}\n${_resources.errorMessage}\n`;
                                validResources = false;
                            }
                        }
                    }
                }
                if (validResources) {
                    repoInitSuccess = true;
                }
                else {
                    await showErrorMessage(`Missing resources resources at ${repoPath}`, true, missingMessage);
                }
            }
            else {
                // @ts-ignore
                await showErrorMessage(results.errorMsg);
                await showErrorMessage(`Failed to initialize project at ${repoPath}`, true);
            }
            if (!repoInitSuccess) {
                console.log(`updateProgress - initialization failed - cleaning up`);
                (0, resourceUtils_1.cleanUpFailedCheck)(repoPath);
            }
        }
        else {
            await showErrorMessage(`Cannot create project, gateway language not selected ${{ glLanguageId, glOwner }}`, true);
        }
        return repoInitSuccess;
    }
    static async loadResourcesWithProgress(languageId, owner, resourcesPath, preRelease = false, bookId = '') {
        const increment = 5;
        const promise = new Promise((resolve) => {
            vscode.window.withProgress({
                // location: vscode.ProgressLocation.Window,
                // this will show progress bar, but times out
                location: vscode.ProgressLocation.Notification,
                title: 'Downloading GL resources...',
                cancellable: false
            }, async (progressTracker) => {
                async function updateProgress(message) {
                    console.log(`updateProgress - ${message}`);
                    progressTracker.report({ increment });
                    await showInformationMessage(message);
                    // await delay(200)
                }
                progressTracker.report({ increment });
                await (0, fileUtils_1.delay)(100);
                const catalog = (0, resourceUtils_1.getSavedCatalog)(preRelease);
                await (0, fileUtils_1.delay)(100);
                const results = await (0, resourceUtils_1.downloadLatestLangHelpsResourcesFromCatalog)(catalog, languageId, owner, resourcesPath, updateProgress, preRelease, bookId);
                progressTracker.report({ increment });
                await (0, fileUtils_1.delay)(100);
                resolve(results);
            });
        });
        return promise;
    }
    static async initProjectWithProgress(repoPath, targetLanguageId, targetOwner, targetBibleId, glLanguageId, glOwner, catalog, bookId, preRelease = false) {
        const increment = 5;
        const promise = new Promise((resolve) => {
            vscode.window.withProgress({
                // location: vscode.ProgressLocation.Window,
                // this will show progress bar, but times out
                location: vscode.ProgressLocation.Notification,
                title: 'Downloading GL resources...',
                cancellable: false
            }, async (progressTracker) => {
                async function updateProgress(message) {
                    message = message || '';
                    console.log(`updateProgress - ${message}`);
                    progressTracker.report({ increment });
                    await showInformationMessage(message);
                    // await delay(200)
                }
                progressTracker.report({ increment });
                await (0, fileUtils_1.delay)(100);
                const results = await (0, resourceUtils_1.initProject)(repoPath, targetLanguageId, targetOwner || "", targetBibleId || "", glLanguageId, glOwner || "", resourceUtils_1.resourcesPath, null, catalog, updateProgress, bookId || '', preRelease);
                progressTracker.report({ increment });
                await (0, fileUtils_1.delay)(100);
                resolve(results);
            });
        });
        return promise;
    }
    static viewType = "checking-extension.translationChecker";
    /**
     * Called when our custom editor is opened.
     */
    async resolveCustomTextEditor(document, webviewPanel, _token) {
        // Setup initial content for the webview
        const assetsPath = vscode.Uri.joinPath(this.context.extensionUri, 'webview-ui/build/assets');
        this.fixCSS(assetsPath);
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.context.extensionUri,
                assetsPath,
            ],
        };
        /**
         * make sure localization is initialized and check for last locale setting
         */
        const initCurrentLocale = async () => {
            if (!(0, languages_1.getCurrentLanguageCode)()) {
                let currentLocale = languages_1.DEFAULT_LOCALE;
                const secretStorage = getSecretStorage();
                const value = await secretStorage.get(languages_1.LOCALE_KEY);
                if (value) {
                    currentLocale = value;
                }
                (0, languages_1.setLocale)(currentLocale);
            }
        };
        /**
         * called whenever source document file path changes or content changes
         * @param firstLoad - true if this is an initial load, otherwise just a change of document content which will by handled by the webview
         */
        const updateWebview = (firstLoad) => {
            if (firstLoad) { // only update if file location changed
                initCurrentLocale().then(() => {
                    webviewPanel.webview.postMessage({
                        command: "update",
                        data: this.getCheckingResources(document),
                    });
                });
            }
            else {
                console.log(`updateWebview - not first load`);
            }
        };
        const saveCheckingData = (text, newState) => {
            // @ts-ignore
            const currentCheck = newState?.currentCheck;
            // @ts-ignore
            const selections = currentCheck?.selections;
            console.log(`saveSelection - new selections`, selections);
            // @ts-ignore
            const currentContextId = currentCheck?.contextId;
            console.log(`saveSelection - current context data`, currentContextId);
            let checks = document.getText();
            if (checks.trim().length) {
                const checkingData = JSON.parse(checks);
                let foundCheck = this.findCheckToUpdate(currentContextId, checkingData);
                if (foundCheck) {
                    console.log(`saveCheckingData - found match`, foundCheck);
                    // update data in found match
                    // @ts-ignore
                    foundCheck.selections = selections;
                    // @ts-ignore
                    foundCheck.reminders = currentCheck?.reminders;
                    // @ts-ignore
                    foundCheck.comments = currentCheck?.comments;
                    // @ts-ignore
                    foundCheck.nothingToSelect = currentCheck?.nothingToSelect;
                    // @ts-ignore
                    foundCheck.verseEdits = currentCheck?.verseEdits;
                    // @ts-ignore
                    foundCheck.invalidated = currentCheck?.invalidated;
                    this.updateChecks(document, checkingData); // save with updated
                }
                else {
                    console.error(`saveCheckingData - did not find match`, foundCheck);
                }
            }
        };
        const getSecretStorage = () => {
            if (!CheckingProvider.secretStorage) {
                CheckingProvider.secretStorage = this.context.secrets;
            }
            return CheckingProvider.secretStorage;
        };
        const createNewOlCheck = (text, data) => {
            (0, fileUtils_1.delay)(100).then(async () => {
                console.log(`createNewOlCheck: ${text} - ${data}`);
                const results = await CheckingProvider.createGlCheck(webviewPanel);
                // send back value
                webviewPanel.webview.postMessage({
                    command: "createNewOlCheckResponse",
                    data: results,
                });
            });
        };
        const uploadToDCS = (text, data) => {
            // @ts-ignore
            const token = data?.token;
            // @ts-ignore
            const owner = data?.owner;
            // @ts-ignore
            const server = data?.server;
            const filePath = document.fileName;
            const bookId = (0, resourceUtils_1.getBookIdFromPath)(filePath) || '';
            (0, fileUtils_1.delay)(100).then(async () => {
                console.log(`uploadToDCS: ${text} - ${owner}`);
                await vscode.workspace.saveAll(); // write document changes to file system
                const { projectPath, repoFolderExists } = await getWorkSpaceFolder();
                const metaData = (0, resourceUtils_1.getMetaData)(projectPath || '');
                const { targetLanguageId, targetBibleId, gatewayLanguageId, bookId } = metaData?.["translation.checker"];
                const repo = (0, network_1.getRepoName)(targetLanguageId, targetBibleId, gatewayLanguageId, bookId);
                const statusUpdates = (message) => {
                    webviewPanel.webview.postMessage({
                        command: "uploadToDcsStatusResponse",
                        data: message,
                    });
                };
                (0, network_1.setStatusUpdatesCallback)(statusUpdates);
                const results = await (0, network_1.uploadRepoToDCS)(server, owner, repo, token, projectPath || '');
                (0, network_1.setStatusUpdatesCallback)(null);
                // send back value
                webviewPanel.webview.postMessage({
                    command: "uploadToDCSResponse",
                    data: results,
                });
            });
        };
        const getSecret = (text, data) => {
            const _getSecret = async (text, key) => {
                console.log(`getSecret: ${text}, ${data} - key ${key}`);
                let valueObject;
                const secretStorage = getSecretStorage();
                if (secretStorage && key) {
                    const value = await secretStorage.get(key);
                    valueObject = value && JSON.parse(value);
                }
                // send back value
                webviewPanel.webview.postMessage({
                    command: "getSecretResponse",
                    data: {
                        key,
                        valueObject,
                    },
                });
            };
            // @ts-ignore
            const key = data?.key || '';
            _getSecret(text, key);
        };
        const saveSecret = (text, data) => {
            console.log(`saveSecret: ${text}`);
            const secretStorage = getSecretStorage();
            // @ts-ignore
            const key = data?.key || '';
            // @ts-ignore
            const value = data?.value;
            if (secretStorage && key) {
                // @ts-ignore
                const valueObject = value ? JSON.stringify(value) : null;
                secretStorage.store(key, valueObject || '');
            }
        };
        const firstLoad = (text, data) => {
            console.log(`firstLoad: ${text}`);
            updateWebview(true);
        };
        const setLocale_ = (text, data) => {
            // @ts-ignore
            const value = data?.value || languages_1.DEFAULT_LOCALE;
            const code = value.split('-').pop();
            console.log(`setLocale: ${text},${value}`);
            (0, languages_1.setLocale)(code);
            // save current locale for next run
            const secretStorage = getSecretStorage();
            secretStorage.store(languages_1.LOCALE_KEY, code);
            updateWebview(true); // refresh display
        };
        const changeTargetVerse_ = (text, data) => {
            console.log(`changeTargetVerse: ${data}`);
            // @ts-ignore
            const { bookId, chapter, verse, newVerseText, newVerseObjects } = data;
            (0, fileUtils_1.delay)(100).then(async () => {
                const { projectPath, repoFolderExists } = await getWorkSpaceFolder();
                if (repoFolderExists && projectPath) {
                    await (0, resourceUtils_1.changeTargetVerse)(projectPath, bookId, chapter, verse, newVerseText, newVerseObjects);
                }
                else {
                    console.warn(`changeTargetVerse_() projectPath '${projectPath}' does not exist`);
                }
            });
        };
        const saveAppSettings = (text, data) => {
            // @ts-ignore
            const newSettings = data?.settings;
            (0, fileUtils_1.delay)(100).then(async () => {
                const { projectPath, repoFolderExists } = await getWorkSpaceFolder();
                if (repoFolderExists && projectPath) {
                    const metaData = (0, resourceUtils_1.getMetaData)(projectPath || '');
                    const _metaData = metaData?.["translation.checker"];
                    _metaData.settings = newSettings;
                    const outputPath = path_1.default.join(projectPath, 'metadata.json');
                    fs.outputJsonSync(outputPath, metaData, { spaces: 2 });
                }
                else {
                    console.warn(`saveAppSettings() projectPath '${projectPath}' does not exist`);
                }
            });
        };
        const promptUserForOptionResponse = (text, data) => {
            console.log(`promptUserForOptionResponse: ${text}`);
            const key = "promptUserForOption";
            const callback = getCallBack(key);
            if (callback) {
                // @ts-ignore
                callback(data);
                saveCallBack(key, null); // clear callback after use
            }
            else {
                console.error(`No handler for promptUserForOptionResponse(${key}) response`);
            }
        };
        const messageEventHandlers = (message) => {
            const { command, text, data } = message;
            // console.log(`messageEventHandlers ${command}: ${text}`)
            const commandToFunctionMapping = {
                ["changeTargetVerse"]: changeTargetVerse_,
                ["getSecret"]: getSecret,
                ["createNewOlCheck"]: createNewOlCheck,
                ["loaded"]: firstLoad,
                ["saveAppSettings"]: saveAppSettings,
                ["saveCheckingData"]: saveCheckingData,
                ["saveSecret"]: saveSecret,
                ["setLocale"]: setLocale_,
                ["uploadToDCS"]: uploadToDCS,
                ["promptUserForOptionResponse"]: promptUserForOptionResponse,
            };
            const commandFunction = commandToFunctionMapping[command];
            if (commandFunction) {
                commandFunction(text, data);
            }
            else {
                console.error(`Command ${command}: ${text} has no handler`);
            }
        };
        new TranslationCheckingPanel_1.TranslationCheckingPanel(webviewPanel, this.context.extensionUri, messageEventHandlers).initializeWebviewContent();
        // Hook up event handlers so that we can synchronize the webview with the text document.
        //
        // The text document acts as our model, so we have to sync change in the document to our
        // editor and sync changes in the editor back to the document.
        //
        // Remember that a single text document can also be shared between multiple custom
        // editors (this happens for example when you split a custom editor)
        const changeDocumentSubscription = vscode_1.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview(false);
            }
        });
        // Make sure we get rid of the listener when our editor is closed.
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
        // TODO: Put Global BCV function here
    }
    /**
     * open.css file and fix paths to assets.
     * @param assetsPath
     * @private
     */
    fixCSS(assetsPath) {
        console.log(`fixCSS - assetsPath`, assetsPath.fsPath);
        const runTimeFolder = vscode.Uri.joinPath(assetsPath, '..');
        const cssPath = vscode.Uri.joinPath(assetsPath, "index.css");
        console.log(`fixCSS - cssPath.path`, cssPath.path);
        console.log(`fixCSS - cssPath.fsPath`, cssPath.fsPath);
        try {
            const data = fs.readFileSync(cssPath.fsPath, "UTF-8")?.toString() || '';
            console.log(`data.length`, data?.length);
            const { changes, parts, newCss } = (0, fileUtils_1.fixUrls)(data, runTimeFolder.fsPath);
            if (changes) {
                fs.outputFileSync(cssPath.fsPath, newCss, 'UTF-8');
            }
        }
        catch (e) {
            console.error(`fixCSS - cannot fix index.css at ${cssPath}`, e);
        }
    }
    /**
     * search checkingData for check that matches currentContextId and return location within checkingData
     * @param currentContextId
     * @param checkingData
     */
    findCheckToUpdate(currentContextId, checkingData) {
        let foundCheck = null;
        if (currentContextId && checkingData) {
            // @ts-ignore
            const _checkId = currentContextId?.checkId;
            // @ts-ignore
            const _groupId = currentContextId?.groupId;
            // @ts-ignore
            const _quote = currentContextId?.quote;
            // @ts-ignore
            const _occurrence = currentContextId?.occurrence;
            // @ts-ignore
            const _reference = currentContextId?.reference;
            for (const catagoryId of Object.keys(checkingData)) {
                if (catagoryId === 'manifest') { // skip over manifest
                    continue;
                }
                // @ts-ignore
                const groups = checkingData[catagoryId]?.groups || {};
                const desiredGroup = groups[_groupId];
                if (!desiredGroup)
                    continue; // if desired group is not in this category, then skip to next category
                const checks = desiredGroup;
                const index = checks.findIndex(item => {
                    // @ts-ignore
                    const contextId = item?.contextId;
                    // @ts-ignore
                    if ((_checkId === contextId?.checkId) && (_groupId === contextId?.groupId)) {
                        if ((0, deep_equal_1.default)(_reference, contextId?.reference)) {
                            if ((0, deep_equal_1.default)(_quote, contextId?.quote) && (_occurrence === contextId?.occurrence)) {
                                return true;
                            }
                        }
                    }
                    return false;
                });
                if (index >= 0) {
                    foundCheck = checks[index];
                    break;
                }
                if (foundCheck) {
                    break;
                }
            }
        }
        if (!foundCheck) {
            console.warn(`findCheckToUpdate - check not found`, currentContextId);
        }
        return foundCheck;
    }
    /**
     * Try to get a current document as a scripture TSV object
     */
    getCheckingResources(document) {
        let checks = document.getText();
        if (checks.trim().length === 0) {
            return {};
        }
        const filePath = document.fileName;
        if (!filePath) {
            return {};
        }
        try {
            const resources = (0, resourceUtils_1.loadResources)(filePath) || {};
            checks = JSON.parse(checks);
            // @ts-ignore
            resources.checks = checks;
            return resources;
        }
        catch {
            throw new Error("getCheckingResources - Could not get document as json. Content is not valid check file in json format");
        }
        return {};
    }
    updateChecks(document, checkingData) {
        const newDocumentText = JSON.stringify(checkingData, null, 2);
        const edit = new vscode.WorkspaceEdit();
        // Just replace the entire document every time for this example extension.
        // A more complete extension should compute minimal edits instead.
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newDocumentText);
        return vscode.workspace.applyEdit(edit);
    }
    static async getCheckingOptions() {
        const options = await this.getGatewayLangSelection();
        if (!options) {
            return null;
        }
        const { catalog, gwLanguagePick, gwOwnerPick } = options;
        let { targetLanguagePick, targetOwnerPick, targetBibleIdPick } = await this.getTargetLanguageSelection(catalog);
        return {
            catalog,
            gwLanguagePick,
            gwOwnerPick,
            targetLanguagePick,
            targetOwnerPick,
            targetBibleIdPick,
        };
    }
    static async getTargetLanguageSelection(catalog) {
        //////////////////////////////////
        // Target language
        // @ts-ignore
        const targetLangChoices = (0, languages_2.getLanguagePrompts)((0, resourceUtils_1.getLanguagesInCatalog)(catalog));
        let targetLanguagePick = await vscode.window.showQuickPick(targetLangChoices, {
            placeHolder: "Select the target language:",
        });
        // @ts-ignore
        targetLanguagePick = (0, languages_2.getLanguageCodeFromPrompts)(targetLanguagePick) || 'en';
        await showInformationMessage(`Target language selected ${targetLanguagePick}`);
        const targetOwners = (0, resourceUtils_1.findOwnersForLang)(catalog || [], targetLanguagePick);
        const targetOwnerPick = await vscode.window.showQuickPick(targetOwners, {
            placeHolder: "Select the target organization:",
        });
        await showInformationMessage(`Target owner selected ${targetOwnerPick}`);
        const resources = (0, resourceUtils_1.findResourcesForLangAndOwner)(catalog || [], targetLanguagePick, targetOwnerPick || '');
        const bibles = (0, resourceUtils_1.findBibleResources)(resources || []);
        const bibleIds = (0, resourceUtils_1.getResourceIdsInCatalog)(bibles || []);
        const targetBibleIdPick = await vscode.window.showQuickPick(bibleIds, {
            placeHolder: "Select the target Bible ID:",
        });
        await showInformationMessage(`Bible selected ${targetBibleIdPick}`);
        return { targetLanguagePick, targetOwnerPick, targetBibleIdPick };
    }
    static async downloadCheckingProjectFromDCS() {
        await showInformationMessage(`Searching for Checking Projects on server`);
        const server = (0, resourceUtils_1.getServer)();
        const results = await (0, gitUtils_1.getCheckingRepos)(server);
        const repos = results?.repos || [];
        let repoPick = '';
        const ownerNames = (0, network_1.getOwnersFromRepoList)(repos);
        console.log(`ownerNames length ${ownerNames?.length}`, ownerNames);
        if (!ownerNames?.length) {
            await showInformationMessage(`No Owners found on ${server}`, true, `No Owners found on ${server}.  Check with your network Administrator`);
            return '';
        }
        let ownerPick = await vscode.window.showQuickPick(ownerNames, {
            placeHolder: "Select the owner for Project download:",
        });
        if (ownerPick) {
            await showInformationMessage(`Owner selected ${ownerPick}`);
            const filteredRepos = (0, network_1.getOwnerReposFromRepoList)(repos, ownerPick);
            const repoNames = filteredRepos.map(repo => repo.name).sort();
            console.log(`repoNames length ${repoNames?.length}`, repoNames);
            if (!repoNames?.length) {
                await showInformationMessage(`No Checking repos found on ${server}/${ownerPick}`, true, `No Checking repos found on ${server}/${ownerPick}. Try a different owner`);
                return '';
            }
            repoPick = await vscode.window.showQuickPick(repoNames, {
                placeHolder: "Select the repo for Project download:",
            }) || '';
            if (repoPick) {
                await showInformationMessage(`Repo selected ${repoPick}`);
                let success = false;
                let madeBackup = false;
                (0, fileUtils_1.delay)(5000).then(() => {
                    showInformationMessage(`Downloading ${ownerPick}/${repoPick} from server`);
                });
                let results = await (0, network_1.downloadRepoFromDCS)(server || '', ownerPick || '', repoPick || '', false);
                if (results.error) {
                    if (results.errorLocalProjectExists) {
                        const backupOption = 'Backup Current Repo and Download';
                        const response = await vscode.window.showWarningMessage('There is already a project with the same name on your computer.  What do you want to do?', { modal: true }, backupOption);
                        console.log('User selected:', response);
                        if (response !== backupOption) {
                            return '';
                        }
                        madeBackup = true;
                        await showInformationMessage(`Downloading Checking Project ${ownerPick}/${repoPick} from server`);
                        results = await (0, network_1.downloadRepoFromDCS)(server || '', ownerPick || '', repoPick || '', true);
                        if (!results.error) {
                            success = true;
                        }
                    }
                }
                else {
                    success = true;
                }
                if (!success) {
                    await showErrorMessage(`Could not download repo ${ownerPick}/${repoPick}`, true);
                }
                else {
                    const _backupRepoPath = (0, resourceUtils_1.removeHomePath)(results?.backupRepoPath);
                    const _localRepoPath = (0, resourceUtils_1.removeHomePath)(results?.localRepoPath);
                    const detail = madeBackup ? `The existing project was moved to ${_backupRepoPath}.` : '';
                    await showInformationMessage(`Project successfully downloaded to ${_localRepoPath}.`, true, detail);
                    return results?.localRepoPath || '';
                }
            }
        }
        return '';
    }
    static getDoor43ResourcesCatalogWithProgress(resourcesPath, preRelease = false) {
        return new Promise((resolve) => {
            vscode_1.window.showInformationMessage("Checking DCS for GLs - can take minutes");
            vscode.window.withProgress({
                // location: vscode.ProgressLocation.Notification,
                // this will show progress bar, but times out
                location: vscode.ProgressLocation.Notification,
                title: 'Downloading Catalog...',
                cancellable: false
            }, async (progressTracker) => {
                async function updateProgress(message) {
                    console.log(`updateProgress - ${message}`);
                    progressTracker.report({ increment: 50 });
                    await (0, fileUtils_1.delay)(100);
                }
                progressTracker.report({ increment: 25 });
                await (0, fileUtils_1.delay)(100);
                const catalog = await (0, resourceUtils_1.getLatestResourcesCatalog)(resourcesPath, preRelease);
                progressTracker.report({ increment: 10 });
                await (0, fileUtils_1.delay)(100);
                resolve(catalog);
            });
        });
    }
    static async checkWorkspace() {
        let repoExists = false;
        let isValidBible = false;
        let isCheckingInitialized = true;
        const { projectPath, repoFolderExists } = await getWorkSpaceFolder();
        if (repoFolderExists && projectPath) {
            repoExists = true;
            const results = (0, resourceUtils_1.isRepoInitialized)(projectPath, resourceUtils_1.resourcesPath, null);
            // @ts-ignore
            isValidBible = results.repoExists && results.manifest?.dublin_core && results.bibleBooksLoaded;
            isCheckingInitialized = isValidBible && results.metaDataInitialized && results.checksInitialized;
        }
        return {
            repoExists,
            isValidBible,
            isCheckingInitialized,
            repoFolderExists,
            projectPath
        };
    }
    static async promptUpdateSpecificFolder() {
        const choices = {
            'new': `Create New Checking Project`,
            'select': 'Select Existing Bible Project to Check'
        };
        const { pickedKey } = await this.doPrompting('Which Bible Project to Check?', choices);
        if (pickedKey === 'new') {
            return false;
        }
        else {
            await (0, fileUtils_1.delay)(100);
            await this.openWorkspace();
            return true;
        }
    }
    static async doPrompting(title, choices) {
        const keys = Object.keys(choices);
        // @ts-ignore
        const prompts = keys.map(key => choices[key]);
        await (0, fileUtils_1.delay)(100);
        const pickedText = await vscode.window.showQuickPick(prompts, {
            placeHolder: title,
        });
        // @ts-ignore
        const pickedKey = keys.find(key => pickedText === choices[key]) || '';
        return { pickedKey, pickedText };
    }
    static async getGatewayLangSelection(preRelease = false) {
        let catalog = (0, resourceUtils_1.getSavedCatalog)(preRelease);
        try {
            if (!catalog) {
                await showInformationMessage("Checking DCS for GLs - can take minutes");
                // @ts-ignore
                catalog = await this.getDoor43ResourcesCatalogWithProgress(resourceUtils_1.resourcesPath, preRelease = false);
                // @ts-ignore
                (0, resourceUtils_1.saveCatalog)(catalog, preRelease);
                await showInformationMessage(`Retrieved DCS catalog ${catalog?.length} items`);
            }
            else {
                await showInformationMessage(`Using cached DCS catalog ${catalog?.length} items`);
            }
        }
        catch (e) {
            await showInformationMessage("failed to retrieve DCS catalog");
        }
        //////////////////////////////////
        // GL language
        const gatewayLanguages = (0, languages_2.getGatewayLanguages)();
        const glChoices = (0, languages_2.getLanguagePrompts)(gatewayLanguages);
        let gwLanguagePick = await vscode.window.showQuickPick(glChoices, {
            placeHolder: "Select the gateway checking language:",
        });
        // @ts-ignore
        gwLanguagePick = (0, languages_2.getLanguageCodeFromPrompts)(gwLanguagePick) || "en";
        await showInformationMessage(`GL checking language selected ${gwLanguagePick}`);
        const owners = (0, resourceUtils_1.findOwnersForLang)(catalog || [], gwLanguagePick);
        const gwOwnerPick = await vscode.window.showQuickPick(owners, {
            placeHolder: "Select the gateway checking organization:",
        });
        await showInformationMessage(`GL checking owner selected ${gwOwnerPick}`);
        return {
            catalog,
            gwLanguagePick,
            gwOwnerPick
        };
    }
    static async getBookSelection(targetBibleOptions) {
        // @ts-ignore
        const { manifest } = await (0, resourceUtils_1.fetchBibleManifest)('', targetBibleOptions.owner, targetBibleOptions.languageId, targetBibleOptions.bibleId, resourceUtils_1.resourcesPath, 'none', 'master');
        // @ts-ignore
        const bookIds = manifest?.projects?.map((project) => project.identifier);
        // const bookIds = Object.keys(ALL_BIBLE_BOOKS)
        let bookPick = '';
        if (bookIds?.length) {
            bookPick = await vscode.window.showQuickPick(bookIds, {
                placeHolder: "Select the book to check:",
            });
            await showInformationMessage(`Book selected ${bookPick}`);
        }
        else {
            await showErrorMessage(`Error getting book list for bible!`, true);
        }
        return {
            bookPick
        };
    }
}
exports.CheckingProvider = CheckingProvider;
//# sourceMappingURL=CheckingProvider.js.map