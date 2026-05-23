const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const app = await prisma.application.findFirst({
    where: { trackingNumber: 'PNB-2026-157542' },
    include: {
      citizen: true,
      serviceType: true,
      assignedOfficer: true,
      documents: true,
      payments: true,
      issuedDocuments: {
        where: { isRevoked: false },
        orderBy: { issuedAt: 'desc' },
      },
      history: {
        include: {
          changedByUser: true,
        },
        orderBy: { changedAt: 'desc' },
      },
    },
  });

  const returnedData = {
    id: app.id,
    trackingNumber: app.trackingNumber,
    status: app.status,
    submittedAt: app.submittedAt,
    notes: app.notes,
    formData: app.formData,
    serviceType: {
      id: app.serviceType.id,
      name: app.serviceType.name,
      category: app.serviceType.category,
      baseFee: Number(app.serviceType.baseFee),
      processingDays: app.serviceType.processingDays,
    },
    citizen: {
      id: app.citizen.id,
      fullName: app.citizen.fullName,
      email: app.citizen.email,
      phone: app.citizen.phone,
      nationalId: app.citizen.nationalId,
      address: app.citizen.address,
      barangay: app.citizen.barangay,
    },
    assignedOfficer: app.assignedOfficer ? {
      id: app.assignedOfficer.id,
      fullName: app.assignedOfficer.fullName,
      role: app.assignedOfficer.role,
    } : null,
    documents: app.documents.map(d => ({
      id: d.id,
      filename: d.filename,
      fileUrl: d.fileUrl,
      fileType: d.fileType,
    })),
    payments: app.payments.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      status: p.status,
      referenceNumber: p.referenceNumber,
      paidAt: p.paidAt,
    })),
    issuedDocuments: app.issuedDocuments.map(idoc => ({
      id: idoc.id,
      documentType: idoc.documentType,
      qrToken: idoc.qrToken,
      fileUrl: idoc.fileUrl,
      issuedAt: idoc.issuedAt,
    })),
    history: app.history.map(h => ({
      id: h.id,
      oldStatus: h.oldStatus,
      newStatus: h.newStatus,
      remarks: h.remarks,
      changedAt: h.changedAt,
      changedBy: h.changedByUser.fullName,
      changedByRole: h.changedByUser.role,
    })),
  };

  console.log('Returned application object:');
  console.log(JSON.stringify(returnedData, null, 2));
  console.log('TYPE OF formData:', typeof returnedData.formData);
  console.log('formData.personal:', returnedData.formData ? returnedData.formData.personal : null);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
