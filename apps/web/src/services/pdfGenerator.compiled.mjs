// src/services/pdfGenerator.tsx
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, renderToBuffer } from "@react-pdf/renderer";

// src/services/qrService.ts
import crypto from "crypto";
import QRCode from "qrcode";
async function generateQRCodeDataURL(token) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verificationUrl = `${baseUrl}/verify/${token}`;
  try {
    const dataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 150
    });
    return dataUrl;
  } catch (error) {
    console.error("[QR Generation Failure]:", error);
    throw new Error("Hindi magawa ang QR code para sa dokumento.");
  }
}

// src/services/pdfGenerator.tsx
import { toCardinal } from "n2words/en-US";
var styles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    position: "relative"
  },
  // Flag borders
  flagAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    flexDirection: "row"
  },
  flagBlue: {
    flex: 1,
    backgroundColor: "#0f3d6b"
  },
  flagRed: {
    flex: 1,
    backgroundColor: "#da291c"
  },
  flagGold: {
    width: 20,
    backgroundColor: "#f4c430"
  },
  // Watermark
  watermarkContainer: {
    position: "absolute",
    top: "40%",
    left: "5%",
    width: "90%",
    alignItems: "center",
    justifyContent: "center",
    transform: "rotate(-45deg)",
    zIndex: 1e3,
    opacity: 0.08
  },
  watermarkText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FF0000",
    textAlign: "center"
  },
  // Document Headers
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    paddingBottom: 12,
    marginBottom: 20
  },
  headerTextContainer: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 15
  },
  govText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#64748b",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 3
  },
  provinceText: {
    fontSize: 9,
    color: "#475569",
    textTransform: "uppercase"
  },
  lguNameText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
    marginVertical: 2
  },
  officeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginTop: 4,
    letterSpacing: 0.5
  },
  // Seals
  sealCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#94a3b8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc"
  },
  sealTextMicro: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#475569",
    textAlign: "center",
    lineHeight: 1.2
  },
  sealTextInitials: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center"
  },
  sealImage: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  // Titles
  docTitleContainer: {
    alignItems: "center",
    marginVertical: 15
  },
  docTitle: {
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  docSub: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 3,
    letterSpacing: 2
  },
  // Barangay Clearance specific layout
  clearanceBody: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 1.8,
    textAlign: "justify",
    marginVertical: 15
  },
  clearancePurpose: {
    fontSize: 11,
    color: "#1e293b",
    fontWeight: "bold",
    marginVertical: 10
  },
  clearanceGrid: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 12,
    marginVertical: 15
  },
  clearanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    fontSize: 10
  },
  // Cedula specific layout
  cedulaTable: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 15
  },
  cedulaRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    minHeight: 28,
    alignItems: "center"
  },
  cedulaCol: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 9,
    lineHeight: 1.4
  },
  cedulaLabel: {
    color: "#64748b",
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 2
  },
  cedulaValue: {
    color: "#0f172a",
    fontWeight: "bold"
  },
  cedulaTaxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 9
  },
  cedulaTaxLabel: {
    color: "#475569"
  },
  cedulaTaxValue: {
    color: "#0f172a",
    fontFamily: "Courier"
    // fixed-width line markers
  },
  cedulaWords: {
    fontSize: 9,
    fontWeight: "bold",
    paddingHorizontal: 10,
    marginTop: 4,
    color: "#1e3a8a"
  },
  cedulaDisclaimer: {
    fontSize: 7.5,
    fontStyle: "italic",
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 10
  },
  // Business Permit specific layout
  permitBorderFrame: {
    borderWidth: 2,
    borderRadius: 6,
    padding: 20,
    height: "100%",
    position: "relative"
  },
  permitMetadataTable: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    marginVertical: 15,
    backgroundColor: "#f8fafc"
  },
  permitMetaRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    minHeight: 35,
    alignItems: "center"
  },
  permitMetaCol: {
    flex: 1,
    padding: 8
  },
  permitMetaLabel: {
    fontSize: 8,
    color: "#64748b",
    fontWeight: "bold",
    textTransform: "uppercase"
  },
  permitMetaValue: {
    fontSize: 11,
    color: "#0f172a",
    fontWeight: "bold",
    marginTop: 2
  },
  // Signatures Panel
  signContainer: {
    marginTop: 35,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  signBlock: {
    alignItems: "center",
    width: 180
  },
  signLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#94a3b8",
    marginBottom: 4
  },
  signName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    textTransform: "uppercase"
  },
  signTitle: {
    fontSize: 8.5,
    color: "#64748b",
    marginTop: 2
  },
  // Footers
  footerContainer: {
    position: "absolute",
    bottom: 35,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  footerTextContainer: {
    flex: 1,
    marginRight: 20
  },
  footerControlNumber: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 2
  },
  footerDrySealText: {
    fontSize: 7.5,
    color: "#b91c1c",
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginTop: 3
  },
  footerInstruction: {
    fontSize: 7.5,
    color: "#64748b",
    lineHeight: 1.3
  },
  qrImage: {
    width: 70,
    height: 70,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 1,
    backgroundColor: "#ffffff"
  }
});
function getLguInitials(name) {
  return name.split(/\s+/).map((word) => word.charAt(0)).join("").toUpperCase().slice(0, 4);
}
var PhilippineSealPlaceholder = () => /* @__PURE__ */ React.createElement(View, { style: styles.sealCircle }, /* @__PURE__ */ React.createElement(Text, { style: { fontSize: 22, marginBottom: 2 } }, "\u{1F1F5}\u{1F1ED}"), /* @__PURE__ */ React.createElement(Text, { style: styles.sealTextMicro }, "REP. NG"), /* @__PURE__ */ React.createElement(Text, { style: styles.sealTextMicro }, "PILIPINAS"));
var LguSeal = ({ logoUrl, initials, primaryColor }) => {
  if (logoUrl && logoUrl.trim() !== "") {
    return /* @__PURE__ */ React.createElement(Image, { src: logoUrl, style: styles.sealImage });
  }
  return /* @__PURE__ */ React.createElement(View, { style: [styles.sealCircle, { borderColor: primaryColor }] }, /* @__PURE__ */ React.createElement(Text, { style: [styles.sealTextInitials, { color: primaryColor }] }, initials));
};
var DraftWatermark = ({ isDraft }) => {
  if (!isDraft) return null;
  return /* @__PURE__ */ React.createElement(View, { style: styles.watermarkContainer }, /* @__PURE__ */ React.createElement(Text, { style: styles.watermarkText }, "DRAFT \u2014 HINDI OPISYAL"));
};
var ClearanceDocument = ({ data, lgu, isDraft, qrDataUrl }) => {
  const primaryColor = lgu.primaryColor || "#0f3d6b";
  const lguInitials = getLguInitials(lgu.name);
  return /* @__PURE__ */ React.createElement(Document, null, /* @__PURE__ */ React.createElement(Page, { size: "A4", style: styles.page }, /* @__PURE__ */ React.createElement(DraftWatermark, { isDraft }), /* @__PURE__ */ React.createElement(View, { style: styles.flagAccent }, /* @__PURE__ */ React.createElement(View, { style: styles.flagBlue }), /* @__PURE__ */ React.createElement(View, { style: styles.flagRed }), /* @__PURE__ */ React.createElement(View, { style: styles.flagGold })), /* @__PURE__ */ React.createElement(View, { style: [styles.headerContainer, { borderBottomColor: primaryColor }] }, /* @__PURE__ */ React.createElement(PhilippineSealPlaceholder, null), /* @__PURE__ */ React.createElement(View, { style: styles.headerTextContainer }, /* @__PURE__ */ React.createElement(Text, { style: styles.govText }, "Republic of the Philippines"), /* @__PURE__ */ React.createElement(Text, { style: styles.provinceText }, "Province of ", lgu.province), /* @__PURE__ */ React.createElement(Text, { style: styles.lguNameText }, lgu.name), /* @__PURE__ */ React.createElement(Text, { style: styles.officeText }, "OFFICE OF THE PUNONG BARANGAY")), /* @__PURE__ */ React.createElement(LguSeal, { logoUrl: lgu.logoUrl, initials: lguInitials, primaryColor })), /* @__PURE__ */ React.createElement(View, { style: styles.docTitleContainer }, /* @__PURE__ */ React.createElement(Text, { style: [styles.docTitle, { color: primaryColor }] }, "BARANGAY CLEARANCE"), /* @__PURE__ */ React.createElement(Text, { style: styles.docSub }, "OFFICIAL CIVIC CERTIFICATE")), /* @__PURE__ */ React.createElement(Text, { style: styles.clearanceBody }, "TO WHOM IT MAY CONCERN:", "\n\n", "This is to certify that ", /* @__PURE__ */ React.createElement(Text, { style: { fontWeight: "bold" } }, data.applicantName.toUpperCase()), ", ", data.age, " years old, ", data.civilStatus.toLowerCase(), ", a resident of ", data.address, ", is known to be of good moral character and has no derogatory record on file in this office as of this date."), /* @__PURE__ */ React.createElement(Text, { style: styles.clearancePurpose }, "PURPOSE: This certification is issued upon request of the above-named person for ", /* @__PURE__ */ React.createElement(Text, { style: { textTransform: "uppercase" } }, data.purpose), "."), /* @__PURE__ */ React.createElement(View, { style: styles.clearanceGrid }, /* @__PURE__ */ React.createElement(View, { style: styles.clearanceRow }, /* @__PURE__ */ React.createElement(Text, { style: { color: "#64748b" } }, "Date of Issuance:"), /* @__PURE__ */ React.createElement(Text, { style: { fontWeight: "bold" } }, new Date(data.dateIssued).toLocaleDateString("en-PH", { dateStyle: "long" }))), /* @__PURE__ */ React.createElement(View, { style: styles.clearanceRow }, /* @__PURE__ */ React.createElement(Text, { style: { color: "#64748b" } }, "Payment Reference / OR No:"), /* @__PURE__ */ React.createElement(Text, { style: { fontWeight: "bold" } }, data.orNumber || "EXEMPTED / GRATUITOUS")), data.feePaid !== void 0 && /* @__PURE__ */ React.createElement(View, { style: styles.clearanceRow }, /* @__PURE__ */ React.createElement(Text, { style: { color: "#64748b" } }, "Amount Assessed & Paid:"), /* @__PURE__ */ React.createElement(Text, { style: { fontWeight: "bold" } }, "PHP ", Number(data.feePaid).toFixed(2)))), /* @__PURE__ */ React.createElement(View, { style: styles.signContainer }, /* @__PURE__ */ React.createElement(View, { style: styles.signBlock }, /* @__PURE__ */ React.createElement(Text, { style: { fontSize: 8, color: "#94a3b8", marginBottom: 12 } }, "Applicant Signature:"), /* @__PURE__ */ React.createElement(View, { style: styles.signLine }), /* @__PURE__ */ React.createElement(Text, { style: { fontSize: 9, color: "#475569" } }, "Holder Signature")), /* @__PURE__ */ React.createElement(View, { style: styles.signBlock }, /* @__PURE__ */ React.createElement(Text, { style: { fontSize: 8, color: "#94a3b8", marginBottom: 12 } }, "Authorized By:"), /* @__PURE__ */ React.createElement(View, { style: styles.signLine }), /* @__PURE__ */ React.createElement(Text, { style: styles.signName }, data.signatoryName), /* @__PURE__ */ React.createElement(Text, { style: styles.signTitle }, data.signatoryPosition))), /* @__PURE__ */ React.createElement(View, { style: styles.footerContainer }, /* @__PURE__ */ React.createElement(View, { style: styles.footerTextContainer }, /* @__PURE__ */ React.createElement(Text, { style: styles.footerControlNumber }, "CONTROL NO: ", data.controlNumber), /* @__PURE__ */ React.createElement(Text, { style: styles.footerDrySealText }, "* NOT VALID WITHOUT OFFICIAL BARANGAY DRY SEAL *"), /* @__PURE__ */ React.createElement(Text, { style: [styles.footerInstruction, { marginTop: 4 }] }, "BayanServe secure validation: Scan the QR code to verify the authenticity of this document. Manually verify inside the LGU portal using verification code: ", data.qrToken)), /* @__PURE__ */ React.createElement(Image, { src: qrDataUrl, style: styles.qrImage }))));
};
var CedulaDocument = ({ data, lgu, isDraft, qrDataUrl }) => {
  const primaryColor = lgu.primaryColor || "#b45309";
  const lguInitials = getLguInitials(lgu.name);
  let amountInWords = "ZERO";
  try {
    amountInWords = toCardinal(data.amountPaid).toUpperCase() + " PESOS ONLY";
  } catch (err) {
    amountInWords = `${data.amountPaid.toFixed(2)} PESOS ONLY`;
  }
  return /* @__PURE__ */ React.createElement(Document, null, /* @__PURE__ */ React.createElement(Page, { size: "A4", style: styles.page }, /* @__PURE__ */ React.createElement(DraftWatermark, { isDraft }), /* @__PURE__ */ React.createElement(View, { style: styles.flagAccent }, /* @__PURE__ */ React.createElement(View, { style: styles.flagBlue }), /* @__PURE__ */ React.createElement(View, { style: styles.flagRed }), /* @__PURE__ */ React.createElement(View, { style: styles.flagGold })), /* @__PURE__ */ React.createElement(View, { style: [styles.headerContainer, { borderBottomColor: primaryColor }] }, /* @__PURE__ */ React.createElement(PhilippineSealPlaceholder, null), /* @__PURE__ */ React.createElement(View, { style: styles.headerTextContainer }, /* @__PURE__ */ React.createElement(Text, { style: styles.govText }, "Republic of the Philippines"), /* @__PURE__ */ React.createElement(Text, { style: styles.provinceText }, "Province of ", lgu.province), /* @__PURE__ */ React.createElement(Text, { style: styles.lguNameText }, lgu.name), /* @__PURE__ */ React.createElement(Text, { style: styles.officeText }, "COMMUNITY TAX CERTIFICATE (INDIVIDUAL)")), /* @__PURE__ */ React.createElement(LguSeal, { logoUrl: lgu.logoUrl, initials: lguInitials, primaryColor })), /* @__PURE__ */ React.createElement(View, { style: [styles.cedulaTable, { borderColor: primaryColor }] }, /* @__PURE__ */ React.createElement(View, { style: styles.cedulaRow }, /* @__PURE__ */ React.createElement(View, { style: [styles.cedulaCol, { borderRightWidth: 1, borderRightColor: "#cbd5e1" }] }, /* @__PURE__ */ React.createElement(Text, { style: styles.cedulaLabel }, "CTC NUMBER"), /* @__PURE__ */ React.createElement(Text, { style: styles.cedulaValue }, data.ctcNumber)), /* @__PURE__ */ React.createElement(View, { style: styles.cedulaCol }, /* @__PURE__ */ React.createElement(Text, { style: styles.cedulaLabel }, "DATE ISSUED"), /* @__PURE__ */ React.createElement(Text, { style: styles.cedulaValue }, new Date(data.dateIssued).toLocaleDateString("en-PH", { dateStyle: "long" })))), /* @__PURE__ */ React.createElement(View, { style: styles.cedulaRow }, /* @__PURE__ */ React.createElement(View, { style: styles.cedulaCol }, /* @__PURE__ */ React.createElement(Text, { style: styles.cedulaLabel }, "FULL NAME (Last, First, Middle)"), /* @__PURE__ */ React.createElement(Text, { style: [styles.cedulaValue, { fontSize: 11 }] }, data.applicantName.toUpperCase()))), /* @__PURE__ */ React.createElement(View, { style: styles.cedulaRow }, /* @__PURE__ */ React.createElement(View, { style: styles.cedulaCol }, /* @__PURE__ */ React.createElement(Text, { style: styles.cedulaLabel }, "RESIDENCE ADDRESS"), /* @__PURE__ */ React.createElement(Text, { style: styles.cedulaValue }, data.address)))), /* @__PURE__ */ React.createElement(View, { style: { marginVertical: 10, padding: 5, borderStyle: "dashed", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 4 } }, /* @__PURE__ */ React.createElement(View, { style: styles.cedulaTaxRow }, /* @__PURE__ */ React.createElement(Text, { style: styles.cedulaTaxLabel }, "1. BASIC COMMUNITY TAX (\u20B15.00)"), /* @__PURE__ */ React.createElement(Text, { style: styles.cedulaTaxValue }, "\u20B1 ___________________")), /* @__PURE__ */ React.createElement(View, { style: styles.cedulaTaxRow }, /* @__PURE__ */ React.createElement(Text, { style: styles.cedulaTaxLabel }, "2. ADDITIONAL TAX (Based on Real Property / Income)"), /* @__PURE__ */ React.createElement(Text, { style: styles.cedulaTaxValue }, "\u20B1 ___________________")), /* @__PURE__ */ React.createElement(View, { style: [styles.cedulaTaxRow, { borderTopWidth: 1.5, borderTopColor: primaryColor, paddingTop: 6, marginTop: 6 }] }, /* @__PURE__ */ React.createElement(Text, { style: [styles.cedulaTaxLabel, { fontWeight: "bold", color: primaryColor }] }, "TOTAL AMOUNT PAID"), /* @__PURE__ */ React.createElement(Text, { style: [styles.cedulaTaxValue, { fontWeight: "bold", fontSize: 11, color: primaryColor }] }, "PHP ", data.amountPaid.toFixed(2))), /* @__PURE__ */ React.createElement(Text, { style: styles.cedulaWords }, "AMOUNT IN WORDS: ", amountInWords), /* @__PURE__ */ React.createElement(Text, { style: styles.cedulaDisclaimer }, "* Tax computation per Local Government Code. Verify with LGU Treasurer.")), /* @__PURE__ */ React.createElement(View, { style: styles.signContainer }, /* @__PURE__ */ React.createElement(View, { style: styles.signBlock }, /* @__PURE__ */ React.createElement(Text, { style: { fontSize: 8, color: "#94a3b8", marginBottom: 12 } }, "Taxpayer Signature:"), /* @__PURE__ */ React.createElement(View, { style: styles.signLine }), /* @__PURE__ */ React.createElement(Text, { style: { fontSize: 9, color: "#475569" } }, "Signature of Taxpayer")), /* @__PURE__ */ React.createElement(View, { style: styles.signBlock }, /* @__PURE__ */ React.createElement(Text, { style: { fontSize: 8, color: "#94a3b8", marginBottom: 12 } }, "Municipal Treasurer:"), /* @__PURE__ */ React.createElement(View, { style: styles.signLine }), /* @__PURE__ */ React.createElement(Text, { style: styles.signName }, "OFFICE OF THE TREASURER"), /* @__PURE__ */ React.createElement(Text, { style: styles.signTitle }, "LGU Municipal Collector"))), /* @__PURE__ */ React.createElement(View, { style: styles.footerContainer }, /* @__PURE__ */ React.createElement(View, { style: styles.footerTextContainer }, /* @__PURE__ */ React.createElement(Text, { style: styles.footerControlNumber }, "CONTROL NO: ", data.controlNumber), /* @__PURE__ */ React.createElement(Text, { style: styles.footerInstruction }, "BayanServe secure receipt tracker. Scan the QR code to verify this transaction against LGU municipal ledger records. Verification code: ", data.qrToken)), /* @__PURE__ */ React.createElement(Image, { src: qrDataUrl, style: styles.qrImage }))));
};
var BusinessPermitDocument = ({ data, lgu, isDraft, qrDataUrl }) => {
  const primaryColor = lgu.primaryColor || "#1e3a8a";
  const lguInitials = getLguInitials(lgu.name);
  return /* @__PURE__ */ React.createElement(Document, null, /* @__PURE__ */ React.createElement(Page, { size: "A4", style: styles.page }, /* @__PURE__ */ React.createElement(DraftWatermark, { isDraft }), /* @__PURE__ */ React.createElement(View, { style: styles.flagAccent }, /* @__PURE__ */ React.createElement(View, { style: styles.flagBlue }), /* @__PURE__ */ React.createElement(View, { style: styles.flagRed }), /* @__PURE__ */ React.createElement(View, { style: styles.flagGold })), /* @__PURE__ */ React.createElement(View, { style: [styles.permitBorderFrame, { borderColor: primaryColor }] }, /* @__PURE__ */ React.createElement(View, { style: [styles.headerContainer, { borderBottomColor: primaryColor, borderBottomWidth: 1.5 }] }, /* @__PURE__ */ React.createElement(PhilippineSealPlaceholder, null), /* @__PURE__ */ React.createElement(View, { style: styles.headerTextContainer }, /* @__PURE__ */ React.createElement(Text, { style: styles.govText }, "Republic of the Philippines"), /* @__PURE__ */ React.createElement(Text, { style: styles.provinceText }, "Province of ", lgu.province), /* @__PURE__ */ React.createElement(Text, { style: styles.lguNameText }, lgu.name.toUpperCase()), /* @__PURE__ */ React.createElement(Text, { style: [styles.officeText, { fontSize: 11 }] }, "OFFICE OF THE MAYOR")), /* @__PURE__ */ React.createElement(LguSeal, { logoUrl: lgu.logoUrl, initials: lguInitials, primaryColor })), /* @__PURE__ */ React.createElement(View, { style: styles.docTitleContainer }, /* @__PURE__ */ React.createElement(Text, { style: [styles.docTitle, { color: primaryColor, fontSize: 24, letterSpacing: 2 }] }, "BUSINESS PERMIT"), /* @__PURE__ */ React.createElement(Text, { style: styles.docSub }, "MAYOR'S CIVIC LICENSE TO OPERATE")), /* @__PURE__ */ React.createElement(Text, { style: { fontSize: 10.5, color: "#334155", textAlign: "center", lineHeight: 1.6, marginVertical: 8 } }, "This is formally granted to the business enterprise described below, under dynamic compliance with all local sanitary, zoning, building, and revenue mandates of this Municipality:"), /* @__PURE__ */ React.createElement(View, { style: styles.permitMetadataTable }, /* @__PURE__ */ React.createElement(View, { style: styles.permitMetaRow }, /* @__PURE__ */ React.createElement(View, { style: [styles.permitMetaCol, { borderRightWidth: 1, borderRightColor: "#e2e8f0" }] }, /* @__PURE__ */ React.createElement(Text, { style: styles.permitMetaLabel }, "Permit Number"), /* @__PURE__ */ React.createElement(Text, { style: styles.permitMetaValue }, data.permitNumber)), /* @__PURE__ */ React.createElement(View, { style: styles.permitMetaCol }, /* @__PURE__ */ React.createElement(Text, { style: styles.permitMetaLabel }, "Nature of Business"), /* @__PURE__ */ React.createElement(Text, { style: styles.permitMetaValue }, data.natureOfBusiness.toUpperCase()))), /* @__PURE__ */ React.createElement(View, { style: styles.permitMetaRow }, /* @__PURE__ */ React.createElement(View, { style: styles.permitMetaCol }, /* @__PURE__ */ React.createElement(Text, { style: styles.permitMetaLabel }, "Registered Business Name"), /* @__PURE__ */ React.createElement(Text, { style: [styles.permitMetaValue, { fontSize: 12, color: primaryColor }] }, data.businessName.toUpperCase()))), /* @__PURE__ */ React.createElement(View, { style: styles.permitMetaRow }, /* @__PURE__ */ React.createElement(View, { style: styles.permitMetaCol }, /* @__PURE__ */ React.createElement(Text, { style: styles.permitMetaLabel }, "Registered Owner / Proprietor"), /* @__PURE__ */ React.createElement(Text, { style: styles.permitMetaValue }, data.ownerName.toUpperCase()))), /* @__PURE__ */ React.createElement(View, { style: [styles.permitMetaRow, { borderBottomWidth: 0 }] }, /* @__PURE__ */ React.createElement(View, { style: [styles.permitMetaCol, { borderRightWidth: 1, borderRightColor: "#e2e8f0" }] }, /* @__PURE__ */ React.createElement(Text, { style: styles.permitMetaLabel }, "Business Location Address"), /* @__PURE__ */ React.createElement(Text, { style: [styles.permitMetaValue, { fontSize: 9.5 }] }, data.address)), /* @__PURE__ */ React.createElement(View, { style: [styles.permitMetaCol, { flex: 0.8 }] }, /* @__PURE__ */ React.createElement(Text, { style: styles.permitMetaLabel }, "Validity Period"), /* @__PURE__ */ React.createElement(Text, { style: [styles.permitMetaValue, { color: "#b91c1c" }] }, data.validityPeriod)))), /* @__PURE__ */ React.createElement(Text, { style: { fontSize: 9, color: "#64748b", textAlign: "center", lineHeight: 1.5, marginHorizontal: 20 } }, "NOTICE: This permit must be conspicuously displayed at the business establishment location at all times. Non-transferable and subject to revocation if civic safety ordinances are violated."), /* @__PURE__ */ React.createElement(View, { style: [styles.signContainer, { justifyContent: "center", marginTop: 30 }] }, /* @__PURE__ */ React.createElement(View, { style: [styles.signBlock, { width: 220 }] }, /* @__PURE__ */ React.createElement(View, { style: styles.signLine }), /* @__PURE__ */ React.createElement(Text, { style: styles.signName }, data.signatoryName), /* @__PURE__ */ React.createElement(Text, { style: styles.signTitle }, data.signatoryPosition))), /* @__PURE__ */ React.createElement(View, { style: [styles.footerContainer, { bottom: 20, left: 20, right: 20 }] }, /* @__PURE__ */ React.createElement(View, { style: styles.footerTextContainer }, /* @__PURE__ */ React.createElement(Text, { style: styles.footerControlNumber }, "CONTROL NO: ", data.controlNumber), /* @__PURE__ */ React.createElement(Text, { style: styles.footerInstruction }, "Scan the QR code to verify this permit status in real-time. Unauthorized copies are null and void. Verification code: ", data.qrToken)), /* @__PURE__ */ React.createElement(Image, { src: qrDataUrl, style: styles.qrImage })))));
};
async function generateDocument(type, data, lgu, isDraft) {
  try {
    const qrDataUrl = await generateQRCodeDataURL(data.qrToken);
    let docElement;
    if (type === "CLEARANCE") {
      docElement = React.createElement(ClearanceDocument, {
        data,
        lgu,
        isDraft,
        qrDataUrl
      });
    } else if (type === "CEDULA") {
      docElement = React.createElement(CedulaDocument, {
        data,
        lgu,
        isDraft,
        qrDataUrl
      });
    } else if (type === "BUSINESS_PERMIT") {
      docElement = React.createElement(BusinessPermitDocument, {
        data,
        lgu,
        isDraft,
        qrDataUrl
      });
    } else {
      throw new Error(`Maling uri ng dokumento: ${type}`);
    }
    const pdfBufferStream = await renderToBuffer(docElement);
    return pdfBufferStream;
  } catch (error) {
    console.error("[PDF Service Rendering Error]:", error);
    throw new Error(`Hindi magawa ang PDF certificate: ${error.message}`);
  }
}
export {
  generateDocument
};
