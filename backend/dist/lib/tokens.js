"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate a random token.
 *
 * @returns string
 */
const generateRandomToken = () => {
    return crypto_1.default.randomBytes(8).toString('hex');
};
exports.generateRandomToken = generateRandomToken;
//# sourceMappingURL=tokens.js.map