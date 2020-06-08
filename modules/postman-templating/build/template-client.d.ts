import xss from 'xss';
export declare class TemplateClient {
    xssOptions: xss.IFilterXSSOptions | undefined;
    constructor(xssOptions?: xss.IFilterXSSOptions);
    /**
     * Removes non-whitelisted html tags
     * Replaces new lines with html <br> so that the new lines can be displayed on the front-end
     * @param value
     */
    replaceNewLinesAndSanitize(value: string): string;
    /**
     * returns {
     *    variables - extracted param variables from template
     *    tokens - tokenised strings that can be joined to produce a template
     * }
     * @param templateBody - template body
     * @param params - dict of param variables used for interpolation
     */
    parseTemplate: (templateBody: string, params?: {
        [key: string]: string;
    } | undefined) => {
        variables: Array<string>;
        tokens: Array<string>;
    };
    /**
     * Replaces attributes in the template with the parameters specified in the csv
     * @param templateBody
     * @param params
     */
    template(templateBody: string, params: {
        [key: string]: string;
    }): string;
}
