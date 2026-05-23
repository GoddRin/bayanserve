import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Sends a visually styled 6-digit OTP email to citizens.
 */
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
                Gamitin ang verification code sa ibaba upang mag-sign in sa iyong BayanServe account. Ang code na ito ay may bisa lamang sa loob ng <strong>5 minuto</strong>.
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
                Kung hindi mo hiningi ang code na ito, maaari mo itong balewalain. Huwag ibahagi ang code na ito sa iba — kailanman ay hindi hihingiin ng mga staff ng LGU ang iyong verification code.
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

  await transporter.sendMail({
    from: `"BayanServe - ${process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME || 'Municipality of Peñablanca'}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${otp} — Your BayanServe Verification Code`,
    text: `Your BayanServe verification code is: ${otp}. It expires in 5 minutes. Do not share this code.`,
    html,
  });
}

/**
 * Sends a welcome/invitation email to newly created staff accounts.
 */
export async function sendStaffInviteEmail(
  to: string,
  staffName: string,
  role: string,
  temporaryPassword: string
): Promise<void> {
  const lguName = process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME || 'BayanServe LGU';
  const loginUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('5000', '3000') || 'http://localhost:3000'}/admin/login`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BayanServe Staff Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="550" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">
                🏛️ BayanServe
              </h1>
              <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">
                Staff Account Invitation
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">
                Magandang araw, <strong>${staffName}</strong>!
              </p>
              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
                Ikaw ay inimbitahan na sumali sa BayanServe bilang <strong>${role}</strong> para sa <strong>${lguName}</strong>. Gawa na ang iyong account at maaari mo na itong ma-access gamit ang sumusunod na mga kredensyal:
              </p>
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#334155;font-size:14px;"><strong>Email:</strong> ${to}</p>
                <p style="margin:0;color:#334155;font-size:14px;"><strong>Temporary Password:</strong> <code style="font-family:monospace;background-color:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:14px;">${temporaryPassword}</code></p>
              </div>
              <p style="text-align:center;margin:32px 0;">
                <a href="${loginUrl}" style="background-color:#1e3a8a;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
                  Mag-login sa Admin Portal
                </a>
              </p>
              <p style="margin:0;color:#ef4444;font-size:12px;line-height:1.6;">
                PAALALA: Para sa iyong seguridad, mangyaring palitan kaagad ang iyong temporary password pagkatapos mag-log in sa unang pagkakataon.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                Powered by BayanServe LGU Civic Platform
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

  await transporter.sendMail({
    from: `"BayanServe - ${process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME || 'Municipality of Peñablanca'}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `BayanServe Staff Invitation — Credentials for ${staffName}`,
    text: `You have been invited to BayanServe as ${role}. Log in at ${loginUrl} using Email: ${to} and Temporary Password: ${temporaryPassword}`,
    html,
  });
}

/**
 * Sends generic system-triggered emails (e.g. status change notifications)
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  await transporter.sendMail({
    from: `"BayanServe - ${process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME || 'Municipality of Peñablanca'}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text: subject,
    html,
  });
}
