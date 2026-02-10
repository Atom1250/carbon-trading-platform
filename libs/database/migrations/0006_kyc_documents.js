/**
 * Migration 0006: KYC Documents Table
 * Stores KYB (institution) and KYC (user) verification documents.
 * Required documents per PROJECT_CONTEXT:
 *   Institution: certificate_of_incorporation, proof_of_address, ownership_structure
 *   User: government_id, proof_of_address, selfie
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE kyc_document_type_enum AS ENUM (
      'certificate_of_incorporation',
      'proof_of_address',
      'ownership_structure',
      'government_id',
      'selfie'
    )
  `);

  pgm.sql(`
    CREATE TYPE kyc_document_status_enum AS ENUM ('pending', 'approved', 'rejected')
  `);

  pgm.sql(`
    CREATE TABLE kyc_documents (
      id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      institution_id   UUID        REFERENCES institutions(id),
      user_id          UUID        REFERENCES users(id),
      document_type    kyc_document_type_enum   NOT NULL,
      status           kyc_document_status_enum NOT NULL DEFAULT 'pending',
      file_url         VARCHAR(500) NOT NULL,
      reviewer_id      UUID        REFERENCES users(id),
      reviewed_at      TIMESTAMPTZ,
      rejection_reason TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT kyc_documents_owner_check
        CHECK (institution_id IS NOT NULL OR user_id IS NOT NULL)
    )
  `);

  pgm.sql('CREATE INDEX idx_kyc_documents_institution_id ON kyc_documents(institution_id)');
  pgm.sql('CREATE INDEX idx_kyc_documents_user_id        ON kyc_documents(user_id)');
  pgm.sql('CREATE INDEX idx_kyc_documents_status         ON kyc_documents(status)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS kyc_documents');
  pgm.sql('DROP TYPE IF EXISTS kyc_document_status_enum');
  pgm.sql('DROP TYPE IF EXISTS kyc_document_type_enum');
};
