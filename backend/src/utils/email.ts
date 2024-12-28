import Mailjet from 'node-mailjet';

const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
    const mailjet = new Mailjet({
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
            console.log('MailJet.sendEmail.success', result)
        })
        .catch((err) => {
            console.log('MailJet.sendEmail.error', err);
        })
}


export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetLink = `${process.env.CLIENT_URL}/#/reset-password/${resetToken}`;
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
