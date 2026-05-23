import fs from 'fs';
import path from 'path';
import { generateDocument, LGU, ClearanceData, CedulaData, BusinessPermitData } from '../services/pdfGenerator';

async function main() {
  const outputDir = path.join(__dirname, 'output');

  // Create the output directory if it does not exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Fictional test LGU object matching Correction 4 requirements
  const testLgu: LGU = {
    id: "test-lgu-001",
    name: "BayanServe Demo LGU",
    municipality: "Sample Municipality",
    province: "Sample Province",
    logoUrl: null,
    primaryColor: "#1a3c6e"
  };

  // Format helper for Control Numbers: {LGU_INITIALS}-{DOCUMENT_TYPE_CODE}-{YYYY}-{TRACKING_NUMBER}
  const getLguInitials = (name: string): string => {
    return name
      .split(/\s+/)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 4);
  };

  const lguInitials = getLguInitials(testLgu.name);
  const currentYear = new Date().getFullYear().toString();

  // 1. BARANGAY CLEARANCE TEST DATA
  const trackingClearance = "TUG-2026-000001";
  const clearanceData: ClearanceData = {
    applicantName: "Juan Dela Cruz",
    age: 28,
    civilStatus: "SINGLE",
    address: "123 Mabini St., Barangay Centro, Sample Municipality",
    purpose: "LOCAL EMPLOYMENT REQUIREMENT",
    dateIssued: new Date("2026-05-20"),
    orNumber: "OR-98765432-A",
    feePaid: 150.00,
    controlNumber: `${lguInitials}-CLR-${currentYear}-${trackingClearance}`,
    qrToken: "clearance-token-uuid-v4-12345",
    signatoryName: "HON. RENATO B. RAMOS",
    signatoryPosition: "Punong Barangay"
  };

  // 2. CEDULA TEST DATA
  const trackingCedula = "TUG-2026-000002";
  const cedulaData: CedulaData = {
    applicantName: "Maria Clara Santos",
    address: "456 Rizal Ave., Barangay Centro, Sample Municipality",
    ctcNumber: "CTC-2026-88776655",
    amountPaid: 325.50, // Test amount with decimals for n2words and currency formatting
    dateIssued: new Date("2026-05-20"),
    controlNumber: `${lguInitials}-CTC-${currentYear}-${trackingCedula}`,
    qrToken: "cedula-token-uuid-v4-67890"
  };

  // 3. BUSINESS PERMIT TEST DATA
  const trackingPermit = "TUG-2026-000003";
  const businessPermitData: BusinessPermitData = {
    businessName: "KAPENG BARAKO CAFE & BAKEHOUSE",
    ownerName: "Juan Dela Cruz",
    address: "789 Bonifacio Highway, Barangay Centro, Sample Municipality",
    natureOfBusiness: "RETAIL - COFFEE SHOP AND BAKERY",
    permitNumber: "BP-2026-000456",
    validityPeriod: `DECEMBER 31, ${currentYear}`,
    signatoryName: "HON. MARIA ALICIA G. CASTRO",
    signatoryPosition: "Municipal Mayor",
    controlNumber: `${lguInitials}-BPR-${currentYear}-${trackingPermit}`,
    qrToken: "permit-token-uuid-v4-11223"
  };

  console.log('Starting PDF generation tests...\n');

  try {
    // Generate Barangay Clearance (Draft - with watermark)
    console.log('Generating Barangay Clearance...');
    const clearanceBuffer = await generateDocument('CLEARANCE', clearanceData, testLgu, true);
    const clearancePath = path.join(outputDir, 'test_clearance.pdf');
    fs.writeFileSync(clearancePath, clearanceBuffer);
    console.log(`✅ [BARANGAY_CLEARANCE] generated: apps/api/src/scratch/output/test_clearance.pdf`);

    // Generate Cedula (Official - no watermark)
    console.log('Generating Cedula...');
    const cedulaBuffer = await generateDocument('CEDULA', cedulaData, testLgu, false);
    const cedulaPath = path.join(outputDir, 'test_cedula.pdf');
    fs.writeFileSync(cedulaPath, cedulaBuffer);
    console.log(`✅ [CEDULA] generated: apps/api/src/scratch/output/test_cedula.pdf`);

    // Generate Business Permit (Draft - with watermark)
    console.log('Generating Business Permit...');
    const permitBuffer = await generateDocument('BUSINESS_PERMIT', businessPermitData, testLgu, true);
    const permitPath = path.join(outputDir, 'test_business_permit.pdf');
    fs.writeFileSync(permitPath, permitBuffer);
    console.log(`✅ [BUSINESS_PERMIT] generated: apps/api/src/scratch/output/test_business_permit.pdf`);

    console.log('\n🎉 All test documents generated successfully!');
  } catch (error) {
    console.error('❌ Error generating test documents:', error);
    process.exit(1);
  }
}

main();
