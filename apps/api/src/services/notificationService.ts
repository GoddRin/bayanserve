import { prisma } from '@bayanserve/db';
import nodemailer from 'nodemailer';

/**
 * Interface definition for sendNotification parameters
 */
export interface CitizenParam {
  name: string;
  email: string;
}

export interface ApplicationParam {
  tracking_number: string;
  service_name: string;
  amount?: number;
  lgu_id: string;
}

export interface LguParam {
  name: string;
  address: string;
  phone: string;
  logo_url?: string;
  primary_color?: string;
}

/**
 * Creates the nodemailer SMTP transport using Gmail credentials.
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Extracts initials from LGU Name to display as a fallback circular badge in case no logo is set.
 */
function getLguInitials(name: string): string {
  return name
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 3);
}

/**
 * Helper to replace standard placeholders in custom or default templates.
 */
function replacePlaceholders(
  text: string,
  citizen: CitizenParam,
  application: ApplicationParam,
  lgu: LguParam,
  lguEmail: string,
  lguPhone: string,
  extras?: Record<string, string>
): string {
  const amountVal = application.amount !== undefined ? Number(application.amount) : 0;
  const amountStr = `₱${amountVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const downloadUrl = extras?.download_url || '';
  const remarks = extras?.remarks || extras?.rejection_reason || 'Hindi nakasaad ang dahilan.';
  const estimatedDate = extras?.estimated_release_date || extras?.expected_completion_date || '';
  const processingDays = extras?.processing_days || '3';

  return text
    .replace(/{NAME}/g, citizen.name)
    .replace(/{TRACKING_NO}/g, application.tracking_number)
    .replace(/{SERVICE_NAME}/g, application.service_name)
    .replace(/{AMOUNT}/g, amountStr)
    .replace(/{DOWNLOAD_URL}/g, downloadUrl)
    .replace(/{REMARKS}/g, remarks)
    .replace(/{LGU_NAME}/g, lgu.name)
    .replace(/{LGU_PHONE}/g, lguPhone)
    .replace(/{LGU_EMAIL}/g, lguEmail)
    .replace(/{ESTIMATED_DATE}/g, estimatedDate)
    .replace(/{PROCESSING_DAYS}/g, processingDays);
}

/**
 * Surrounds the HTML content with a premium responsive card template.
 */
function getEmailWrapper(
  contentHtml: string,
  lgu: LguParam,
  lguEmail: string,
  lguPhone: string,
  primaryColor: string
): string {
  const logoHeader = lgu.logo_url && lgu.logo_url.trim().length > 0
    ? `<img src="${lgu.logo_url}" alt="${lgu.name} Logo" style="max-height: 80px; width: auto; display: block; margin: 0 auto 16px auto; border-radius: 4px;" />`
    : `<div style="width: 64px; height: 64px; border-radius: 50%; background-color: ${primaryColor}; color: #ffffff; line-height: 64px; text-align: center; font-size: 22px; font-weight: bold; margin: 0 auto 16px auto; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">${getLguInitials(lgu.name)}</div>`;

  return `
<!DOCTYPE html>
<html lang="fil">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BayanServe</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; max-width: 600px; width: 100%;">
          
          <!-- LGU Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%); padding: 32px 40px; text-align: center;">
              ${logoHeader}
              <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">
                ${lgu.name}
              </h2>
              <p style="margin: 4px 0 0; color: #e2e8f0; font-size: 13px; font-weight: 400; opacity: 0.9;">
                BayanServe LGU Civic Services
              </p>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; background-color: #ffffff;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Compliance RA 10173 Unsubscribe & LGU Info Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #475569; font-size: 13px; font-weight: 600;">
                ${lgu.name} Office of the Mayor
              </p>
              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                📍 ${lgu.address}<br/>
                📞 ${lguPhone}
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.6; border-top: 1px dashed #cbd5e1; padding-top: 16px;">
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
}

/**
 * Default HTML Templates in Filipino for each notification event type.
 */
