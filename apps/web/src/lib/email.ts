import nodemailer from 'nodemailer';

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedSenderEmail: string = process.env.GMAIL_USER || 'support@bayanserve.gov.ph';

async function getTransporter(): Promise<{ transporter: nodemailer.Transporter; sender: string }> {
  if (cachedTransporter) {
    return { transporter: cachedTransporter, sender: cachedSenderEmail };
  }

  const isPlaceholderGmail = !process.env.GMAIL_USER || 
    process.env.GMAIL_USER.includes('your.email@gmail.com') || 
    !process.env.GMAIL_APP_PASSWORD || 
    process.env.GMAIL_APP_PASSWORD.includes('xxxx');

  if (isPlaceholderGmail) {
    console.log('[WebEmail] ℹ️ Gmail credentials not configured. Creating Ethereal SMTP test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      cachedTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      cachedSenderEmail = testAccount.user;
      console.log('[WebEmail] ✅ Ethereal SMTP test account created successfully.');
    } catch (etherealErr: any) {
      console.error('[WebEmail] Ethereal account creation failed, falling back to dummy transporter:', etherealErr.message);
      cachedTransporter = nodemailer.createTransport({
        jsonTransport: true
      });
      cachedSenderEmail = 'mock-sender@bayanserve.gov.ph';
    }
  } else {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    cachedSenderEmail = process.env.GMAIL_USER!;
  }

  return { transporter: cachedTransporter, sender: cachedSenderEmail };
}

export async function sendOTPEmail(
  to: string,
  otp: string,
  applicantName?: string
): Promise<void> {
  const displayName = applicantName || 'Citizen';
  const lguName = process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME || 'BayanServe LGU';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BayanServe — Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                🏛️ BayanServe
              </h1>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;font-weight:400;">
                Civic Services Verification
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
                Magandang araw, <strong>${displayName}</strong>!
              </p>
              <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                Use the verification code below to sign in to your BayanServe account. This code expires in <strong>5 minutes</strong>.
              </p>

              <!-- OTP Code -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:24px 0;">
                    <div style="display:inline-block;background-color:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:20px 40px;">
                      <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#0f172a;font-family:'Courier New',monospace;">
                        ${otp}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
                If you did not request this code, you can safely ignore this email. Do not share this code with anyone — BayanServe staff will never ask for your verification code.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
                ${lguName} — Powered by BayanServe<br />
                This is an automated message. Please do not reply.
              </p>
              <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
                Para sa tulong, makipag-ugnayan sa:<br />
                Municipality of Peñablanca<br />
                (078) 304-0399 | Penablanca.LGU@negosyocenter.gov.ph
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const { transporter, sender } = await getTransporter();
  const info = await transporter.sendMail({
    from: `"BayanServe - ${process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME || 'Municipality of Peñablanca'}" <${sender}>`,
    to,
    subject: `${otp} — Your BayanServe Verification Code`,
    text: `Your BayanServe verification code is: ${otp}. It expires in 5 minutes. Do not share this code.`,
    html,
  });

  const isPlaceholderGmail = !process.env.GMAIL_USER || 
    process.env.GMAIL_USER.includes('your.email@gmail.com') || 
    !process.env.GMAIL_APP_PASSWORD || 
    process.env.GMAIL_APP_PASSWORD.includes('xxxx');

  if (isPlaceholderGmail && info) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[WebEmail] 📧 Ethereal Preview URL: ${previewUrl}`);
    }
  }
}

export async function sendCustomEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  const { transporter, sender } = await getTransporter();
  const info = await transporter.sendMail({
    from: `"BayanServe - ${process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME || 'Municipality of Peñablanca'}" <${sender}>`,
    to,
    subject,
    text: text || subject,
    html,
  });

  const isPlaceholderGmail = !process.env.GMAIL_USER || 
    process.env.GMAIL_USER.includes('your.email@gmail.com') || 
    !process.env.GMAIL_APP_PASSWORD || 
    process.env.GMAIL_APP_PASSWORD.includes('xxxx');

  if (isPlaceholderGmail && info) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[WebEmail] 📧 Ethereal Preview URL: ${previewUrl}`);
    }
  }
}
