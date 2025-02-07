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
// @ts-ignore
const fs = __importStar(require("fs-extra"));
const assert = __importStar(require("assert"));
const path = __importStar(require("path"));
// import * as myExtension from '../extension';
suite('Init Locales', () => {
    test('Compile Locale Jsons Into ts file', () => {
        const locales = {};
        const localePath = path.join('./src/data/locales');
        const files = fs.readdirSync(localePath);
        for (const file of files) {
            const parsed = path.parse(file);
            if (parsed.ext === '.json') {
                const LocaleFilePath = path.join(localePath, file);
                const localeData = fs.readJsonSync(LocaleFilePath);
                const key = parsed.name;
                const value = localeData;
                // @ts-ignore
                locales[key] = value;
            }
        }
        const output = 'const locales_ =\n'
            + JSON.stringify(locales, null, 2)
            + '\n\nexport const locales = locales_\n';
        fs.outputFileSync(path.join(localePath, 'locales.ts'), output, 'UTF-8');
        assert.ok(files.length);
    });
});
//# sourceMappingURL=locales.test.js.map