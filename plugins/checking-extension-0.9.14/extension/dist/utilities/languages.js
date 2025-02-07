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
exports.enhanceTranslation = exports.explodeLocaleName = exports.gatewayLanguages = exports.languages = exports.formatLanguage = exports.getGatewayLanguages = exports.getLanguageCodeFromPrompts = exports.getLanguagePrompts = exports.getLanguages = exports.getLanguageName = exports.getLanguage = exports.getCurrentLanguageCode = exports.getCurrentLocale = exports.LOCALE_KEY = exports.DEFAULT_LOCALE = void 0;
exports.getLocales = getLocales;
exports.loadLocalization = loadLocalization;
exports.setLocale = setLocale;
const languagesList = __importStar(require("../data/languagesList"));
const { locales } = require('../data/locales/locales');
exports.DEFAULT_LOCALE = 'en';
exports.LOCALE_KEY = 'LOCALE_CDOE';
let translations = {};
let currentLocale = {};
let currentLanguageCode = null;
const getCurrentLocale = () => {
    return currentLocale;
};
exports.getCurrentLocale = getCurrentLocale;
function getLocales() {
    return locales;
}
const getCurrentLanguageCode = () => {
    return currentLanguageCode;
};
exports.getCurrentLanguageCode = getCurrentLanguageCode;
const getLanguage = (languageId) => {
    let _language;
    languageId = languageId.toLowerCase();
    const language = languagesList.languages.find(item => {
        // @ts-ignore
        return item.lc?.toLowerCase() === languageId; // compare lower case
    });
    // @ts-ignore
    _language = (0, exports.formatLanguage)(language);
    return _language;
};
exports.getLanguage = getLanguage;
const getLanguageName = (languageId) => {
    const language = (0, exports.getLanguage)(languageId);
    // @ts-ignore
    const languageName = language ? language.ln : null;
    return languageName;
};
exports.getLanguageName = getLanguageName;
const getLanguages = () => {
    const _languages = languagesList.languages.map(language => (0, exports.formatLanguage)(language));
    return _languages;
};
exports.getLanguages = getLanguages;
const getLanguagePrompts = (languages = languagesList.languages) => {
    const _languages = languages.map(language => {
        // @ts-ignore
        const langName = language.languageName || language.localized || language.languageId;
        // @ts-ignore
        const langPrompt = `${language.languageId} ${langName}`;
        return langPrompt;
    });
    return _languages;
};
exports.getLanguagePrompts = getLanguagePrompts;
const getLanguageCodeFromPrompts = (match) => {
    const languageId = match ? match.split(' ')[0] : null;
    return languageId;
};
exports.getLanguageCodeFromPrompts = getLanguageCodeFromPrompts;
const getGatewayLanguages = () => {
    const _languages = languagesList.languages
        // @ts-ignore
        .filter(language => language.gw)
        .map(language => (0, exports.formatLanguage)(language));
    return _languages;
};
exports.getGatewayLanguages = getGatewayLanguages;
const formatLanguage = (language) => {
    let _language = {};
    if (language) {
        _language = {
            // @ts-ignore
            id: language.pk,
            // @ts-ignore
            languageId: language.lc,
            // @ts-ignore
            languageName: language.ang,
            // @ts-ignore
            region: language.lr,
            // @ts-ignore
            gateway: language.gw,
            // @ts-ignore
            country: language.hc,
            // @ts-ignore
            localized: language.ln,
            // @ts-ignore
            direction: language.ld,
            // @ts-ignore
            aliases: language.alt,
            // @ts-ignore
            countries: language.cc,
        };
    }
    return _language;
};
exports.formatLanguage = formatLanguage;
exports.languages = (0, exports.getLanguages)();
exports.gatewayLanguages = (0, exports.getGatewayLanguages)();
/**
 * This parses localization data if not already parsed.
 */
function loadLocalization() {
    // check if already initialized
    if (translations && Object.keys(translations).length) {
        return;
    }
    const _locales = getLocales();
    const keys = Object.keys(_locales);
    if (!keys?.length) {
        console.error(`loadLocalization - locales not loaded`);
        return;
    }
    for (let key of keys) {
        try {
            let translation = _locales[key];
            translation = (0, exports.enhanceTranslation)(translation, key);
            const { langCode, shortLangCode } = (0, exports.explodeLocaleName)(key);
            // @ts-ignore
            translations[langCode] = translation;
            // include short language names for wider locale compatibility
            // @ts-ignore
            if (!translations[shortLangCode]) {
                // @ts-ignore
                translations[shortLangCode] = translation;
            }
        }
        catch (e) {
            console.error(`loadLocalization() - Failed to load localization ${key}: ${e}`);
        }
    }
}
/**
 * find localization data that matches code, or will fall back to default
 * @param languageCode
 */
function setLocale(languageCode) {
    loadLocalization(); // make sure initialized
    // @ts-ignore
    if (translations[languageCode]) {
        // @ts-ignore
        currentLocale = translations[languageCode];
        currentLanguageCode = languageCode;
    }
    else if (languageCode) {
        console.log(`setLocale() - No exact match found for ${languageCode}`);
        const shortLocale = languageCode.split('_')[0];
        // @ts-ignore
        const equivalentLocale = translations[shortLocale]?.['_']?.['locale'];
        if (equivalentLocale) {
            console.log(`setLocale() - Falling back to ${equivalentLocale}`);
            currentLanguageCode = equivalentLocale;
            // @ts-ignore
            currentLocale = translations[shortLocale];
        }
        else {
            currentLanguageCode = exports.DEFAULT_LOCALE; // default to `en` if shortLocale match not found
            // @ts-ignore
            currentLocale = translations[currentLanguageCode];
            console.log(`setLocale() - No short match found for ${shortLocale}, Falling back to ${languageCode}`);
        }
    }
}
/**
 * Splits a locale fullName into it's identifiable pieces
 * @param {string} fullName the locale name
 * @return {{langName, langCode, shortLangCode}}
 */
const explodeLocaleName = (fullName) => {
    let title = fullName.replace(/\.json/, '');
    const parts = title.split('-');
    let langCode = parts.pop() || '';
    let langName = parts.join('-');
    let shortLangCode = langCode.split('_')[0];
    return {
        langName, langCode, shortLangCode,
    };
};
exports.explodeLocaleName = explodeLocaleName;
/**
 * Injects additional information into the translation
 * that should not otherwise be translated. e.g. legal entities
 * @param {object} translation localized strings
 * @param {string} fullName the name of the locale.
 * @param {array} nonTranslatableStrings a list of non-translatable strings to inject
 * @return {object} the enhanced translation
 */
const enhanceTranslation = (translation, fullName, nonTranslatableStrings = []) => {
    const { langName, langCode, shortLangCode, } = (0, exports.explodeLocaleName)(fullName);
    return {
        ...translation,
        '_': {
            'language_name': langName,
            'short_locale': shortLangCode,
            'locale': langCode,
            'full_name': fullName,
            ...nonTranslatableStrings,
        },
    };
};
exports.enhanceTranslation = enhanceTranslation;
//# sourceMappingURL=languages.js.map