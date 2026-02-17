/**
 * Migration 0021: KYC Documents Expiry Extension
 * Adds document_expiry_date column and additional indexes to kyc_documents.
 */

exports.up = (pgm) => {
  pgm.sql('ALTER TABLE kyc_documents ADD COLUMN document_expiry_date DATE');
  pgm.sql('CREATE INDEX idx_kyc_documents_expiry ON kyc_documents(document_expiry_date) WHERE document_expiry_date IS NOT NULL');
  pgm.sql('CREATE INDEX idx_kyc_documents_institution_status ON kyc_documents(institution_id, status)');
  pgm.sql('CREATE INDEX idx_kyc_documents_user_status ON kyc_documents(user_id, status)');
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS idx_kyc_documents_user_status');
  pgm.sql('DROP INDEX IF EXISTS idx_kyc_documents_institution_status');
  pgm.sql('DROP INDEX IF EXISTS idx_kyc_documents_expiry');
  pgm.sql('ALTER TABLE kyc_documents DROP COLUMN IF EXISTS document_expiry_date');
};
