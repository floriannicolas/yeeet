
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetLink = `${process.env.CLIENT_URL}/#/reset-password/${resetToken}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to: email,
    subject: 'Reset your password',
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  };

  //await transporter.sendMail(mailOptions);
} 