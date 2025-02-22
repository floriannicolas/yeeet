"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const node_mailjet_1 = __importDefault(require("node-mailjet"));
const sendEmail = async (to, subject, html) => {
    const mailjet = new node_mailjet_1.default({
        apiKey: process.env.MAILJET_API_KEY,
        apiSecret: process.env.MAILJET_API_SECRET,
    });
    const request = mailjet
        .post('send', { version: 'v3.1' })
        .request({
        Messages: [
            {
                From: {
                    Email: process.env.MAILJET_SENDER_EMAIL,
                    Name: 'Yeeet - No Reply'
                },
                To: [{ Email: to }],
                Subject: subject,
                HTMLPart: html
            }
        ],
    });
    request
        .then((result) => {
        console.log('MailJet.sendEmail.success', result);
    })
        .catch((err) => {
        console.log('MailJet.sendEmail.error', err);
    });
};
class EmailService {
    static async sendPasswordResetEmail(email, resetToken) {
        const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
        const subject = 'Reset your password';
        const html = `
            <h1><img src="${process.env.CLIENT_URL}/icon.png" alt="Yeeet" style="width: 32px; height: 32px;" /></h1>
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Click the link below to proceed:</p>
            <p><a href="${resetLink}">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            `;
        await sendEmail(email, subject, html);
    }
}
exports.EmailService = EmailService;
//# sourceMappingURL=email.js.map