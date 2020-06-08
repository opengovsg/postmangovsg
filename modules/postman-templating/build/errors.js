"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnexpectedDoubleQuoteError = exports.RecipientColumnMissing = exports.TemplateError = void 0;
class TemplateError extends Error {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
        Error.captureStackTrace(this);
    }
}
exports.TemplateError = TemplateError;
class RecipientColumnMissing extends Error {
    constructor() {
        super("Column labelled 'recipient' is missing from uploaded file");
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
        Error.captureStackTrace(this);
    }
}
exports.RecipientColumnMissing = RecipientColumnMissing;
class UnexpectedDoubleQuoteError extends Error {
    constructor() {
        super(`Double quote is misused, it should only use to quote a field.\nCorrect :"Hi how are you?" \nIncorrect : 40"N`);
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
        Error.captureStackTrace(this);
    }
}
exports.UnexpectedDoubleQuoteError = UnexpectedDoubleQuoteError;
//# sourceMappingURL=errors.js.map