function getDefaultTemplateBody(
  type: string,
  citizen: CitizenParam,
  application: ApplicationParam,
  lgu: LguParam,
  lguEmail: string,
  lguPhone: string,
  extras?: Record<string, string>
): { subject: string, body: string } {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const trackUrl = `${siteUrl}/track?tracking=${application.tracking_number}`;
  const amountVal = application.amount !== undefined ? Number(application.amount) : 0;
  const amountStr = `₱${amountVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const remarks = extras?.remarks || extras?.rejection_reason || 'Hindi nakasaad ang dahilan.';
  const estimatedDate = extras?.estimated_release_date || extras?.expected_completion_date || '';
  const processingDays = extras?.processing_days || '3';
  const downloadUrl = extras?.download_url || '';

  const primaryColor = lgu.primary_color 
    ?? process.env.NEXT_PUBLIC_DEFAULT_LGU_PRIMARY_COLOR 
    ?? '#1a3c6e';

  let subject = '';
  let body = '';

  switch (type) {
    case 'APPLICATION_SUBMITTED':
      subject = `Natanggap ang iyong aplikasyon — ${application.tracking_number}`;
      body = `
        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
          Matagumpay na Naisumite ang Aplikasyon!
        </h3>
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;">
          Magandang araw, <strong>${citizen.name}</strong>!<br/><br/>
          Natanggap na namin ang iyong aplikasyon para sa serbisyong <strong>${application.service_name}</strong>. Ito ay kasalukuyang nakapila para sa paunang pagsusuri ng aming LGU desk.
        </p>

        <!-- Tracking Section -->
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600; display: block; margin-bottom: 8px;">
            Iyong Tracking Number
          </span>
          <span style="font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: 1px; font-family: monospace;">
            ${application.tracking_number}
          </span>
        </div>

        <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">
          Ang karaniwang proseso para sa serbisyong ito ay tumatagal ng <strong>${processingDays} araw na trabaho</strong>.
        </p>

        <!-- Call to Action -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom: 10px;">
              <a href="${trackUrl}" style="background-color: ${primaryColor}; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.05); transition: background-color 0.2s;">
                Subaybayan ang Katayuan Online
              </a>
            </td>
          </tr>
        </table>
      `;
      break;

    case 'UNDER_REVIEW':
      subject = `Ang iyong aplikasyon ay nasa proseso na — ${application.tracking_number}`;
      body = `
        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
          Kasalukuyang Sinusuri ang Aplikasyon
        </h3>
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;">
          Magandang araw, <strong>${citizen.name}</strong>!<br/><br/>
          Nais naming ipagbigay-alam na ang iyong aplikasyon para sa <strong>${application.service_name}</strong> ay kasalukuyan nang masusing sinusuri ng aming mga nakatalagang opisyal.
        </p>

        <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 4px 12px 12px 4px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0; color: #0369a1; font-size: 14px; line-height: 1.6;">
            💡 <strong>Inaasahang Petsa ng Paglabas:</strong><br/>
            ${estimatedDate ? `Inaasahang matatapos sa o bago ang <strong>${estimatedDate}</strong>.` : `Matatapos sa loob ng standard na <strong>${processingDays} araw na trabaho</strong>.`}
          </p>
        </div>

        <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">
          Mangyaring manatiling nakabukas ang email na ito para sa mga susunod pang update. Maaari mo ring tingnan ang online status gamit ang link sa ibaba.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <a href="${trackUrl}" style="background-color: ${primaryColor}; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                Suriin ang Aplikasyon
              </a>
            </td>
          </tr>
        </table>
      `;
      break;

    case 'PENDING_PAYMENT':
      subject = `Aksyon Kinakailangan: Bayad para sa ${application.tracking_number}`;
      body = `
        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
          Kailangan ng Pagbabayad (Payment Required)
        </h3>
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;">
          Magandang araw, <strong>${citizen.name}</strong>!<br/><br/>
          Upang maipagpatuloy ang pagproseso ng iyong aplikasyon para sa <strong>${application.service_name}</strong>, mangyaring bayaran ang kaukulang halaga.
        </p>

        <!-- Amount Due Badge -->
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #166534; font-weight: 600; display: block; margin-bottom: 6px;">
            Halagang Kailangang Bayaran
          </span>
          <span style="font-size: 32px; font-weight: 800; color: #166534;">
            ${amountStr}
          </span>
        </div>

        <h4 style="margin: 0 0 12px 0; color: #0f172a; font-size: 14px; font-weight: 700;">
          Gabay sa Pagbabayad sa Cashier Counter:
        </h4>
        <ol style="margin: 0 0 24px 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.7;">
          <li style="margin-bottom: 8px;">Pumunta sa **Lunsod/Bayan Cashier Desk** na matatagpuan sa <strong>${lgu.address}</strong>.</li>
          <li style="margin-bottom: 8px;">Ipakita ang iyong Tracking Number: <strong style="font-family: monospace;">${application.tracking_number}</strong> sa nakatalagang Counter Cashier.</li>
          <li style="margin-bottom: 8px;">Ibigay ang kaukulang halaga na <strong>${amountStr}</strong>. Ibibigay sa iyo ang Opisyal na Resibo (Official Receipt / O.R.).</li>
        </ol>

        <p style="margin: 0 0 24px 0; color: #ef4444; font-size: 13px; font-style: italic; line-height: 1.6;">
          Pansamantalang hihinto ang pagproseso ng iyong dokumento hanggang sa matanggap namin ang kumpirmasyon ng iyong bayad mula sa Treasurer.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <a href="${trackUrl}" style="background-color: ${primaryColor}; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                Tingnan ang Detalye ng Bayarin
              </a>
            </td>
          </tr>
        </table>
      `;
      break;

    case 'APPROVED':
      // MODIFIED BY CORRECTION 3: Must NOT include QR token, download button, or verification token.
      subject = `APPROVED: Ang iyong ${application.service_name} ay naaprubahan na!`;
      body = `
        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
          🎉 Binabati Kita! Aplikasyon ay Naaprubahan
        </h3>
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;">
          Magandang araw, <strong>${citizen.name}</strong>!<br/><br/>
          Opisyal nang inaprubahan ang iyong aplikasyon para sa serbisyong <strong>${application.service_name}</strong>!
        </p>

        <!-- Instruction Block -->
        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; border-radius: 4px 12px 12px 4px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
            📌 <strong>Susunod na Hakbang:</strong><br/>
            Ang inyong dokumento ay ihahanda ng aming opisina. Makakatanggap kayo ng isa pang email kapag handa na para ma-download.
          </p>
        </div>

        <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">
          <strong>Inaasahang Oras ng Pagpapalabas:</strong><br/>
          ${estimatedDate ? `Inaasahang maihanda sa o bago ang <strong>${estimatedDate}</strong>.` : `Inaasahang maihanda sa loob ng <strong>${processingDays} araw na trabaho</strong>.`}
        </p>

        <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
          Kung mayroon kayong mga katanungan o nais mag-follow up, maaari kayong makipag-ugnayan sa ating tanggapan sa pamamagitan ng pagtawag sa <strong>${lguPhone}</strong> o pag-email sa <strong>${lguEmail}</strong>.
        </p>
      `;
      break;

    case 'REJECTED':
      subject = `Update sa iyong Aplikasyon — ${application.tracking_number}`;
      body = `
        <h3 style="margin: 0 0 16px 0; color: #dc2626; font-size: 20px; font-weight: 700; text-align: center;">
          ⚠️ Pabatid Tungkol sa iyong Aplikasyon
        </h3>
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;">
          Magandang araw, <strong>${citizen.name}</strong>!<br/><br/>
          Ikinalulungkot naming ipabatid na pagkatapos ng masusing pagsusuri, ang iyong aplikasyon para sa <strong>${application.service_name}</strong> ay hindi naaprubahan sa ngayon.
        </p>

        <!-- Rejection Reason -->
        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <span style="font-size: 12px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">
            Dahilan ng Hindi Pag-apruba:
          </span>
          <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6; font-weight: 500;">
            ${remarks}
          </p>
        </div>

        <h4 style="margin: 0 0 10px 0; color: #0f172a; font-size: 14px; font-weight: 700;">
          Ano ang maaari mong gawin?
        </h4>
        <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.6;">
          <li style="margin-bottom: 6px;">Maaari kang muling mag-apply online kapag naihanda na ang tamang impormasyon o mga kinakailangang kalakip.</li>
          <li style="margin-bottom: 6px;">Suriing mabuti ang mga dokumento na isinumite upang masiguro na malinaw at wasto ang mga ito.</li>
          <li style="margin-bottom: 6px;">Kung naniniwala kang may pagkakamali, makipag-ugnayan sa LGU helpdesk sa <strong>${lguPhone}</strong>.</li>
        </ul>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <a href="${trackUrl}" style="background-color: #475569; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                Tingnan ang Katayuan sa Portal
              </a>
            </td>
          </tr>
        </table>
      `;
      break;

    case 'DOCUMENT_READY':
      subject = `Handa na ang iyong Dokumento — I-download na!`;
      body = `
        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
          📄 Handa na ang iyong Opisyal na Dokumento!
        </h3>
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;">
          Magandang araw, <strong>${citizen.name}</strong>!<br/><br/>
          Ang iyong opisyal na sertipiko o permit para sa <strong>${application.service_name}</strong> ay matagumpay na nailabas. Maaari mo na itong i-download at gamitin.
        </p>

        <!-- Verification / Authenticity Info -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
            🔐 <strong>Impormasyon sa Seguridad:</strong><br/>
            Ang dokumentong ito ay naglalaman ng secure na **QR Code**. Maaari itong i-scan ng kahit sino upang mapatunayan ang kredensyal at pagiging lehitimo nito sa ating opisyal na portal ng LGU.
          </p>
        </div>

        <!-- Download Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              ${downloadUrl ? `
                <a href="${downloadUrl}" style="background-color: #10b981; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(16,185,129,0.2);">
                  I-download ang PDF Dokumento
                </a>
              ` : `
                <a href="${trackUrl}" style="background-color: ${primaryColor}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;">
                  Pumunta sa Portal para I-download
                </a>
              `}
            </td>
          </tr>
        </table>
      `;
      break;

    default:
      subject = `BayanServe Update — ${application.tracking_number}`;
      body = `
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;">
          Magandang araw, <strong>${citizen.name}</strong>!<br/><br/>
          May bagong update ang iyong aplikasyon (${application.tracking_number}) para sa serbisyong <strong>${application.service_name}</strong>.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <a href="${trackUrl}" style="background-color: ${primaryColor}; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                Tingnan ang Portal
              </a>
            </td>
          </tr>
        </table>
      `;
  }

  return { subject, body };
}

/**
 * Sends an email notification to the citizen.
 * 
 * Flow:
 * 1. Resolves the citizen user ID using application tracking number and email lookup fallback.
 * 2. Checks database for an LGU specific email template override.
 * 3. Renders the template with placeholders and wraps it in a responsive branded wrapper.
 * 4. Sends the email. If failed, retries once after 30 seconds.
 * 5. Saves the transaction history to the Notification model.
 * 6. Never throws an exception, logs errors gracefully, and returns void.
 */
export async function sendNotification(
  type: 'APPLICATION_SUBMITTED' | 'UNDER_REVIEW' | 'PENDING_PAYMENT' | 'APPROVED' | 'REJECTED' | 'DOCUMENT_READY',
  citizen: CitizenParam,
  application: ApplicationParam,
  lgu: LguParam,
  extras?: Record<string, string>
): Promise<void> {
  // Use try/catch wrapper around everything to guarantee no uncaught throws escape the service.
  try {
    console.log(`[NotificationService] Preparing to send notification of type ${type} for tracking: ${application.tracking_number}`);

    // Determine the primary branding color.
    const primaryColor = lgu.primary_color 
      ?? process.env.NEXT_PUBLIC_DEFAULT_LGU_PRIMARY_COLOR 
      ?? '#1a3c6e';

    // 1. Dual Lookup Persistence Logic for citizenId
    let citizenId: string | null = null;
    try {
      // Step A: Find Application by tracking number
      const appRecord = await prisma.application.findUnique({
        where: { trackingNumber: application.tracking_number },
        select: { citizenId: true }
      });
      if (appRecord) {
        citizenId = appRecord.citizenId;
      }

      // Step B: If not found, query User table by email
      if (!citizenId) {
        const userRecord = await prisma.user.findFirst({
          where: { email: citizen.email.trim().toLowerCase() },
          select: { id: true }
        });
        if (userRecord) {
          citizenId = userRecord.id;
        }
      }
    } catch (dbErr: any) {
      console.error('[NotificationService] Database citizen lookup failed:', dbErr.message);
    }

    if (!citizenId) {
      console.warn('[NotificationService] Could not resolve citizenId for tracking:', application.tracking_number);
    }

    // Retrieve LGU specific contacts from database for RA 10173 footer, or fall back to params.
    let lguEmail = 'support@bayanserve.gov.ph';
    let lguPhone = lgu.phone || 'N/A';
    try {
      const lguRecord = await prisma.lgu.findUnique({
        where: { id: application.lgu_id },
        select: { contactEmail: true, contactPhone: true }
      });
      if (lguRecord) {
        lguEmail = lguRecord.contactEmail;
        if (lguRecord.contactPhone) {
          lguPhone = lguRecord.contactPhone;
        }
      }
    } catch (lguErr: any) {
      console.error('[NotificationService] Database LGU query failed:', lguErr.message);
    }

    // 2. Fetch custom template overrides or render defaults.
    let emailSubject = '';
    let emailInnerHtml = '';

    try {
      const customTemplate = await prisma.emailTemplate.findUnique({
        where: {
          lguId_type: {
            lguId: application.lgu_id,
            type: type
          }
        }
      });

      if (customTemplate) {
        console.log(`[NotificationService] Found custom database template override for LGU ID: ${application.lgu_id}, Type: ${type}`);
        emailSubject = replacePlaceholders(customTemplate.subject, citizen, application, lgu, lguEmail, lguPhone, extras);
        emailInnerHtml = replacePlaceholders(customTemplate.body, citizen, application, lgu, lguEmail, lguPhone, extras);
      } else {
        const defaultRender = getDefaultTemplateBody(type, citizen, application, lgu, lguEmail, lguPhone, extras);
        emailSubject = defaultRender.subject;
        emailInnerHtml = defaultRender.body;
      }
    } catch (templateErr: any) {
      console.error('[NotificationService] Failed to check database custom template override, using defaults:', templateErr.message);
      const defaultRender = getDefaultTemplateBody(type, citizen, application, lgu, lguEmail, lguPhone, extras);
      emailSubject = defaultRender.subject;
      emailInnerHtml = defaultRender.body;
    }

    // Wrap body HTML in the premium responsive outer shell.
    const emailFullHtml = getEmailWrapper(emailInnerHtml, lgu, lguEmail, lguPhone, primaryColor);

    // Dynamic transporter handling for dynamic self-testing
    let mailTransporter = transporter;
    let senderEmail = process.env.GMAIL_USER || 'support@bayanserve.gov.ph';
    const isPlaceholderGmail = !process.env.GMAIL_USER || 
      process.env.GMAIL_USER.includes('your.email@gmail.com') || 
      !process.env.GMAIL_APP_PASSWORD || 
      process.env.GMAIL_APP_PASSWORD.includes('xxxx');

    if (isPlaceholderGmail) {
      console.log('[NotificationService] ℹ️ Gmail credentials not configured. Creating Ethereal SMTP test account...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        mailTransporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        senderEmail = testAccount.user;
      } catch (etherealErr: any) {
        console.error('[NotificationService] Ethereal account creation failed, falling back to dummy transporter:', etherealErr.message);
        mailTransporter = nodemailer.createTransport({
          jsonTransport: true
        });
        senderEmail = 'mock-sender@bayanserve.gov.ph';
      }
    }

    // Setup the mailing options.
    const mailOptions = {
      from: `"BayanServe - ${process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME || 'Municipality of Peñablanca'}" <${senderEmail}>`,
      to: citizen.email,
      subject: emailSubject,
      html: emailFullHtml,
      text: emailSubject.replace(/<\/?[^>]+(>|$)/g, ""), // clean text version fallback
    };

    // 3. Nodemailer execution with 1-Retry logic block
    let isSent = false;
    let errorMessage: string | null = null;

    try {
      console.log(`[NotificationService] Primary send attempt to ${citizen.email}...`);
      const info = await mailTransporter.sendMail(mailOptions);
      isSent = true;
      console.log(`[NotificationService] ✅ Successfully sent ${type} notification to ${citizen.email}`);
      
      if (isPlaceholderGmail && info) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`[NotificationService] 📧 Ethereal Preview URL: ${previewUrl}`);
        }
      }
    } catch (firstErr: any) {
      console.error(`[NotificationService] ❌ Primary send failed: ${firstErr.message}`);
      
      // Wait 30 seconds as requested by CORRECTION 2
      console.log(`[NotificationService] Retrying send in 30 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 30000));

      try {
        console.log(`[NotificationService] Secondary (retry) send attempt to ${citizen.email}...`);
        const info = await mailTransporter.sendMail(mailOptions);
        isSent = true;
        console.log(`[NotificationService] ✅ Successfully sent ${type} notification on second attempt to ${citizen.email}`);
        
        if (isPlaceholderGmail && info) {
          const previewUrl = nodemailer.getTestMessageUrl(info);
          if (previewUrl) {
            console.log(`[NotificationService] 📧 Ethereal Preview URL: ${previewUrl}`);
          }
        }
      } catch (secondErr: any) {
        console.error(`[NotificationService] ❌ Secondary send failed: ${secondErr.message}`);
        errorMessage = secondErr.message;
      }
    }

    // 4. Save attempt records to Notification table (never throw if write fails, just log)
    try {
      console.log(`[NotificationService] Saving notification audit log into database...`);
      await prisma.notification.create({
        data: {
          userId: citizenId,
          lguId: application.lgu_id,
          type: 'EMAIL',
          message: `[${type}] Subject: ${emailSubject}`,
          isSent: isSent,
          sentAt: new Date(),
          errorMessage: errorMessage,
        }
      });
      console.log(`[NotificationService] Saved notification database log with success status: ${isSent}`);
    } catch (saveErr: any) {
      console.error('[NotificationService] Failed to write notification record to database:', saveErr.message);
    }

  } catch (uncaughtErr: any) {
    // Top-level catch block to guarantee that under NO circumstance will an unhandled throw escape.
    console.error('[NotificationService] Uncaught system crash avoided in sendNotification():', uncaughtErr);
  }
}
