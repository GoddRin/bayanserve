-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CITIZEN', 'BARANGAY_CLERK', 'DEPARTMENT_OFFICER', 'TREASURER', 'ADMIN', 'MAYOR');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CLEARANCE', 'PERMIT', 'CERTIFICATE', 'COMPLAINT');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'PENDING_PAYMENT', 'APPROVED', 'REJECTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('GCASH', 'MAYA', 'CASH', 'BANK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SMS', 'EMAIL', 'IN_APP');

-- CreateTable
CREATE TABLE "lgus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#0f3d6b',
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lgus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "lgu_id" TEXT,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT,
    "national_id" TEXT,
    "address" TEXT,
    "barangay" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CITIZEN',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_types" (
    "id" TEXT NOT NULL,
    "lgu_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "base_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "processing_days" INTEGER NOT NULL DEFAULT 3,
    "required_documents" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "lgu_id" TEXT NOT NULL,
    "citizen_id" TEXT NOT NULL,
    "service_type_id" TEXT NOT NULL,
    "tracking_number" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "form_data" JSONB,
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "assigned_officer_id" TEXT,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_documents" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_history" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "old_status" "ApplicationStatus" NOT NULL,
    "new_status" "ApplicationStatus" NOT NULL,
    "remarks" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "lgu_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference_number" TEXT,
    "paymongo_payment_id" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issued_documents" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "lgu_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL,
    "file_url" TEXT,
    "issued_by" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "issued_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "lgu_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "is_sent" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "lgu_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "lgu_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lgus_name_key" ON "lgus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_lgu_id_idx" ON "users"("lgu_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_national_id_idx" ON "users"("national_id");

-- CreateIndex
CREATE INDEX "service_types_lgu_id_idx" ON "service_types"("lgu_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_types_lgu_id_name_key" ON "service_types"("lgu_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "applications_tracking_number_key" ON "applications"("tracking_number");

-- CreateIndex
CREATE INDEX "applications_tracking_number_idx" ON "applications"("tracking_number");

-- CreateIndex
CREATE INDEX "applications_lgu_id_idx" ON "applications"("lgu_id");

-- CreateIndex
CREATE INDEX "applications_citizen_id_idx" ON "applications"("citizen_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "application_documents_application_id_idx" ON "application_documents"("application_id");

-- CreateIndex
CREATE INDEX "application_history_application_id_idx" ON "application_history"("application_id");

-- CreateIndex
CREATE INDEX "application_history_changed_by_idx" ON "application_history"("changed_by");

-- CreateIndex
CREATE INDEX "payments_application_id_idx" ON "payments"("application_id");

-- CreateIndex
CREATE INDEX "payments_lgu_id_idx" ON "payments"("lgu_id");

-- CreateIndex
CREATE INDEX "payments_reference_number_idx" ON "payments"("reference_number");

-- CreateIndex
CREATE UNIQUE INDEX "issued_documents_qr_token_key" ON "issued_documents"("qr_token");

-- CreateIndex
CREATE INDEX "issued_documents_qr_token_idx" ON "issued_documents"("qr_token");

-- CreateIndex
CREATE INDEX "issued_documents_application_id_idx" ON "issued_documents"("application_id");

-- CreateIndex
CREATE INDEX "issued_documents_lgu_id_idx" ON "issued_documents"("lgu_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_lgu_id_idx" ON "notifications"("lgu_id");

-- CreateIndex
CREATE INDEX "audit_logs_lgu_id_idx" ON "audit_logs"("lgu_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_lgu_id_type_key" ON "email_templates"("lgu_id", "type");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_lgu_id_fkey" FOREIGN KEY ("lgu_id") REFERENCES "lgus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_lgu_id_fkey" FOREIGN KEY ("lgu_id") REFERENCES "lgus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_lgu_id_fkey" FOREIGN KEY ("lgu_id") REFERENCES "lgus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_citizen_id_fkey" FOREIGN KEY ("citizen_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_assigned_officer_id_fkey" FOREIGN KEY ("assigned_officer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_history" ADD CONSTRAINT "application_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_history" ADD CONSTRAINT "application_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_lgu_id_fkey" FOREIGN KEY ("lgu_id") REFERENCES "lgus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_lgu_id_fkey" FOREIGN KEY ("lgu_id") REFERENCES "lgus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_lgu_id_fkey" FOREIGN KEY ("lgu_id") REFERENCES "lgus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_lgu_id_fkey" FOREIGN KEY ("lgu_id") REFERENCES "lgus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_lgu_id_fkey" FOREIGN KEY ("lgu_id") REFERENCES "lgus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
