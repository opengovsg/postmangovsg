"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateClient = void 0;
const lodash_1 = require("lodash");
const xss_1 = __importDefault(require("xss"));
const Sqrl = __importStar(require("squirrelly"));
const errors_1 = require("./errors");
class TemplateClient {
    constructor(xssOptions) {
        /**
         * returns {
         *    variables - extracted param variables from template
         *    tokens - tokenised strings that can be joined to produce a template
         * }
         * @param templateBody - template body
         * @param params - dict of param variables used for interpolation
         */
        this.parseTemplate = (templateBody, params) => {
            const variables = [];
            const tokens = [];
            /**
             * dict used for checking keys in lowercase
             * dict === {} if param === undefined
             */
            const dict = lodash_1.mapKeys(params, (_value, key) => key.toLowerCase());
            try {
                const parseTree = Sqrl.parse(templateBody, Sqrl.defaultConfig);
                parseTree.forEach((astObject) => {
                    // AstObject = TemplateObject | string
                    var _a, _b;
                    // normal string (non variable portion)
                    if (typeof astObject === 'string') {
                        tokens.push(astObject);
                        return;
                    }
                    // ie. it is a TemplateObject
                    const templateObject = astObject;
                    // templateObject.t means TagType, default is r
                    // templateObject.raw means ???
                    // templateObject.f refers to filter (eg. {{ var | humanize }}), we want to make sure this is empty
                    if (templateObject.t === 'r' &&
                        !templateObject.raw &&
                        ((_a = templateObject.f) === null || _a === void 0 ? void 0 : _a.length) === 0) {
                        /**
                         * - templateObject.c has type string | undefined
                         * - templateObject.c contains the param key, c stands for content
                         * - this is the extracted variable name from the template AST
                         * - this extracted key is already trimmed (ie. no leading nor trailing spaces)
                         * - coerce to lowercase for comparison
                         */
                        const key = (_b = templateObject.c) === null || _b === void 0 ? void 0 : _b.toLowerCase();
                        // Have not found a case that triggers this
                        if (key === undefined) {
                            console.error(`Templating error: templateObject.c of ${templateObject} is undefined.`);
                            throw new errors_1.TemplateError('TemplateObject has no content');
                        }
                        if (key.length === 0) {
                            throw new errors_1.TemplateError('Blank template variable provided.\nA correct example is {{person}}, an incorrect example is {{}}.');
                        }
                        // only allow alphanumeric template, prevents code execution
                        const keyHasValidChars = key.match(/[^a-zA-Z0-9]/) === null;
                        if (!keyHasValidChars) {
                            throw new errors_1.TemplateError(`Invalid characters in the keyword: {{${key}}}.\nCheck that the keywords only contain letters and numbers.\nKeywords like {{ Person_Name }} are not allowed, but {{ PersonName }} is allowed.`);
                        }
                        // add key regardless, note that this is also returned in lowercase
                        variables.push(key);
                        // if no params continue with the loop
                        if (!params)
                            return;
                        // if params provided == attempt to carry out templating
                        if (dict[key]) {
                            const templated = dict[key];
                            tokens.push(templated);
                            return;
                        }
                        // recipient key must have param
                        if (key === 'recipient')
                            throw new errors_1.TemplateError(`Param ${templateObject.c} not found`);
                    }
                    else {
                        // FIXME: be more specific about templateObject, just pass the error itself?
                        console.error(`Templating error: invalid template provided. templateObject= ${JSON.stringify(templateObject)}`);
                        throw new errors_1.TemplateError('Invalid template provided');
                    }
                });
                return {
                    variables,
                    tokens,
                };
            }
            catch (err) {
                console.error({ message: `${err.stack}` });
                if (err.message.includes('unclosed tag'))
                    throw new errors_1.TemplateError('Check that all the keywords have double curly brackets around them.\nA correct example is {{ keyword }}, and incorrect ones are {{ keyword } or {{ keyword . ');
                if (err.message.includes('unclosed string'))
                    throw new errors_1.TemplateError("Check that the keywords only contain letters and numbers.\nKeywords like {{ Person's Name }} are not allowed, but {{ PersonsName }} is allowed.");
                if (err.name === 'Squirrelly Error')
                    throw new errors_1.TemplateError(err.message);
                throw err;
            }
        };
        this.xssOptions = xssOptions;
    }
    /**
     * Removes non-whitelisted html tags
     * Replaces new lines with html <br> so that the new lines can be displayed on the front-end
     * @param value
     */
    replaceNewLinesAndSanitize(value) {
        return xss_1.default.filterXSS(value.replace(/(\n|\r\n)/g, '<br/>'), this.xssOptions);
    }
    /**
     * Replaces attributes in the template with the parameters specified in the csv
     * @param templateBody
     * @param params
     */
    template(templateBody, params) {
        const parsed = this.parseTemplate(templateBody, params);
        // Remove extra '\' infront of single quotes and backslashes, added by Squirrelly when it escaped the csv
        const templated = parsed.tokens.join('').replace(/\\([\\'])/g, '$1');
        return xss_1.default.filterXSS(templated, this.xssOptions);
    }
}
exports.TemplateClient = TemplateClient;
//# sourceMappingURL=template-client.js.map