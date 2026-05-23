import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';

// Define visually premium styling for official civic documents
const styles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    position: 'relative',
  },
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
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#1a3c6e',
    paddingBottom: 15,
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  govText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  lguText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  provinceText: {
    fontSize: 10,
    color: '#475569',
  },
  docTitleContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  docTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e3a8a',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  docSub: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 4,
    letterSpacing: 2,
  },
  bodyText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 1.8,
    textAlign: 'justify',
    marginVertical: 15,
  },
  metaContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 15,
    marginVertical: 15,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    fontSize: 10,
  },
  metaLabel: {
    color: '#64748b',
    fontWeight: 'bold',
  },
  metaValue: {
    color: '#0f172a',
  },
  signContainer: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signBlock: {
    alignItems: 'center',
    width: 200,
  },
  signLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    marginBottom: 5,
  },
  signName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  signTitle: {
    fontSize: 9,
    color: '#64748b',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 40,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerTextContainer: {
    flex: 1,
    marginRight: 20,
  },
  footerMainText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  footerSubText: {
    fontSize: 8,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  qrImage: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 2,
    backgroundColor: '#ffffff',
  },
});

interface GeneratePdfParams {
  lguName: string;
  municipality: string;
  province: string;
  logoUrl?: string | null;
  serviceName: string;
  citizenName: string;
  trackingNumber: string;
  qrToken: string;
  issuedByName: string;
  issuedByRole: string;
  feePaid: string;
  orNumber: string;
}

/**
 * Creates a React element definition for a premium civic document
 */
const CivicDocument = ({
  lguName,
  municipality,
  province,
  logoUrl,
  serviceName,
  citizenName,
  trackingNumber,
  qrToken,
  issuedByName,
  issuedByRole,
  feePaid,
  orNumber,
}: GeneratePdfParams) => {
  // Public verification URL in the standard Web client format
  const verifyUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('5000', '3000') || 'http://localhost:3000'}/verify/${qrToken}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top Flag-themed Accent Border */}
        <View style={styles.flagAccent}>
          <View style={styles.flagBlue} />
          <View style={styles.flagRed} />
          <View style={styles.flagGold} />
        </View>

        {/* LGU Official Header */}
        <View style={styles.headerContainer}>
          {logoUrl ? (
            <Image src={logoUrl} style={styles.logoPlaceholder} />
          ) : (
            <Text style={{ fontSize: 32, marginBottom: 5 }}>🏛️</Text>
          )}
          <Text style={styles.govText}>Republika ng Pilipinas</Text>
          <Text style={styles.lguText}>{lguName}</Text>
          <Text style={styles.provinceText}>
            Lungsod ng {municipality}, Lalawigan ng {province}
          </Text>
        </View>

        {/* Document Title Section */}
        <View style={styles.docTitleContainer}>
          <Text style={styles.docTitle}>{serviceName}</Text>
          <Text style={styles.docSub}>OFFICIAL CIVIC DOCUMENT</Text>
        </View>

        {/* Certificate Body Paragraph */}
        <Text style={styles.bodyText}>
          TO WHOM IT MAY CONCERN:{"\n\n"}
          This is to certify that all requirements have been completed, assessed, and reviewed under local civic directives. Consequently, this document is formally granted to:
        </Text>

        {/* Citizen & File Metadata Block */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>AUTHORIZED HOLDER:</Text>
            <Text style={[styles.metaValue, { fontWeight: 'bold' }]}>{citizenName.toUpperCase()}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>TRACKING NUMBER:</Text>
            <Text style={styles.metaValue}>{trackingNumber}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>DATE OF ISSUANCE:</Text>
            <Text style={styles.metaValue}>{new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>OFFICIAL RECEIPT (OR) NO:</Text>
            <Text style={styles.metaValue}>{orNumber || 'EXEMPTED / N/A'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>FEE ASSESSED & PAID:</Text>
            <Text style={styles.metaValue}>PHP {feePaid}</Text>
          </View>
        </View>

        <Text style={styles.bodyText}>
          This certificate is issued to serve whatever legal intent it may support, under authority from the Office of the Local Government Unit. Any alterations or unauthorized changes invalidate this instrument.
        </Text>

        {/* Signatures Panel */}
        <View style={styles.signContainer}>
          <View style={styles.signBlock}>
            <Text style={{ fontSize: 9, color: '#94a3b8', marginBottom: 15 }}>Verified By:</Text>
            <View style={styles.signLine} />
            <Text style={styles.signName}>{issuedByName}</Text>
            <Text style={styles.signTitle}>{issuedByRole}</Text>
          </View>
          <View style={styles.signBlock}>
            <Text style={{ fontSize: 9, color: '#94a3b8', marginBottom: 15 }}>Approved By:</Text>
            <View style={styles.signLine} />
            <Text style={styles.signName}>OFFICE OF THE MAYOR</Text>
            <Text style={styles.signTitle}>LGU Municipal Administration</Text>
          </View>
        </View>

        {/* Mobile Verification Footer with Live QR Code */}
        <View style={styles.footerContainer}>
          <View style={styles.footerTextContainer}>
            <Text style={styles.footerMainText}>BayanServe Secure Validation</Text>
            <Text style={styles.footerSubText}>
              Scan the QR code to verify the authenticity of this digital document. You can also manually confirm by typing the token below inside the LGU portal:{"\n"}
              <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{qrToken}</Text>
            </Text>
          </View>
          <Image src={qrCodeUrl} style={styles.qrImage} />
        </View>
      </Page>
    </Document>
  );
};

/**
 * Compiles the React PDF tree and renders it to a raw node buffer.
 */
export async function generateDocumentPdf(params: GeneratePdfParams): Promise<Buffer> {
  const docElement = <CivicDocument {...params} />;
  const pdfInstance = pdf(docElement);
  return (await pdfInstance.toBuffer()) as unknown as Buffer;
}
