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
const assert = __importStar(require("assert"));
const path = __importStar(require("path"));
const fileUtils_1 = require("../utilities/fileUtils");
// import * as myExtension from '../extension';
suite('fixUrls', () => {
    const preContent = '@media print{*,:after,:before{color:#000!important;text-shadow:none!important;background:0 0!important;-webkit-box-shadow:none!important;box-shadow:none!important}a,a:visited{text-decoration:underline}a[href]:after{content:" (" attr(href) ")"}abbr[title]:after{content:" (" attr(title) ")"}a[href^="javascript:"]:after,a[href^="#"]:after{content:""}blockquote,pre{border:1px solid #999;page-break-inside:avoid}thead{display:table-header-group}img,tr{page-break-inside:avoid}img{max-width:100%!important}h2,h3,p{orphans:3;widows:3}h2,h3{page-break-after:avoid}.navbar{display:none}.btn>.caret,.dropup>.btn>.caret{border-top-color:#000!important}.label{border:1px solid #000}.table{border-collapse:collapse!important}.table td,.table th{background-color:#fff!important}.table-bordered td,.table-bordered th{border:1px solid #ddd!important}}\n' +
        '@font-face{font-family:\'Glyphicons Halflings\';src:url(';
    const postContent = ');src';
    const runTimeFolder = '/users/temp/';
    test('fix absolute paths', () => {
        // given
        const initialPath = '/assets/glyphicons-halflings-regular.eot';
        const initialCss = preContent + initialPath + postContent;
        const expectedFinalCss = preContent + path.join(runTimeFolder, initialPath) + postContent;
        const expectedConverts = 1;
        // when
        const { changes, newCss } = (0, fileUtils_1.fixUrls)(initialCss, runTimeFolder);
        // then
        assert.equal(changes, expectedConverts);
        assert.equal(newCss, expectedFinalCss);
    });
    test('fix wrong paths', () => {
        // given
        const pathFromWebPack = '/assets/glyphicons-halflings-regular.eot';
        const initialPath = path.join('/users/temp2/stuff/', pathFromWebPack);
        const initialCss = preContent + initialPath + postContent;
        const expectedFinalCss = preContent + path.join(runTimeFolder, pathFromWebPack) + postContent;
        const expectedConverts = 1;
        // when
        const { changes, newCss } = (0, fileUtils_1.fixUrls)(initialCss, runTimeFolder);
        // then
        assert.equal(changes, expectedConverts);
        assert.equal(newCss, expectedFinalCss);
    });
    test('do not change correct paths', () => {
        // given
        const pathFromWebPack = '/assets/glyphicons-halflings-regular.eot';
        const initialPath = path.join(runTimeFolder, pathFromWebPack);
        const initialCss = preContent + initialPath + postContent;
        const expectedFinalCss = preContent + path.join(runTimeFolder, pathFromWebPack) + postContent;
        const expectedConverts = 0;
        // when
        const { changes, newCss } = (0, fileUtils_1.fixUrls)(initialCss, runTimeFolder);
        // then
        assert.equal(changes, expectedConverts);
        assert.equal(newCss, expectedFinalCss);
    });
    test('do not change non-assets paths', () => {
        // given
        const pathFromWebPack = '/stuff/glyphicons-halflings-regular.eot';
        const initialPath = pathFromWebPack;
        const initialCss = preContent + initialPath + postContent;
        const expectedFinalCss = preContent + pathFromWebPack + postContent;
        const expectedConverts = 0;
        // when
        const { changes, newCss } = (0, fileUtils_1.fixUrls)(initialCss, runTimeFolder);
        // then
        assert.equal(changes, expectedConverts);
        assert.equal(newCss, expectedFinalCss);
    });
});
//# sourceMappingURL=styling.test.js.map