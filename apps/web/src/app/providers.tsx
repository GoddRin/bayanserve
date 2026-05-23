'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── TRANSLATION DICTIONARY ──────────────────────────────────────────────────

const translations = {
  en: {
    // Navigation
    home: 'Home',
    track: 'Track Application',
    dashboard: 'My Applications',
    login: 'Citizen Login',
    logout: 'Logout',
    adminLogin: 'LGU Staff Login',
    languageLabel: 'Filipino',

    // Hero
    heroTitle: 'Apply for documents online. Anywhere, anytime.',
    heroSubtitle: 'BayanServe makes it easy to request clearances, permits, and certificates from the Municipality of Peñablanca.',
    getStarted: 'Get Started',
    trackSub: 'Check your application status instantly',

    // Home services
    servicesTitle: 'Available Civic Services',
    servicesSubtitle: 'Select a service below to begin your application online.',
    baseFee: 'Base Fee',
    processingTime: 'Processing Time',
    applyNow: 'Apply Now',
    free: 'Free',
    days: 'days',
    day: 'day',
    
    // Application Wizard
    personalInfo: 'Personal Information',
    serviceFields: 'Application Details',
    uploadDocs: 'Upload Documents',
    reviewConfirm: 'Review & Confirm',
    paymentSummary: 'Payment Summary',

    fullName: 'Full Name',
    email: 'Email Address',
    phone: 'Mobile Number',
    address: 'Home Address',
    barangay: 'Barangay',
    purpose: 'Purpose of Application',
    
    next: 'Next',
    back: 'Back',
    submit: 'Submit Application',
    uploading: 'Uploading...',
    submitting: 'Submitting Aplikasyon...',
    dragDrop: 'Drag and drop your files here, or click to browse',
    maxSize: 'Maximum file size: 5MB. Accepted formats: PDF, JPG, PNG',
    filesUploaded: 'files uploaded',
    reqFile: 'At least 1 file is required',
    
    // Payment Step
    amountDue: 'Amount Due',
    trackingNo: 'Tracking Number',
    paymentMethod: 'Select Payment Method',
    counterOption: 'Pay at Counter (Bayad sa Opisina)',
    counterDesc: 'Pay in person at the local Treasury or Municipal/City Hall cashier upon document pick-up.',
    onlineOption: 'Online Payment (GCash / Maya)',
    comingSoon: 'Coming Soon',

    // Success Screen
    successTitle: 'Application Submitted Successfully!',
    successSubtitle: 'Your application has been received. Please save your tracking number below to check its progress.',
    copySuccess: 'Tracking number copied!',
    copyBtn: 'Copy Tracking Number',
    backHome: 'Back to Home',
    trackBtn: 'Track This Application',

    // Tracking Page
    trackHeading: 'Track Your Application',
    trackPlaceholder: 'Enter your tracking number (e.g. LGU-YYYY-XXXXXX)',
    trackSearchBtn: 'Search',
    noRecord: 'No application found with that tracking number.',
    statusTimeline: 'Application Status Timeline',
    estRelease: 'Estimated Release Date',
    remarks: 'Officer Remarks',
    assignedDept: 'Assigned Department',

    // Statuses
    PENDING_PAYMENT: 'Pending Payment',
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    RELEASED: 'Released',

    // Dashboard
    dashboardHeading: 'Your Civic Applications',
    noApps: 'You have not submitted any applications yet.',
    viewDetails: 'View',
    downloadDoc: 'Download Document',

    // Validation Errors
    errRequired: 'This field is required',
    errEmail: 'Invalid email address',
    errPhone: 'Must start with 09 and have 11 digits',
    errFileLimit: 'File must be 5MB or less',

    // New General Keys
    requirements: 'Requirements',
    more: 'more',
    noServicesFound: 'No services found.',
    serviceNotFoundTitle: 'Service Not Found',
    serviceNotFoundDesc: 'The requested clearance or permit could not be found or is currently inactive.',
    viewFile: 'View File',
    imageLabel: 'Image',
    pdfLabel: 'PDF Document',

    // Step 3 Upload Description
    uploadDocsDesc: 'Upload clear copies of your required documents. Accepted formats: PDF, JPG, and PNG. Maximum size: 5MB per file.',

    // Service Application Wizard Details
    personalInfoDesc: 'Provide your information. Autofilled if logged in.',
    serviceFieldsDesc: 'Fill out requirements specifically for this service type.',
    complaintFields: 'Incident Details',
    complaintFieldsDesc: 'Provide clear details about the incident or complaint.',
    errInvalidFileType: 'Only PDF, JPG, and PNG are accepted',
    nextStepTitle: 'Next Step:',
    nextStepDesc: 'Proceed to the cashier at City Hall once the document is approved. Present this tracking number to pay the fee of ',
    nextStepDescSuffix: ' and collect your document.',
    nextStepComplaintDesc: 'Your complaint has been submitted for desk review. Within 1 working day, LGU staff will officially register it in the Barangay Blotter and issue a formal Hearing Summon & Schedule, which you can track here. You will be scheduled for a physical conciliation hearing at the Barangay Hall.',
    specifyPurpose: 'Specify Purpose',
    indigencyReasonLabel: 'Purpose of Indigency Request',
    specifyReason: 'Specify Reason',
    businessNameLabel: 'Business Name',
    businessAddressLabel: 'Business Address',
    businessCapitalLabel: 'Capital Investment (PHP)',
    respondentNameLabel: 'Respondent Name (if known)',
    incidentDateLabel: 'Date of Incident',
    incidentDetailsLabel: 'Description of Incident',
    incidentDetailsPlaceholder: 'Clearly describe the details of the incident...',
    reviewConfirmDesc: 'Review all details. Make sure everything is correct.',
    paymentSummaryDesc: 'Review your payment details and finalize submission.',
    onlineOptionDesc: 'Pay digitally using your GCash or Maya wallet in future portal updates.',
    optEmployment: 'Local Employment',
    optId: 'Government ID Application',
    optTravel: 'Travel / Passport',
    optBusiness: 'Business Requirement',
    optOthers: 'Others',
    optScholarship: 'Scholarship / Educational Assistance',
    optMedical: 'Medical Assistance',
    optLegal: 'Legal Aid',
    optFinancial: 'Financial Assistance / DSWD',
    optOthersReason: 'Others',

    // Barangay Clearance purpose options
    optTravelAbroad: 'Travel Abroad',
    optBankRequirement: 'Bank Requirement',
    optSchoolRequirement: 'School Requirement',
    optPoliceClearance: 'Police Clearance Requirement',

    // Community Tax Certificate (Cedula) fields
    occupationLabel: 'Occupation / Profession',
    civilStatusLabel: 'Civil Status',
    optSingle: 'Single',
    optMarried: 'Married',
    optWidowed: 'Widowed',
    optSeparated: 'Separated',

    // Certificate of Indigency fields
    optEducationalAssistance: 'Educational Assistance',
    optGovernmentBenefit: 'Government Benefit',
    monthlyIncomeLabel: 'Monthly Household Income',
    optIncomeBelow5k: 'Below \u20b15,000',
    optIncome5kTo10k: '\u20b15,000\u2013\u20b110,000',
    optIncomeAbove10k: 'Above \u20b110,000',

    // Business Permit fields
    natureOfBusinessLabel: 'Nature of Business',
    numberOfEmployeesLabel: 'Number of Employees',

    // Working Permit fields
    employerNameLabel: 'Employer / Company Name',
    typeOfWorkLabel: 'Type of Work',
    workAddressLabel: 'Work Address',

    // Complaint Filing fields
    complaintTypeLabel: 'Type of Complaint',
    optNoiseComplaint: 'Noise Complaint',
    optPropertyDispute: 'Property Dispute',
    optPhysicalAltercation: 'Physical Altercation',
    optTheftRobbery: 'Theft / Robbery',
    incidentLocationLabel: 'Incident Location',

    // Home steps
    homeStep1Title: '1. Register / Login',
    homeStep1Desc: 'Enter your email address to log in. You will receive an OTP code via email to access the portal.',
    homeStep2Title: '2. Fill out Application',
    homeStep2Desc: 'Select a document, fill out your personal details, and upload the required documents securely.',
    homeStep3Title: '3. Pay and Pick up',
    homeStep3Desc: 'Copy your tracking number and pay at the local Treasury or Municipal Hall cashier upon document pick-up.',

    // QR Verification Page
    verifyValidDoc: 'Valid / Authentic Document',
    verifyOfficialDoc: 'Confirmed Official Document',
    verifyOfficialDocDesc: 'This document has been officially issued by our Local Government Unit.',
    verifyAuthenticity: 'Authenticity & Integrity Verified',
    verifySuccessDesc: 'The digital signature and details below match the official records of the LGU.',
    verifyType: 'Type',
    verifyIssuedTo: 'Issued To',
    verifyIssueDate: 'Date Issued',
    verifyLgu: 'LGU',
    verifyTokenId: 'QR Token ID',
    verifyDownloadPdf: 'Download PDF',
    verifyInvalidDoc: 'Invalid / Revoked Document',
    verifyInvalidDocTitle: 'Invalid or Revoked Document',
    verifyInvalidDocDesc: 'This QR verification code does not match any valid or active document from the LGU.',
    verifyWarning: 'Warning',
    verifyRevokedDesc: 'This document has been REVOKED by the government. It may have been replaced or there was an issue with the submitted information. Do not accept this document for any official transactions.',
    verifyNotFoundDesc: 'The verification code was not found in the official records of the LGU. The document you hold may be fake, copied, or did not go through the official LGU process. Please contact City Hall for more information.',
    verifyWhatToDo: 'What should you do?',
    verifyWhatToDo1: 'Verify if the scanned QR code link is correct.',
    verifyWhatToDo2: 'Request the document owner to submit a new or valid document.',
    verifyWhatToDo3: 'Report to the local government office if you suspect document forgery.',
    verifyGoToCitizenPortal: 'Go to Citizen Portal',

    // Tracking Page
    trackHeadingDesc: 'Enter your unique 15-character tracking code to see real-time progress.',
    notFound: 'Not Found',
    verifyTrackingFormat: ' Please make sure the spelling and format of the tracking number are correct.',
    docType: 'Document Type',
    trackingCode: 'Tracking Code',
    applicantName: 'Applicant Name',
    submittedDate: 'Submitted Date',
    activeBadge: 'Active',
    stepCompleted: 'Step completed.',
    awaitingPrevStep: 'Awaiting previous step.',
    finalBadge: 'Final',
    readyToTrack: 'Ready to Track',
    readyToTrackDesc: 'Input your tracking number above to check current status and officer remarks.',

    // Dashboard
    signInRequired: 'Sign In Required',
    signInRequiredDesc: 'Please log in to view and track your submitted document applications.',
    dashboardSub: 'Manage and check all civic certificates and permits applied under your account.',
    newApplication: 'New Application',
    trackBtnText: 'Track',
    verifyQr: 'Verify QR',
    noAppsDesc: 'You have not submitted any documents or clearance requests to the local government yet.',

    // Login Page
    loginTitle: 'Welcome to BayanServe',
    loginSub: 'Access your civic services',
    loginIdentifierLabel: 'Email or mobile number',
    sendOtpBtn: 'Send OTP',
    sending: 'Sending...',
    enterCode: 'Enter verification code',
    sentCodeTo: 'We sent a 6-digit code to',
    verifyBtn: 'Verify',
    verifying: 'Verifying...',
    resendCodeIn: 'Resend code in ',
    resendCode: 'Resend code',
    areYouStaff: 'Are you LGU staff? ',
    signInHere: 'Sign in here →',
    pillDesc1: 'Request documents online',
    pillDesc2: 'Track your applications',
    pillDesc3: 'Get real-time updates',
    tagline: 'Your LGU, at your fingertips.',
    loginPlaceholder: 'you@email.com or +639xxxxxxxxx',
    footerDesc: 'BayanServe is the official civic services portal of the Municipality of Peñablanca. Apply for documents safely and conveniently online.',
    footerContact: 'Contact Us',
    welcomePrefix: 'Welcome,',

    // Admin Navigation
    adminNavApplications: 'Applications',
    adminNavPayments: 'Payments',
    adminNavAnalytics: 'Analytics',
    adminNavSettings: 'Settings',
    adminPortalSub: 'BayanServe Admin Portal',
    adminBranding: 'LGU',
    adminLogoutTitle: 'Logout',
    adminDashboard: 'Dashboard',

    // Admin Settings Page
    adminSettingsTitle: 'Portal Settings (LGU Settings)',
    adminSettingsSub: 'Configure the white-label profile, services, staff management, and email templates',
    adminRefresh: 'Refresh',
    adminTabProfile: 'LGU Profile',
    adminTabServices: 'Services & Fees',
    adminTabStaff: 'Staff Management',
    adminTabEmails: 'Email Templates',
    adminProfileTitle: 'LGU Profile & Branding',
    adminProfileSub: 'Configure the official branding and identity of your municipality or city',
    adminLogoUploadLabel: 'Official LGU Seal (Logo Upload)',
    adminLogoUploadDesc: 'Use PNG, JPG, or SVG formats. Max size: 2MB. This logo will display on the citizen and admin portals.',
    adminUploadSealBtn: 'Upload Seal',
    adminLguNameLabel: 'LGU Name',
    adminMunicipalityLabel: 'Municipality or City',
    adminProvinceLabel: 'Province',
    adminThemeColorLabel: 'Primary Theme Color',
    adminContactEmailLabel: 'Official Email (Contact Email)',
    adminContactPhoneLabel: 'Telephone / Mobile Number',
    adminSaveProfileBtn: 'Save Profile',
    adminSaving: 'Saving...',

    // Admin Settings Services Tab
    adminServicesTitle: 'Manage Services & Official Fees',
    adminServicesSub: 'Adjust base fee, processing days, and active status per document type',
    adminColServiceName: 'Document Type (Service Name)',
    adminColCategory: 'Category',
    adminColProcessingDays: 'Processing Days',
    adminColStatus: 'Status',
    adminColBaseFee: 'Base Fee',
    adminColAction: 'Action',
    adminActive: 'Active',
    adminInactive: 'Inactive',
    adminDays: 'days',
    adminEditBtn: 'Edit',
    adminSaveBtn: 'Save',
    adminCancelBtn: 'Cancel',

    // Admin Settings Staff Tab
    adminStaffTitle: 'Officials & Staff Management',
    adminStaffSub: 'Invite new members to the portal or deactivate existing access',
    adminActiveStaffList: 'Active Staff Members',
    adminDeactivateBtn: 'Deactivate',
    adminActivateBtn: 'Activate',
    adminInviteStaffTitle: 'Invite Staff Member',
    adminInviteSuccessMsg: 'Successfully invited! Sent welcome email with temporary password.',
    adminStaffNameLabel: 'Full Name',
    adminStaffEmailLabel: 'Email Address',
    adminStaffPhoneLabel: 'Phone Number',
    adminStaffRoleLabel: 'Role',
    adminInviteBtn: 'Send Invitation',
    adminInviting: 'Sending...',

    // Admin Settings Emails Tab
    adminEmailsTitle: 'Email & Notification Customization',
    adminEmailsSub: 'Modify the subject and body of email sent to citizens upon document release',
    adminTemplateSuccessMsg: 'Template Saved Successfully',
    adminNotificationTypeLabel: 'Notification Type',
    adminEmailSubjectLabel: 'Email Subject',
    adminEmailBodyLabel: 'Email Body (HTML supported)',
    adminSupportedPlaceholders: 'Supported Placeholders:',
    adminPlaceholdersDesc: 'The following placeholders are supported and will be automatically replaced with the actual application details:',
    adminSaveTemplateBtn: 'Save Template',
    adminTemplateSaving: 'Saving...',

    // Admin Applications Page
    adminAppsTitle: 'Civic Applications',
    adminAppsSub: 'Inspect and process citizen requests',
    adminSearchPlaceholder: 'Search by tracking no. or name...',
    adminAllStatus: 'All Statuses',
    adminAllServices: 'All Services',
    adminDateRangeLabel: 'Date Range Filter:',
    adminNoOfficer: 'No Officer Assigned',
    adminOpenBtn: 'Open',
    adminAssignOfficerSelect: 'Assign to Officer...',
    adminAssignBtn: 'Assign',
    adminMarkReviewedBtn: 'Mark Reviewed',
    adminSelectedApps: 'applications selected',
    adminNoAppsTitle: 'No applications found',
    adminNoAppsDesc: 'No records match your current filters. Try resetting or adjusting them.',

    // Shared Database Error
    adminDbErrorTitle: 'Database Error',
    adminDbErrorDesc: 'Database connection failure. Please contact your IT administrator.',
    adminRetryBtn: 'Retry Connection',
    adminLoadingData: 'Fetching data from server...',

    // Table Column Headers
    adminColTrackingNumber: 'Tracking Number',
    adminColCitizen: 'Citizen / Applicant',
    adminColServiceType: 'Service Type',
    adminColSubmittedDate: 'Submitted Date',
    adminColAssignedOfficer: 'Assigned Officer',
    adminColActions: 'Actions',

    // Admin Payments Page
    adminPaymentsTitle: 'Payments Center',
    adminPaymentsSub: 'Suriin, salain, at i-export ang mga opisyal na cash receipt at bayarin',
    adminExportCsvBtn: 'Export to CSV',
    adminTotalRevenue: 'Total Revenue',
    adminCashOnly: 'BayanServe Counter Desk (Cash only)',
    adminActiveState: '100% Active',
    adminPaidCount: 'Paid Count',
    adminFilteredCount: 'Including current filters below',
    adminMethod: 'Payment Method',
    adminOfficePayment: 'Pay at Counter',
    adminOnlinePayments: 'Online Payments',
    adminPaymentsSearchPlaceholder: 'Search OR, tracking no. or citizen...',
    adminPaymentDateRangeLabel: 'Payment Date Range:',
    adminTo: 'to',
    adminColOrNumber: 'OR Number (Official Receipt)',
    adminColDatePaid: 'Date Paid',
    adminColRecordedBy: 'Recorded By',
    adminColAmount: 'Amount (PHP)',
    adminNoPaymentsTitle: 'No payments found',
    adminNoPaymentsDesc: 'No transactions recorded under the current search and date range.',
    adminLoadingPayments: 'Fetching payments data...',

    // Admin Analytics Page
    adminAnalyticsTitle: 'Service Analytics Dashboard',
    adminAnalyticsSub: 'Track applications flow, financial collections, and service performance',
    adminKpiSubmitted: 'Submitted Applications',
    adminKpiSubmittedDesc: 'Monthly total',
    adminKpiApproved: 'Approved',
    adminKpiApprovedDesc: 'Released certificates/permits',
    adminKpiPending: 'Pending Review',
    adminKpiPendingDesc: 'Awaiting officer action',
    adminKpiRevenue: 'Total Revenue',
    adminKpiRevenueDesc: 'Total official collections',
    adminLoadingAnalytics: 'Preparing visual analytics...',
    adminNoAnalyticsTitle: 'No analytics data yet',
    adminNoAnalyticsDesc: 'No applications or records to generate metrics. Try submitting applications.',
    adminChartServicesTitle: 'Applications count per service',
    adminChartTrendTitle: 'Applications trend last 30 days',
    adminPerfTitle: 'Processing Performance (Average Processing Time)',
    adminPerfSub: 'Time elapsed from application submission to approval',
    adminColTotalProcessed: 'Total Processed',
    adminColAvgDays: 'Avg Days',
    adminPerfEmpty: 'No completed applications data available.',
    adminBrgyTitle: 'Submissions Breakdown (Collections per Barangay)',
    adminBrgySub: 'Barangays with the highest submitted applications',
    adminColSubmissions: 'Total Submissions',
    adminBrgyEmpty: 'No barangay data available.',
    adminDaysUnit: 'days',
    adminAppsUnit: 'applications',
    adminTransactionsUnit: 'transactions',

    // Admin Application Details Page
    adminBackToList: 'Back to list',
    adminAppPrefix: 'Application:',
    adminAppService: 'Service',
    adminAppSubmittedOn: 'Submitted on',
    adminAppIssueBtn: 'Issue E-Document',
    adminAppCitizenInfo: 'Citizen / Applicant Info',
    adminAppColName: 'Full Name',
    adminAppColNationalId: 'PhilSys National ID',
    adminAppColEmail: 'Email Address',
    adminAppColPhone: 'Mobile Number',
    adminAppColBarangay: 'Barangay',
    adminAppColAddress: 'Home Address',
    adminAppDocsChecklist: 'Documents Checklist',
    adminAppNoDocs: 'No documents uploaded for this application.',
    adminAppDownloadOpen: 'Download / Open',
    adminAppActivityTimeline: 'Activity Logs Timeline',
    adminAppRemarks: 'Remarks',
    adminAppProcessAction: 'Process Action',
    adminAppChangeStatus: 'Change Status:',
    adminAppRemarksRequired: 'Remarks / Notes (Required):',
    adminAppUpdateStatusBtn: 'Update Status',
    adminAppUpdateStatusLoading: 'Updating...',
    adminAppCashCounter: 'CASH Counter Only',
    adminAppAmountDue: 'Fee Due',
    adminAppRequiredFee: 'Required Fee',
    adminAppPaymentMethod: 'Payment Method',
    adminAppPaymentStatus: 'Payment Status',
    adminAppOrNumberLabel: 'OR Number',
    adminAppDatePaidLabel: 'Date Paid',
    adminAppRecordReceiptTitle: 'Cash counter receipt:',
    adminAppRecordPaymentBtn: 'Record Payment',
    adminAppRecordPaymentLoading: 'Recording...',
    adminAppGcashMayaDesc: 'Online payment via GCash/Maya — coming soon',
    adminAppIssuedEdoc: 'Issued E-Document',
    adminAppIssuedEdocDesc: 'This document has been fully issued by the LGU Office.',
    adminAppQrTokenKey: 'QR Token Key',
    adminAppIssuedDate: 'Date Issued',
    adminAppDownloadPdfBtn: 'Download Issued Document (PDF)',
    adminAppConfirmIssue: 'Are you sure you want to issue this document?',
    adminAppIssueSuccess: 'Document successfully issued and email notification sent to citizen!',
    adminAppRemarksRequiredAlert: 'Remarks are required to update application status.',
    adminAppOrRequiredAlert: 'OR Number is required.',
    adminAppAmountAlert: 'Amount must be greater than zero.',
    adminAppPaymentRecordedAlert: 'Payment recorded successfully!',
    adminAppStatusHistoryText: 'marked status from {old} to {new}',
  },
  fil: {
    // Navigation
    home: 'Home',
    track: 'Subaybayan ang Application',
    dashboard: 'Aking mga Application',
    login: 'Mag-login bilang Mamamayan',
    logout: 'Mag-logout',
    adminLogin: 'Staff Login',
    languageLabel: 'English',

    // Hero
    heroTitle: 'Mag-apply ng dokumento online. Kahit saan, kahit kailan.',
    heroSubtitle: 'Pinapadali ng BayanServe ang pag-apply ng mga clearance, permit, at sertipiko mula sa Pamahalaang Bayan ng Peñablanca.',
    getStarted: 'Magsimula Rito',
    trackSub: 'Suriin ang katayuan ng iyong aplikasyon nang mabilis',

    // Home services
    servicesTitle: 'Mga Serbisyo Namin',
    servicesSubtitle: 'Pumili ng serbisyo sa ibaba upang simulan ang iyong online application.',
    baseFee: 'Pangunahing Bayad',
    processingTime: 'Oras ng Pagproseso',
    applyNow: 'Mag-apply Ngayon',
    free: 'Libre',
    days: 'araw',
    day: 'araw',

    // Application Wizard
    personalInfo: 'Personal na Impormasyon',
    serviceFields: 'Mga Detalye ng Application',
    uploadDocs: 'Mag-upload ng Dokumento',
    reviewConfirm: 'Suriin at Kumpirmahin',
    paymentSummary: 'Buod ng Bayad',

    fullName: 'Buong Pangalan',
    email: 'Email Address',
    phone: 'Numero ng Telepono',
    address: 'Tirahan',
    barangay: 'Barangay',
    purpose: 'Layunin ng Application',

    next: 'Susunod',
    back: 'Bumalik',
    submit: 'Isumite ang Aplikasyon',
    uploading: 'Nag-a-upload...',
    submitting: 'Inisuusumite...',
    dragDrop: 'I-drag at i-drop ang iyong mga file dito, o i-click upang mag-browse',
    maxSize: 'Pinakamataas na laki ng file: 5MB. Tinatanggap: PDF, JPG, PNG',
    filesUploaded: 'mga file na na-upload',
    reqFile: 'Kinakailangan ang hindi bababa sa 1 file',

    // Payment Step
    amountDue: 'Kabuuang Halaga',
    trackingNo: 'Tracking Number',
    paymentMethod: 'Pumili ng Paraan ng Pagbabayad',
    counterOption: 'Bayad sa Opisina (Pay at Counter)',
    counterDesc: 'Magbayad nang personal sa cashier ng inyong Municipal/City Hall kapag kinuha ang dokumento.',
    onlineOption: 'Online Payment (GCash / Maya)',
    comingSoon: 'Malapit nang dumating',

    // Success Screen
    successTitle: 'Matagumpay na Naisumite ang Aplikasyon!',
    successSubtitle: 'Natanggap na ang iyong aplikasyon. Paki-save ang iyong tracking number sa ibaba upang subaybayan ang progreso nito.',
    copySuccess: 'Nakitopya na ang tracking number!',
    copyBtn: 'Kopyahin ang Tracking Number',
    backHome: 'Bumalik sa Home',
    trackBtn: 'Subaybayan ang Application na Ito',

    // Tracking Page
    trackHeading: 'Subaybayan ang Application',
    trackPlaceholder: 'Ilagay ang tracking number (hal. LGU-YYYY-XXXXXX)',
    trackSearchBtn: 'Hanapin',
    noRecord: 'Walang nahanap na aplikasyon para sa tracking number na iyon.',
    statusTimeline: 'Timeline ng Katayuan ng Aplikasyon',
    estRelease: 'Inaasahang Araw ng Pagpapalabas',
    remarks: 'Mensahe/Remarks ng Opisyal',
    assignedDept: 'Nakatalagang Departamento',

    // Statuses
    PENDING_PAYMENT: 'Naghihintay ng Bayad',
    SUBMITTED: 'Naisumite',
    UNDER_REVIEW: 'Sinusuri',
    APPROVED: 'Inaprubahan',
    REJECTED: 'Tinanggihan',
    RELEASED: 'Naipalabas na',

    // Dashboard
    dashboardHeading: 'Aking mga Civic Application',
    noApps: 'Wala ka pang naisusumiteng mga aplikasyon.',
    viewDetails: 'Tingnan',
    downloadDoc: 'I-download ang Dokumento',

    // Validation Errors
    errRequired: 'Kinakailangan ang field na ito',
    errEmail: 'Hindi wastong email address',
    errPhone: 'Dapat ay nagsisimula sa 09 at may 11 digits',
    errFileLimit: 'Ang file ay dapat 5MB o mas mababa',

    // New General Keys
    requirements: 'Mga Kailangan',
    more: 'iba pa',
    noServicesFound: 'Hindi mahanap ang mga serbisyo.',
    serviceNotFoundTitle: 'Hindi Nahanap ang Serbisyo',
    serviceNotFoundDesc: 'Hindi mahanap o kasalukuyang hindi aktibo ang hiniling mong clearance o permit.',
    viewFile: 'Tingnan ang File',
    imageLabel: 'Larawan',
    pdfLabel: 'Dokumentong PDF',

    // Step 3 Upload Description
    uploadDocsDesc: 'I-upload ang mga kopya ng inyong mga kinakailangang dokumento. Tinatanggap ang PDF, JPG, at PNG. Maximum: 5MB bawat isa.',

    // Service Application Wizard Details
    personalInfoDesc: 'Ibigay ang iyong impormasyon. Auto-filled kung naka-login.',
    serviceFieldsDesc: 'Sagutan ang mga karagdagang tanong para sa serbisyong ito.',
    complaintFields: 'Detalye ng Insidente',
    complaintFieldsDesc: 'Ibigay ang malinaw na detalye ng inyong reklamo o insidente.',
    errInvalidFileType: 'PDF, JPG, o PNG lamang ang tinatanggap',
    nextStepTitle: 'Susunod na Hakbang:',
    nextStepDesc: 'Pumunta sa cashier sa City Hall kapag na-aprubahan na ang dokumento. Ipakita ang tracking number na ito upang magbayad ng ',
    nextStepDescSuffix: ' at makuha ang iyong papel.',
    nextStepComplaintDesc: 'Ang iyong reklamo ay naisumite na para sa desk review. Sa loob ng 1 araw ng pagtatrabaho, opisyal itong itatala ng staff ng LGU sa Barangay Blotter at maglalabas ng pormal na Hearing Summon & Schedule na maaari mong i-track dito. Ikaw ay maiiskedyul para sa pisikal na conciliation hearing sa Barangay Hall.',
    specifyPurpose: 'Iba pang Layunin',
    indigencyReasonLabel: 'Layunin ng Pag-apply ng Indigency',
    specifyReason: 'Iba pang Dahilan',
    businessNameLabel: 'Pangalan ng Negosyo',
    businessAddressLabel: 'Address ng Negosyo',
    businessCapitalLabel: 'Puhunan ng Negosyo (PHP)',
    respondentNameLabel: 'Pangalan ng Inirereklamo (kung alam)',
    incidentDateLabel: 'Petsa ng Insidente',
    incidentDetailsLabel: 'Salaysay ng Insidente / Reklamo',
    incidentDetailsPlaceholder: 'Ikuwento nang malinaw ang nangyaring insidente...',
    reviewConfirmDesc: 'Suriin ang lahat ng impormasyon bago isumite ang application.',
    paymentSummaryDesc: 'Suriin ang kabuuang bayad at tapusin ang aplikasyon.',
    onlineOptionDesc: 'Magbayad nang digital gamit ang iyong GCash o Maya wallet sa susunod na mga updates ng portal.',
    optEmployment: 'Trabaho sa Pilipinas',
    optId: 'Pag-apply ng ID',
    optTravel: 'Paglalakbay / Passport',
    optBusiness: 'Kailangan sa Negosyo',
    optOthers: 'Iba pang Layunin',
    optScholarship: 'Edukasyon / Scholarship',
    optMedical: 'Tulong Medikal',
    optLegal: 'Tulong Legal',
    optFinancial: 'Tulong Pinansyal / DSWD',
    optOthersReason: 'Iba pang Dahilan',

    // Barangay Clearance purpose options
    optTravelAbroad: 'Biyahe sa Ibang Bansa',
    optBankRequirement: 'Kailangan sa Bangko',
    optSchoolRequirement: 'Kailangan sa Paaralan',
    optPoliceClearance: 'Kailangan para sa Police Clearance',

    // Community Tax Certificate (Cedula) fields
    occupationLabel: 'Trabaho / Propesyon',
    civilStatusLabel: 'Katayuang Sibil',
    optSingle: 'Dalaga / Binata',
    optMarried: 'May Asawa',
    optWidowed: 'Balo',
    optSeparated: 'Hiwalay',

    // Certificate of Indigency fields
    optEducationalAssistance: 'Tulong sa Edukasyon',
    optGovernmentBenefit: 'Benepisyo mula sa Gobyerno',
    monthlyIncomeLabel: 'Buwanang Kita ng Pamilya',
    optIncomeBelow5k: 'Mababa sa \u20b15,000',
    optIncome5kTo10k: '\u20b15,000\u2013\u20b110,000',
    optIncomeAbove10k: 'Higit sa \u20b110,000',

    // Business Permit fields
    natureOfBusinessLabel: 'Uri ng Negosyo',
    numberOfEmployeesLabel: 'Bilang ng mga Empleyado',

    // Working Permit fields
    employerNameLabel: 'Pangalan ng Employer / Kumpanya',
    typeOfWorkLabel: 'Uri ng Trabaho',
    workAddressLabel: 'Address ng Trabaho',

    // Complaint Filing fields
    complaintTypeLabel: 'Uri ng Reklamo',
    optNoiseComplaint: 'Reklamo sa Ingay',
    optPropertyDispute: 'Alitan sa Ari-arian',
    optPhysicalAltercation: 'Pisikal na Sagupaan',
    optTheftRobbery: 'Pagnanakaw / Nakawan',
    incidentLocationLabel: 'Lugar ng Insidente',

    // Home steps
    homeStep1Title: '1. Mag-register / Login',
    homeStep1Desc: 'Gumamit ng email address upang mag-login. Makakatanggap ng OTP sa email upang makapasok sa portal.',
    homeStep2Title: '2. Punan ang Aplikasyon',
    homeStep2Desc: 'Piliin ang dokumento, punan ang personal na impormasyon, at i-upload ang mga kailangang dokumento nang ligtas gamit ang portal.',
    homeStep3Title: '3. Magbayad at Kumuha',
    homeStep3Desc: 'Kopyahin ang tracking number, at magbayad sa cashier ng lokal na tanggapan (LGU) kapag kukuha na ng aprubadong dokumento.',

    // QR Verification Page
    verifyValidDoc: 'Valid / Wastong Dokumento',
    verifyOfficialDoc: 'Kumpirmadong Opisyal na Dokumento',
    verifyOfficialDocDesc: 'Ang dokumentong ito ay opisyal na inilabas ng ating Pamahalaang Lokal.',
    verifyAuthenticity: 'Integridad at Katotohanan (Authenticity Verified)',
    verifySuccessDesc: 'Ang digital na lagda at impormasyon sa ibaba ay tumutugma sa mga opisyal na rekord ng LGU.',
    verifyType: 'Uri',
    verifyIssuedTo: 'Inilabas kay',
    verifyIssueDate: 'Araw ng Paglabas',
    verifyLgu: 'LGU',
    verifyTokenId: 'QR Token ID',
    verifyDownloadPdf: 'I-download ang PDF',
    verifyInvalidDoc: 'Invalid / Binasurang Dokumento',
    verifyInvalidDocTitle: 'Hindi Wasto o Binasurang Dokumento',
    verifyInvalidDocDesc: 'Ang QR verification code na ito ay hindi tumutugma sa anumang wasto o aktibong dokumento ng LGU.',
    verifyWarning: 'Babala',
    verifyRevokedDesc: 'Ang dokumentong ito ay BINALE-WALA o BINASURA (REVOKED) na ng pamahalaan. Maaaring ito ay napalitan na o may nakitang isyu sa mga isinumiteng impormasyon. Huwag tanggapin ang dokumentong ito para sa anumang opisyal na transaksyon.',
    verifyNotFoundDesc: 'Hindi nahanap ang verification code sa mga opisyal na rekord ng LGU. Ang dokumentong hawak mo ay maaaring peke, ginaya, o hindi dumaan sa opisyal na proseso ng LGU. Mangyaring makipag-ugnayan sa City Hall para sa karagdagang impormasyon.',
    verifyWhatToDo: 'Ano ang dapat gawin?',
    verifyWhatToDo1: 'I-verify muli kung tama ang QR Code link na na-scan.',
    verifyWhatToDo2: 'Hilingin sa may-ari ng dokumento na magsumite ng bago o wastong dokumento.',
    verifyWhatToDo3: 'Mag-ulat sa tanggapan ng inyong lokal na pamahalaan kung may suspetsa ng pamemeke ng dokumento.',
    verifyGoToCitizenPortal: 'Pumunta sa Portal ng Mamamayan (Citizen Portal)',

    // Tracking Page
    trackHeadingDesc: 'Ilagay ang iyong 15-character tracking code upang makita ang katayuan nito.',
    notFound: 'Hindi Nahanap',
    verifyTrackingFormat: ' Paki-siguraduhing tama ang spelling at format ng tracking number.',
    docType: 'Uri ng Dokumento',
    trackingCode: 'Tracking Code',
    applicantName: 'Pangalan ng Nag-apply',
    submittedDate: 'Araw ng Pagsumite',
    activeBadge: 'Aktibo',
    stepCompleted: 'Nakumpleto ang hakbang.',
    awaitingPrevStep: 'Inaantay ang nakaraang hakbang.',
    finalBadge: 'Huli',
    readyToTrack: 'Handang Mag-track',
    readyToTrackDesc: 'Ilagay ang iyong tracking number sa itaas upang suriin ang katayuan at mga mensahe ng opisyal.',

    // Dashboard
    signInRequired: 'Kailangang Mag-login',
    signInRequiredDesc: 'Mangyaring mag-login muna upang makita at masubaybayan ang iyong mga isinumiteng aplikasyon.',
    dashboardSub: 'Pamahalaan at suriin ang lahat ng mga sertipiko at permit na in-apply sa ilalim ng iyong account.',
    newApplication: 'Bagong Application',
    trackBtnText: 'Subaybayan',
    verifyQr: 'I-verify QR',
    noAppsDesc: 'Wala ka pang naisusumiteng request para sa clearance o permit sa lokal na pamahalaan.',

    // Login Page
    loginTitle: 'Maligayang pagdating sa BayanServe',
    loginSub: 'I-access ang inyong mga serbisyong sibil',
    loginIdentifierLabel: 'Email o numero ng mobile',
    sendOtpBtn: 'Ipadala ang OTP',
    sending: 'Ipinapadala...',
    enterCode: 'Ilagay ang verification code',
    sentCodeTo: 'Nagpadala kami ng 6-digit code sa',
    verifyBtn: 'I-verify',
    verifying: 'Sinesertipikahan...',
    resendCodeIn: 'Ipadala muli ang code sa loob ng ',
    resendCode: 'Ipadala muli ang code',
    areYouStaff: 'Ikaw ba ay kawani ng LGU? ',
    signInHere: 'Mag-sign in dito →',
    pillDesc1: 'Mag-apply ng dokumento online',
    pillDesc2: 'Subaybayan ang iyong mga aplikasyon',
    pillDesc3: 'Makatanggap ng real-time updates',
    tagline: 'Ang inyong LGU, nasa inyong mga kamay.',
    loginPlaceholder: 'you@email.com o +639xxxxxxxxx',
    footerDesc: 'Ang BayanServe ay ang opisyal na portal ng Pamahalaang Bayan ng Peñablanca para sa mga serbisyong sibiko.',
    footerContact: 'Makipag-ugnayan',
    welcomePrefix: 'Mabuhay,',

    // Admin Navigation
    adminNavApplications: 'Mga Aplikasyon',
    adminNavPayments: 'Mga Bayarin',
    adminNavAnalytics: 'Pagsusuri',
    adminNavSettings: 'Mga Setting',
    adminPortalSub: 'BayanServe Admin Portal',
    adminBranding: 'LGU',
    adminLogoutTitle: 'Mag-logout',
    adminDashboard: 'Dashboard',

    // Admin Settings Page
    adminSettingsTitle: 'Mga Setting ng Portal (LGU Settings)',
    adminSettingsSub: 'Ayusin ang white-label profile, mga serbisyo, pamamahala ng staff, at mga email templates',
    adminRefresh: 'I-refresh',
    adminTabProfile: 'Profile ng LGU',
    adminTabServices: 'Mga Serbisyo at Bayarin',
    adminTabStaff: 'Pamamahala ng Staff',
    adminTabEmails: 'Mga Template ng Email',
    adminProfileTitle: 'Profile at Pagkakakilanlan ng LGU',
    adminProfileSub: 'Ibahagi ang opisyal na impormasyon at tatak ng inyong munisipalidad o lungsod',
    adminLogoUploadLabel: 'Opisyal na LGU Seal (Logo Upload)',
    adminLogoUploadDesc: 'Gamitin lamang ang PNG, JPG, o SVG na file format. Maximum na laki ng file ay 2MB. Awtomatikong mailalapat ang logo sa citizen at admin portals.',
    adminUploadSealBtn: 'Mag-upload ng Seal',
    adminLguNameLabel: 'Pangalan ng LGU (LGU Name)',
    adminMunicipalityLabel: 'Munisipalidad o Lungsod',
    adminProvinceLabel: 'Probinsya (Province)',
    adminThemeColorLabel: 'Pangunahing Kulay (Primary Theme Color)',
    adminContactEmailLabel: 'Opisyal na Email (Contact Email)',
    adminContactPhoneLabel: 'Telepono / Mobile Number',
    adminSaveProfileBtn: 'I-save ang Profile',
    adminSaving: 'Nagse-save...',

    // Admin Settings Services Tab
    adminServicesTitle: 'Pamamahala ng Serbisyo at Opisyal na Bayarin',
    adminServicesSub: 'Isaayos ang base fee, processing days at kung aktibo ang mga online transactions kada dokumento',
    adminColServiceName: 'Pangalan ng Dokumento (Service Name)',
    adminColCategory: 'Kategorya (Category)',
    adminColProcessingDays: 'Oras ng Pagproseso (Days)',
    adminColStatus: 'Katayuan (Status)',
    adminColBaseFee: 'Pangunahing Bayad (Base Fee)',
    adminColAction: 'Aksyon (Action)',
    adminActive: 'Aktibo',
    adminInactive: 'Hindi Aktibo',
    adminDays: 'araw',
    adminEditBtn: 'I-edit',
    adminSaveBtn: 'Save',
    adminCancelBtn: 'Cancel',

    // Admin Settings Staff Tab
    adminStaffTitle: 'Mga Opisyal at Pamamahala ng Staff',
    adminStaffSub: 'Mag-imbita ng bagong miyembro sa portal o i-deactivate ang mayroon nang access',
    adminActiveStaffList: 'Mga Aktibong Miyembro ng Staff',
    adminDeactivateBtn: 'Deactivate',
    adminActivateBtn: 'Aktibahin',
    adminInviteStaffTitle: 'Imbitasyon sa Staff (Invite Staff)',
    adminInviteSuccessMsg: 'Naimbitahan nang matagumpay! Nagpadala ng welcome email kasama ang pansamantalang password sa inimbita.',
    adminStaffNameLabel: 'Buong Pangalan (Full Name)',
    adminStaffEmailLabel: 'Email Address',
    adminStaffPhoneLabel: 'Telepono (Phone)',
    adminStaffRoleLabel: 'Tungkulin (Role badge)',
    adminInviteBtn: 'Ipadala ang Imbitasyon',
    adminInviting: 'Kasalukuyang nagpapadala...',

    // Admin Settings Emails Tab
    adminEmailsTitle: 'Kustomisasyon ng Email at Abiso',
    adminEmailsSub: 'Baguhin ang subject at katawan ng email na ipinapadala sa mga mamamayan sa paglabas ng mga dokumento',
    adminTemplateSuccessMsg: 'Matagumpay na Nai-save ang Template',
    adminNotificationTypeLabel: 'Uri ng Abiso (Notification Type)',
    adminEmailSubjectLabel: 'Subject ng Email',
    adminEmailBodyLabel: 'Katawan ng Email (HTML supported)',
    adminSupportedPlaceholders: 'Mga Plaseholder na suportado:',
    adminPlaceholdersDesc: 'Ang mga sumusunod na plaseholder ay suportado at awtomatikong papalitan ng mga detalye ng aplikasyon:',
    adminSaveTemplateBtn: 'I-save ang Template',
    adminTemplateSaving: 'Kasalukuyang isine-save...',

    // Admin Applications Page
    adminAppsTitle: 'Mga Aplikasyon (Civic Applications)',
    adminAppsSub: 'Siyasatin at iproseso ang mga kahilingan ng mamamayan',
    adminSearchPlaceholder: 'Hanapin ang tracking no. o pangalan...',
    adminAllStatus: 'Lahat ng Katayuan (All Status)',
    adminAllServices: 'Lahat ng Serbisyo (All Services)',
    adminDateRangeLabel: 'Sakop na Petsa (Date Range Filter):',
    adminNoOfficer: 'Walang Officer',
    adminOpenBtn: 'Buksan',
    adminAssignOfficerSelect: 'Italaga sa Officer (Assign to...)',
    adminAssignBtn: 'Italaga (Assign)',
    adminMarkReviewedBtn: 'Suriin (Mark Reviewed)',
    adminSelectedApps: 'aplikasyon ang napili (selected applications)',
    adminNoAppsTitle: 'Walang nahanap na aplikasyon',
    adminNoAppsDesc: 'Walang tumugmang datos sa iyong ginawang pagsala. Magsimula ng bago o suriin ang iyong mga filter.',

    // Shared Database Error
    adminDbErrorTitle: 'Error sa Database',
    adminDbErrorDesc: 'Hindi ma-access ang database. Makipag-ugnayan sa inyong IT administrator.',
    adminRetryBtn: 'Subukan Muli (Retry Connection)',
    adminLoadingData: 'Kinukuha ang mga datos mula sa server...',

    // Table Column Headers
    adminColTrackingNumber: 'Tracking Number',
    adminColCitizen: 'Citizen / Applicant',
    adminColServiceType: 'Service Type',
    adminColSubmittedDate: 'Submitted Date',
    adminColAssignedOfficer: 'Assigned Officer',
    adminColActions: 'Actions',

    // Admin Payments Page
    adminPaymentsTitle: 'Koleksyon at Mga Bayarin (Payments Center)',
    adminPaymentsSub: 'Suriin, salain, at i-export ang mga opisyal na cash receipt at bayarin',
    adminExportCsvBtn: 'I-export sa CSV',
    adminTotalRevenue: 'Kabuuang Koleksyon (Total Revenue)',
    adminCashOnly: 'BayanServe Counter Desk (Cash only)',
    adminActiveState: '100% Aktibo',
    adminPaidCount: 'Bayad na Aplikasyon (Paid Count)',
    adminFilteredCount: 'Kasama ang filter na inilapat sa ibaba',
    adminMethod: 'Paraan ng Bayad (Method)',
    adminOfficePayment: 'Kabayaran sa Opisina',
    adminOnlinePayments: 'Online Payments',
    adminPaymentsSearchPlaceholder: 'Hanapin ang OR, tracking no. o mamamayan...',
    adminPaymentDateRangeLabel: 'Sakop na Petsa (Payment Date Range):',
    adminTo: 'hanggang',
    adminColOrNumber: 'OR Number (Official Receipt)',
    adminColDatePaid: 'Date Paid',
    adminColRecordedBy: 'Recorded By',
    adminColAmount: 'Amount (PHP)',
    adminNoPaymentsTitle: 'Walang nahanap na bayarin',
    adminNoPaymentsDesc: 'Walang naitalang transaksyon o kabayaran batay sa kasalukuyang sakop ng petsa at paghahanap.',
    adminLoadingPayments: 'Kinukuha ang mga datos ng bayarin...',

    // Admin Analytics Page
    adminAnalyticsTitle: 'Dashboard ng Analytics ng Serbisyo',
    adminAnalyticsSub: 'Subaybayan ang takbo ng mga aplikasyon, pananalapi, at pagganap ng serbisyo',
    adminKpiSubmitted: 'Mga Aplikasyon (Submitted)',
    adminKpiSubmittedDesc: 'Buwanang kabuuan',
    adminKpiApproved: 'Inaprubahan (Approved)',
    adminKpiApprovedDesc: 'Nailabas na mga permit/clearance',
    adminKpiPending: 'Kasalukuyang Sinusuri (Pending)',
    adminKpiPendingDesc: 'Nangangailangan ng aksyon',
    adminKpiRevenue: 'Koleksyon (Total Revenue)',
    adminKpiRevenueDesc: 'Kabuuang bayad na natanggap',
    adminLoadingAnalytics: 'Kasalukuyang inihahanda ang visual analytics...',
    adminNoAnalyticsTitle: 'Wala pang sapat na datos',
    adminNoAnalyticsDesc: 'Wala pang datos. Magsimula ng tumatanggap ng mga aplikasyon.',
    adminChartServicesTitle: 'Mga Aplikasyon Kada Serbisyo',
    adminChartTrendTitle: 'Dami ng Aplikasyon sa Nakalipas na 30 Araw',
    adminPerfTitle: 'Karaniwang Oras ng Pagproseso (Processing Performance)',
    adminPerfSub: 'Bilis ng pag-apruba mula sa petsa ng pagkaka-submit',
    adminColTotalProcessed: 'Bilang (Total Processed)',
    adminColAvgDays: 'Avg Days',
    adminPerfEmpty: 'Wala pang sapat na datos ng mga natapos na aplikasyon.',
    adminBrgyTitle: 'Koleksyon Kada Barangay (Submission Breakdown)',
    adminBrgySub: 'Mga barangay na may pinakamaraming isinumiteng aplikasyon',
    adminColSubmissions: 'Kabuuang Aplikasyon (Submissions)',
    adminBrgyEmpty: 'Wala pang naitalang barangay sa mga aplikasyon.',
    adminDaysUnit: 'araw (days)',
    adminAppsUnit: 'aplikasyon',
    adminTransactionsUnit: 'na transaksyon',

    // Admin Application Details Page
    adminBackToList: 'Bumalik sa listahan (Back to list)',
    adminAppPrefix: 'Aplikasyon:',
    adminAppService: 'Serbisyo',
    adminAppSubmittedOn: 'Naisumite noong',
    adminAppIssueBtn: 'Ilabas ang Dokumento (Issue E-Document)',
    adminAppCitizenInfo: 'Mamamayan / Applicant Info',
    adminAppColName: 'Buong Pangalan',
    adminAppColNationalId: 'PhilSys National ID',
    adminAppColEmail: 'Email Address',
    adminAppColPhone: 'Mobile Number',
    adminAppColBarangay: 'Barangay',
    adminAppColAddress: 'Tirahan',
    adminAppDocsChecklist: 'Mga In-upload na Dokumento (Documents Checklist)',
    adminAppNoDocs: 'Walang dokumentong in-upload para sa aplikasyong ito.',
    adminAppDownloadOpen: 'I-download / Buksan',
    adminAppActivityTimeline: 'Kasaysayan ng Aplikasyon (Activity Logs Timeline)',
    adminAppRemarks: 'Remarks',
    adminAppProcessAction: 'Katayuan / Process Action',
    adminAppChangeStatus: 'Palitan ang Status:',
    adminAppRemarksRequired: 'Remarks / Mga Tala (Required):',
    adminAppUpdateStatusBtn: 'I-save ang Katayuan (Update Status)',
    adminAppUpdateStatusLoading: 'Nag-a-update...',
    adminAppCashCounter: 'Talaan ng Bayarin (CASH Counter Only)',
    adminAppAmountDue: 'Halaga (Fee Due)',
    adminAppRequiredFee: 'Kaukulang Bayad (Required Fee)',
    adminAppPaymentMethod: 'Paraan ng Bayad',
    adminAppPaymentStatus: 'Katayuan ng Bayad',
    adminAppOrNumberLabel: 'OR Number',
    adminAppDatePaidLabel: 'Petsa ng Bayad',
    adminAppRecordReceiptTitle: 'Talaan ng Resibo (Cash counter receipt):',
    adminAppRecordPaymentBtn: 'Mark as Paid (Cash Receipt)',
    adminAppRecordPaymentLoading: 'Naitatala...',
    adminAppGcashMayaDesc: 'Online payment via GCash/Maya — coming soon',
    adminAppIssuedEdoc: 'Inilabas na E-Document (Issued)',
    adminAppIssuedEdocDesc: 'Ang dokumentong ito ay ganap nang legal na inilabas ng Tanggapan ng LGU.',
    adminAppQrTokenKey: 'QR Token Key',
    adminAppIssuedDate: 'Petsa Inilabas',
    adminAppDownloadPdfBtn: 'Download Issued Document (PDF)',
    adminAppConfirmIssue: 'Sigurado ka bang nais mong ilabas ang dokumentong ito?',
    adminAppIssueSuccess: 'Matagumpay na nailabas ang dokumento at naipadala ang email sa citizen!',
    adminAppRemarksRequiredAlert: 'Kinakailangan ang remarks upang ma-update ang katayuan ng aplikasyon.',
    adminAppOrRequiredAlert: 'Kinakailangan ang OR Number.',
    adminAppAmountAlert: 'Ang halaga ay dapat mas mataas sa zero.',
    adminAppPaymentRecordedAlert: 'Matagumpay na naitala ang bayad!',
    adminAppStatusHistoryText: 'pinalitan ang status mula {old} patungong {new}',
  },
};

type Language = 'en' | 'fil';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Query Client configuration
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 60 * 1000,
      },
    },
  }));

  // Language state
  const [language, setLanguageState] = useState<Language>('fil');

  // Load language preference from local storage if available
  useEffect(() => {
    const saved = localStorage.getItem('bayanserve_lang') as Language;
    if (saved === 'en' || saved === 'fil') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('bayanserve_lang', lang);
  };

  const t = (key: string): string => {
    const dict = translations[language] as Record<string, string>;
    const fallbackDict = translations.en as Record<string, string>;
    return dict[key] || fallbackDict[key] || key;
  };

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
          {children}
        </LanguageContext.Provider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
