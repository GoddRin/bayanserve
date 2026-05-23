import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, renderToBuffer } from '@react-pdf/renderer';
import { generateQRCodeDataURL } from './qrService';

// Resolve n2words UMD bundle dynamically to bypass package exports mapping limitations
const n2wordsPath = require.resolve('n2words/package.json').replace('package.json', 'dist/en-US.umd.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const n2wordsBundle = require(n2wordsPath);
const n2words = n2wordsBundle.enUS;


// ─────────────────────────────────────────────────────────────────────────────
// TS INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface ClearanceData {
  applicantName: string;
  age: number;
  civilStatus: string;
  address: string;
  purpose: string;
  dateIssued: Date | string;
  orNumber?: string;
  feePaid?: number;
  controlNumber: string;
  qrToken: string;
  signatoryName: string;
  signatoryPosition: string;
}

export interface CedulaData {
  applicantName: string;
  address: string;
  ctcNumber: string;
  amountPaid: number;
  dateIssued: Date | string;
  controlNumber: string;
  qrToken: string;
}

export interface BusinessPermitData {
  businessName: string;
  ownerName: string;
  address: string;
  natureOfBusiness: string;
  permitNumber: string;
  validityPeriod: string;
  signatoryName: string;
  signatoryPosition: string;
  controlNumber: string;
  qrToken: string;
}

export type DocumentData = ClearanceData | CedulaData | BusinessPermitData;

