const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection on startup
transporter.verify((error) => {
  if (error) {
    console.warn('⚠️  Email service not configured:', error.message);
  } else {
    console.log('📧 Email service ready');
  }
});

/**
 * Send a password reset email with a styled HTML template
 */
const sendResetEmail = async (to, resetUrl, username) => {
  const mailOptions = {
    from: `"PostKaro" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset Your PostKaro Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#FCE4EE;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FCE4EE;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(255,118,164,0.12);">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#FF76A4,#F6AFC6);padding:32px;text-align:center;">
                    <div style="width:48px;height:48px;background:white;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                      <span style="color:#FF76A4;font-size:24px;font-weight:bold;">P</span>
                    </div>
                    <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">PostKaro</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:32px;">
                    <h2 style="color:#333;margin:0 0 8px;font-size:20px;">Password Reset</h2>
                    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px;">
                      Hi <strong>${username}</strong>, we received a request to reset your password.
                      Click the button below to create a new one. This link expires in <strong>1 hour</strong>.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF76A4,#F6AFC6);color:white;text-decoration:none;padding:14px 40px;border-radius:16px;font-weight:600;font-size:15px;box-shadow:0 4px 16px rgba(255,118,164,0.3);">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color:#999;font-size:12px;line-height:1.5;margin:24px 0 0;text-align:center;">
                      If you didn't request this, you can safely ignore this email.<br>
                      Your password won't change until you create a new one.
                    </p>
                    <hr style="border:none;border-top:1px solid #f0e0e8;margin:24px 0;">
                    <p style="color:#bbb;font-size:11px;text-align:center;margin:0;">
                      Can't click the button? Copy this link:<br>
                      <a href="${resetUrl}" style="color:#FF76A4;word-break:break-all;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#fdf2f7;padding:16px 32px;text-align:center;">
                    <p style="color:#ccc;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} PostKaro. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { transporter, sendResetEmail };