export interface LGU {
  id: string;
  name: string;
  municipality: string;
  province: string;
  logoUrl?: string | null;
  primaryColor?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM STYLING SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    position: 'relative',
  },
  
  // Flag borders
  flagAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    flexDirection: 'row',
  },
  flagBlue: {
    flex: 1,
    backgroundColor: '#0f3d6b',
  },
  flagRed: {
    flex: 1,
    backgroundColor: '#da291c',
  },
  flagGold: {
    width: 20,
    backgroundColor: '#f4c430',
  },

  // Watermark
  watermarkContainer: {
    position: 'absolute',
    top: '40%',
    left: '5%',
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'rotate(-45deg)',
    zIndex: 1000,
    opacity: 0.08,
  },
  watermarkText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF0000',
    textAlign: 'center',
  },

  // Document Headers
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    paddingBottom: 12,
    marginBottom: 20,
  },
  headerTextContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 15,
  },
  govText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  provinceText: {
    fontSize: 9,
    color: '#475569',
    textTransform: 'uppercase',
  },
  lguNameText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    marginVertical: 2,
  },
  officeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Seals
  sealCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  sealTextMicro: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 1.2,
  },
  sealTextInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sealImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },

  // Titles
  docTitleContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  docTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  docSub: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 3,
    letterSpacing: 2,
  },

  // Barangay Clearance specific layout
  clearanceBody: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 1.8,
    textAlign: 'justify',
    marginVertical: 15,
  },
  clearancePurpose: {
    fontSize: 11,
    color: '#1e293b',
    fontWeight: 'bold',
    marginVertical: 10,
  },
  clearanceGrid: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 12,
    marginVertical: 15,
  },
  clearanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    fontSize: 10,
  },

  // Cedula specific layout
  cedulaTable: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 15,
  },
  cedulaRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    minHeight: 28,
    alignItems: 'center',
  },
  cedulaCol: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 9,
    lineHeight: 1.4,
  },
  cedulaLabel: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cedulaValue: {
    color: '#0f172a',
    fontWeight: 'bold',
  },
  cedulaTaxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 9,
  },
  cedulaTaxLabel: {
    color: '#475569',
  },
  cedulaTaxValue: {
    color: '#0f172a',
    fontFamily: 'Courier', // fixed-width line markers
  },
  cedulaWords: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    marginTop: 4,
    color: '#1e3a8a',
  },
  cedulaDisclaimer: {
    fontSize: 7.5,
    fontStyle: 'italic',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 10,
  },

  // Business Permit specific layout
  permitBorderFrame: {
    borderWidth: 2,
    borderRadius: 6,
    padding: 20,
    height: '100%',
    position: 'relative',
  },
  permitMetadataTable: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    marginVertical: 15,
    backgroundColor: '#f8fafc',
  },
  permitMetaRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 35,
    alignItems: 'center',
  },
  permitMetaCol: {
    flex: 1,
    padding: 8,
  },
  permitMetaLabel: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  permitMetaValue: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: 'bold',
    marginTop: 2,
  },

  // Signatures Panel
  signContainer: {
    marginTop: 35,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signBlock: {
    alignItems: 'center',
    width: 180,
  },
  signLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    marginBottom: 4,
  },
  signName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  signTitle: {
    fontSize: 8.5,
    color: '#64748b',
    marginTop: 2,
  },

  // Footers
  footerContainer: {
    position: 'absolute',
    bottom: 35,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerTextContainer: {
    flex: 1,
    marginRight: 20,
  },
  footerControlNumber: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  footerDrySealText: {
    fontSize: 7.5,
    color: '#b91c1c',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginTop: 3,
  },
  footerInstruction: {
    fontSize: 7.5,
    color: '#64748b',
    lineHeight: 1.3,
  },
  qrImage: {
    width: 70,
    height: 70,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 1,
    backgroundColor: '#ffffff',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT FALLBACKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clean LGU initials calculator based on name
 */
function getLguInitials(name: string): string {
  return name
    .split(/\s+/)
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 4);
}

/**
 * Text-based fallback representing the official Philippine Seal placeholder
 */
const PhilippineSealPlaceholder = () => (
  <View style={styles.sealCircle}>
    <Text style={{ fontSize: 22, marginBottom: 2 }}>🇵🇭</Text>
    <Text style={styles.sealTextMicro}>REP. NG</Text>
    <Text style={styles.sealTextMicro}>PILIPINAS</Text>
  </View>
);

interface LguSealProps {
  logoUrl?: string | null;
  initials: string;
  primaryColor: string;
}

/**
 * Image seal layout or visual initials fallback to prevent renderer crashes
 */
const LguSeal = ({ logoUrl, initials, primaryColor }: LguSealProps) => {
  if (logoUrl && logoUrl.trim() !== '') {
    return <Image src={logoUrl} style={styles.sealImage} />;
  }
  return (
    <View style={[styles.sealCircle, { borderColor: primaryColor }]}>
      <Text style={[styles.sealTextInitials, { color: primaryColor }]}>{initials}</Text>
    </View>
  );
};

interface WatermarkProps {
  isDraft: boolean;
}

/**
 * Diagonal draft overlay for unreleased documents
 */
const DraftWatermark = ({ isDraft }: WatermarkProps) => {
  if (!isDraft) return null;
  return (
    <View style={styles.watermarkContainer}>
      <Text style={styles.watermarkText}>DRAFT — HINDI OPISYAL</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT TEMPLATE: BARANGAY CLEARANCE
// ─────────────────────────────────────────────────────────────────────────────

interface ClearanceTemplateProps {
  data: ClearanceData;
  lgu: LGU;
  isDraft: boolean;
  qrDataUrl: string;
}

const ClearanceDocument = ({ data, lgu, isDraft, qrDataUrl }: ClearanceTemplateProps) => {
  const primaryColor = lgu.primaryColor || '#0f3d6b';
  const lguInitials = getLguInitials(lgu.name);
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DraftWatermark isDraft={isDraft} />
        
        {/* Top Flag Line */}
        <View style={styles.flagAccent}>
          <View style={styles.flagBlue} />
          <View style={styles.flagRed} />
          <View style={styles.flagGold} />
        </View>

        {/* Dynamic Responsive Header */}
        <View style={[styles.headerContainer, { borderBottomColor: primaryColor }]}>
          <PhilippineSealPlaceholder />
          <View style={styles.headerTextContainer}>
            <Text style={styles.govText}>Republika ng Pilipinas</Text>
            <Text style={styles.provinceText}>Lalawigan ng {lgu.province}</Text>
            <Text style={styles.lguNameText}>{lgu.name}</Text>
            <Text style={styles.officeText}>OFFICE OF THE PUNONG BARANGAY</Text>
          </View>
          <LguSeal logoUrl={lgu.logoUrl} initials={lguInitials} primaryColor={primaryColor} />
        </View>

        {/* Doc Title */}
        <View style={styles.docTitleContainer}>
          <Text style={[styles.docTitle, { color: primaryColor }]}>BARANGAY CLEARANCE</Text>
          <Text style={styles.docSub}>OFFICIAL CIVIC CERTIFICATE</Text>
        </View>

        {/* Body content */}
        <Text style={styles.clearanceBody}>
          TO WHOM IT MAY CONCERN:{"\n\n"}
          This is to certify that <Text style={{ fontWeight: 'bold' }}>{data.applicantName.toUpperCase()}</Text>, {data.age} years old, {data.civilStatus.toLowerCase()}, a resident of {data.address}, is known to be of good moral character and has no derogatory record on file in this office as of this date.
        </Text>

        <Text style={styles.clearancePurpose}>
          PURPOSE: This certification is issued upon request of the above-named person for <Text style={{ textTransform: 'uppercase' }}>{data.purpose}</Text>.
        </Text>

        {/* Log details */}
        <View style={styles.clearanceGrid}>
          <View style={styles.clearanceRow}>
            <Text style={{ color: '#64748b' }}>Date of Issuance:</Text>
            <Text style={{ fontWeight: 'bold' }}>{new Date(data.dateIssued).toLocaleDateString('en-PH', { dateStyle: 'long' })}</Text>
          </View>
          <View style={styles.clearanceRow}>
            <Text style={{ color: '#64748b' }}>Payment Reference / OR No:</Text>
            <Text style={{ fontWeight: 'bold' }}>{data.orNumber || 'EXEMPTED / GRATUITOUS'}</Text>
          </View>
          {data.feePaid !== undefined && (
            <View style={styles.clearanceRow}>
              <Text style={{ color: '#64748b' }}>Amount Assessed & Paid:</Text>
              <Text style={{ fontWeight: 'bold' }}>PHP {Number(data.feePaid).toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Signatures */}
        <View style={styles.signContainer}>
          <View style={styles.signBlock}>
            <Text style={{ fontSize: 8, color: '#94a3b8', marginBottom: 12 }}>Applicant Signature:</Text>
            <View style={styles.signLine} />
            <Text style={{ fontSize: 9, color: '#475569' }}>Holder Signature</Text>
          </View>
          
          <View style={styles.signBlock}>
            <Text style={{ fontSize: 8, color: '#94a3b8', marginBottom: 12 }}>Authorized By:</Text>
            <View style={styles.signLine} />
            <Text style={styles.signName}>{data.signatoryName}</Text>
            <Text style={styles.signTitle}>{data.signatoryPosition}</Text>
          </View>
        </View>

        {/* Footer info with QR */}
        <View style={styles.footerContainer}>
          <View style={styles.footerTextContainer}>
            <Text style={styles.footerControlNumber}>CONTROL NO: {data.controlNumber}</Text>
            <Text style={styles.footerDrySealText}>* NOT VALID WITHOUT OFFICIAL BARANGAY DRY SEAL *</Text>
            <Text style={[styles.footerInstruction, { marginTop: 4 }]}>
              BayanServe secure validation: Scan the QR code to verify the authenticity of this document. Manually verify inside the LGU portal using verification code: {data.qrToken}
            </Text>
          </View>
          <Image src={qrDataUrl} style={styles.qrImage} />
        </View>
      </Page>
    </Document>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT TEMPLATE: CEDULA
// ─────────────────────────────────────────────────────────────────────────────

interface CedulaTemplateProps {
  data: CedulaData;
  lgu: LGU;
  isDraft: boolean;
  qrDataUrl: string;
}

const CedulaDocument = ({ data, lgu, isDraft, qrDataUrl }: CedulaTemplateProps) => {
  const primaryColor = lgu.primaryColor || '#b45309'; // Gold/Amber default for tax certificate
  const lguInitials = getLguInitials(lgu.name);
  
  // Convert number to words cleanly
  let amountInWords = 'ZERO';
  try {
    amountInWords = n2words(data.amountPaid, { lang: 'en' }).toUpperCase() + ' PESOS ONLY';
  } catch (err) {
    amountInWords = `${data.amountPaid.toFixed(2)} PESOS ONLY`;
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DraftWatermark isDraft={isDraft} />
        
        {/* Top Flag Line */}
        <View style={styles.flagAccent}>
          <View style={styles.flagBlue} />
          <View style={styles.flagRed} />
          <View style={styles.flagGold} />
        </View>

        {/* Receipt Header */}
        <View style={[styles.headerContainer, { borderBottomColor: primaryColor }]}>
          <PhilippineSealPlaceholder />
          <View style={styles.headerTextContainer}>
            <Text style={styles.govText}>Republika ng Pilipinas</Text>
            <Text style={styles.provinceText}>Lalawigan ng {lgu.province}</Text>
            <Text style={styles.lguNameText}>{lgu.name}</Text>
            <Text style={styles.officeText}>COMMUNITY TAX CERTIFICATE (INDIVIDUAL)</Text>
          </View>
          <LguSeal logoUrl={lgu.logoUrl} initials={lguInitials} primaryColor={primaryColor} />
        </View>

        {/* Receipt table cells */}
        <View style={[styles.cedulaTable, { borderColor: primaryColor }]}>
          <View style={styles.cedulaRow}>
            <View style={[styles.cedulaCol, { borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}>
              <Text style={styles.cedulaLabel}>CTC NUMBER</Text>
              <Text style={styles.cedulaValue}>{data.ctcNumber}</Text>
            </View>
            <View style={styles.cedulaCol}>
              <Text style={styles.cedulaLabel}>DATE ISSUED</Text>
              <Text style={styles.cedulaValue}>{new Date(data.dateIssued).toLocaleDateString('en-PH', { dateStyle: 'long' })}</Text>
            </View>
          </View>

          <View style={styles.cedulaRow}>
            <View style={styles.cedulaCol}>
              <Text style={styles.cedulaLabel}>FULL NAME (Last, First, Middle)</Text>
              <Text style={[styles.cedulaValue, { fontSize: 11 }]}>{data.applicantName.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.cedulaRow}>
            <View style={styles.cedulaCol}>
              <Text style={styles.cedulaLabel}>RESIDENCE ADDRESS</Text>
              <Text style={styles.cedulaValue}>{data.address}</Text>
            </View>
          </View>
        </View>

        {/* Display Only Calculations per Correction 3 */}
        <View style={{ marginVertical: 10, padding: 5, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4 }}>
          <View style={styles.cedulaTaxRow}>
            <Text style={styles.cedulaTaxLabel}>1. BASIC COMMUNITY TAX (₱5.00)</Text>
            <Text style={styles.cedulaTaxValue}>₱ ___________________</Text>
          </View>
          <View style={styles.cedulaTaxRow}>
            <Text style={styles.cedulaTaxLabel}>2. ADDITIONAL TAX (Based on Real Property / Income)</Text>
            <Text style={styles.cedulaTaxValue}>₱ ___________________</Text>
          </View>
          
          <View style={[styles.cedulaTaxRow, { borderTopWidth: 1.5, borderTopColor: primaryColor, paddingTop: 6, marginTop: 6 }]}>
            <Text style={[styles.cedulaTaxLabel, { fontWeight: 'bold', color: primaryColor }]}>TOTAL AMOUNT PAID</Text>
            <Text style={[styles.cedulaTaxValue, { fontWeight: 'bold', fontSize: 11, color: primaryColor }]}>PHP {data.amountPaid.toFixed(2)}</Text>
          </View>
          
          <Text style={styles.cedulaWords}>AMOUNT IN WORDS: {amountInWords}</Text>
          
          <Text style={styles.cedulaDisclaimer}>
            * Tax computation per Local Government Code. Verify with LGU Treasurer.
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signContainer}>
          <View style={styles.signBlock}>
            <Text style={{ fontSize: 8, color: '#94a3b8', marginBottom: 12 }}>Taxpayer Signature:</Text>
            <View style={styles.signLine} />
            <Text style={{ fontSize: 9, color: '#475569' }}>Signature of Taxpayer</Text>
          </View>
          
          <View style={styles.signBlock}>
            <Text style={{ fontSize: 8, color: '#94a3b8', marginBottom: 12 }}>Municipal Treasurer:</Text>
            <View style={styles.signLine} />
            <Text style={styles.signName}>OFFICE OF THE TREASURER</Text>
            <Text style={styles.signTitle}>LGU Municipal Collector</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <View style={styles.footerTextContainer}>
            <Text style={styles.footerControlNumber}>CONTROL NO: {data.controlNumber}</Text>
            <Text style={styles.footerInstruction}>
              BayanServe secure receipt tracker. Scan the QR code to verify this transaction against LGU municipal ledger records. Verification code: {data.qrToken}
            </Text>
          </View>
          <Image src={qrDataUrl} style={styles.qrImage} />
        </View>
      </Page>
    </Document>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT TEMPLATE: BUSINESS PERMIT
// ─────────────────────────────────────────────────────────────────────────────

interface PermitTemplateProps {
  data: BusinessPermitData;
  lgu: LGU;
  isDraft: boolean;
  qrDataUrl: string;
}

const BusinessPermitDocument = ({ data, lgu, isDraft, qrDataUrl }: PermitTemplateProps) => {
  const primaryColor = lgu.primaryColor || '#1e3a8a'; // Royal Navy theme for Business permits
  const lguInitials = getLguInitials(lgu.name);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DraftWatermark isDraft={isDraft} />
        
        {/* Flag border */}
        <View style={styles.flagAccent}>
          <View style={styles.flagBlue} />
          <View style={styles.flagRed} />
          <View style={styles.flagGold} />
        </View>

        {/* Ornamental Border Frame for certificate premium aesthetic */}
        <View style={[styles.permitBorderFrame, { borderColor: primaryColor }]}>
          
          {/* Header */}
          <View style={[styles.headerContainer, { borderBottomColor: primaryColor, borderBottomWidth: 1.5 }]}>
            <PhilippineSealPlaceholder />
            <View style={styles.headerTextContainer}>
              <Text style={styles.govText}>Republic of the Philippines</Text>
              <Text style={styles.provinceText}>Province of {lgu.province}</Text>
              <Text style={styles.lguNameText}>{lgu.name.toUpperCase()}</Text>
              <Text style={[styles.officeText, { fontSize: 11 }]}>OFFICE OF THE MAYOR</Text>
            </View>
            <LguSeal logoUrl={lgu.logoUrl} initials={lguInitials} primaryColor={primaryColor} />
          </View>

          {/* Permit Title */}
          <View style={styles.docTitleContainer}>
            <Text style={[styles.docTitle, { color: primaryColor, fontSize: 24, letterSpacing: 2 }]}>BUSINESS PERMIT</Text>
            <Text style={styles.docSub}>MAYOR'S CIVIC LICENSE TO OPERATE</Text>
          </View>

          {/* Certificate statement */}
          <Text style={{ fontSize: 10.5, color: '#334155', textAlign: 'center', lineHeight: 1.6, marginVertical: 8 }}>
            This is formally granted to the business enterprise described below, under dynamic compliance with all local sanitary, zoning, building, and revenue mandates of this Municipality:
          </Text>

          {/* Double Column Grid Card */}
          <View style={styles.permitMetadataTable}>
            <View style={styles.permitMetaRow}>
              <View style={[styles.permitMetaCol, { borderRightWidth: 1, borderRightColor: '#e2e8f0' }]}>
                <Text style={styles.permitMetaLabel}>Permit Number</Text>
                <Text style={styles.permitMetaValue}>{data.permitNumber}</Text>
              </View>
              <View style={styles.permitMetaCol}>
                <Text style={styles.permitMetaLabel}>Nature of Business</Text>
                <Text style={styles.permitMetaValue}>{data.natureOfBusiness.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.permitMetaRow}>
              <View style={styles.permitMetaCol}>
                <Text style={styles.permitMetaLabel}>Registered Business Name</Text>
                <Text style={[styles.permitMetaValue, { fontSize: 12, color: primaryColor }]}>{data.businessName.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.permitMetaRow}>
              <View style={styles.permitMetaCol}>
                <Text style={styles.permitMetaLabel}>Registered Owner / Proprietor</Text>
                <Text style={styles.permitMetaValue}>{data.ownerName.toUpperCase()}</Text>
              </View>
            </View>

            <View style={[styles.permitMetaRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.permitMetaCol, { borderRightWidth: 1, borderRightColor: '#e2e8f0' }]}>
                <Text style={styles.permitMetaLabel}>Business Location Address</Text>
                <Text style={[styles.permitMetaValue, { fontSize: 9.5 }]}>{data.address}</Text>
              </View>
              <View style={[styles.permitMetaCol, { flex: 0.8 }]}>
                <Text style={styles.permitMetaLabel}>Validity Period</Text>
                <Text style={[styles.permitMetaValue, { color: '#b91c1c' }]}>{data.validityPeriod}</Text>
              </View>
            </View>
          </View>

          <Text style={{ fontSize: 9, color: '#64748b', textAlign: 'center', lineHeight: 1.5, marginHorizontal: 20 }}>
            NOTICE: This permit must be conspicuously displayed at the business establishment location at all times. Non-transferable and subject to revocation if civic safety ordinances are violated.
          </Text>

          {/* Mayor Signature Block */}
          <View style={[styles.signContainer, { justifyContent: 'center', marginTop: 30 }]}>
            <View style={[styles.signBlock, { width: 220 }]}>
              <View style={styles.signLine} />
              <Text style={styles.signName}>{data.signatoryName}</Text>
              <Text style={styles.signTitle}>{data.signatoryPosition}</Text>
            </View>
          </View>

          {/* Frame footer */}
          <View style={[styles.footerContainer, { bottom: 20, left: 20, right: 20 }]}>
            <View style={styles.footerTextContainer}>
              <Text style={styles.footerControlNumber}>CONTROL NO: {data.controlNumber}</Text>
              <Text style={styles.footerInstruction}>
                Scan the QR code to verify this permit status in real-time. Unauthorized copies are null and void. Verification code: {data.qrToken}
              </Text>
            </View>
            <Image src={qrDataUrl} style={styles.qrImage} />
          </View>

        </View>
      </Page>
    </Document>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API EXPORT ENTRYPOINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compiles a visual, high-fidelity LGU civic certificate or tax receipt to a raw Node buffer.
 * 
 * @param type The document category: 'CLEARANCE', 'CEDULA', or 'BUSINESS_PERMIT'.
 * @param data Fictional or real structured metadata filling dynamic document fields.
 * @param lgu The tenant LGU profile configuration object.
 * @param isDraft If true, overlays a bold red "DRAFT — HINDI OPISYAL" watermark across the page.
 * @returns A Promise resolving to a compiled raw Node Buffer.
 */
export async function generateDocument(
  type: 'CLEARANCE' | 'CEDULA' | 'BUSINESS_PERMIT',
  data: DocumentData,
  lgu: LGU,
  isDraft: boolean
): Promise<Buffer> {
  try {
    // 1. Generate the secure, high-contrast base64 QR Code URL
    const qrDataUrl = await generateQRCodeDataURL(data.qrToken);

    // 2. Select corresponding document layout JSX tree
    let docElement: React.ReactElement;

    if (type === 'CLEARANCE') {
      docElement = <ClearanceDocument data={data as ClearanceData} lgu={lgu} isDraft={isDraft} qrDataUrl={qrDataUrl} />;
    } else if (type === 'CEDULA') {
      docElement = <CedulaDocument data={data as CedulaData} lgu={lgu} isDraft={isDraft} qrDataUrl={qrDataUrl} />;
    } else if (type === 'BUSINESS_PERMIT') {
      docElement = <BusinessPermitDocument data={data as BusinessPermitData} lgu={lgu} isDraft={isDraft} qrDataUrl={qrDataUrl} />;
    } else {
      throw new Error(`Maling uri ng dokumento: ${type}`);
    }

    // 3. Compile and render the document tree to raw Node Buffer
    const pdfBufferStream = await renderToBuffer(docElement);
    return pdfBufferStream;
  } catch (error: any) {
    console.error('[PDF Service Rendering Error]:', error);
    throw new Error(`Hindi magawa ang PDF certificate: ${error.message}`);
  }
}
