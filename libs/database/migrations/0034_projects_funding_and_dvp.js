/**
 * Migration 0034: Projects, dataroom, funding requests, and DvP wallet token records.
 */

exports.up = (pgm) => {
  pgm.createTable('projects', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    institution_id: {
      type: 'uuid',
      notNull: true,
      references: 'institutions(id)',
      onDelete: 'cascade',
    },
    owner_user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
    },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    public_details: { type: 'jsonb', notNull: true, default: '{}' },
    dataroom_details: { type: 'jsonb', notNull: true, default: '{}' },
    target_amount: { type: 'numeric(20,2)', notNull: true, default: 0 },
    currency: { type: 'char(3)', notNull: true, default: 'USD' },
    status: { type: 'varchar(32)', notNull: true, default: 'draft' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createTable('project_dataroom_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects(id)',
      onDelete: 'cascade',
    },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    file_url: { type: 'text', notNull: true },
    visibility: { type: 'varchar(16)', notNull: true, default: 'private' },
    created_by_user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
    },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createTable('funding_requests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects(id)',
      onDelete: 'cascade',
    },
    requester_institution_id: {
      type: 'uuid',
      notNull: true,
      references: 'institutions(id)',
      onDelete: 'restrict',
    },
    requester_user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
    },
    amount: { type: 'numeric(20,2)', notNull: true },
    currency: { type: 'char(3)', notNull: true, default: 'USD' },
    status: { type: 'varchar(24)', notNull: true, default: 'pending' },
    approved_by_user_id: { type: 'uuid', references: 'users(id)', onDelete: 'set null' },
    approved_at: { type: 'timestamp' },
    rejected_by_user_id: { type: 'uuid', references: 'users(id)', onDelete: 'set null' },
    rejected_at: { type: 'timestamp' },
    rejection_reason: { type: 'text' },
    funded_at: { type: 'timestamp' },
    notes: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createTable('dvp_settlements', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    trade_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'trades(id)',
      onDelete: 'cascade',
    },
    buyer_institution_id: {
      type: 'uuid',
      notNull: true,
      references: 'institutions(id)',
      onDelete: 'restrict',
    },
    seller_institution_id: {
      type: 'uuid',
      notNull: true,
      references: 'institutions(id)',
      onDelete: 'restrict',
    },
    buyer_user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
    },
    seller_user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
    },
    asset_id: {
      type: 'uuid',
      notNull: true,
      references: 'assets(id)',
      onDelete: 'restrict',
    },
    token_quantity: { type: 'numeric(20,6)', notNull: true },
    cash_amount: { type: 'numeric(20,2)', notNull: true },
    currency: { type: 'char(3)', notNull: true, default: 'USD' },
    settlement_tx_hash: { type: 'varchar(80)' },
    status: { type: 'varchar(24)', notNull: true, default: 'settled' },
    settled_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createTable('wallet_token_positions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    institution_id: {
      type: 'uuid',
      notNull: true,
      references: 'institutions(id)',
      onDelete: 'cascade',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'cascade',
    },
    asset_id: {
      type: 'uuid',
      notNull: true,
      references: 'assets(id)',
      onDelete: 'cascade',
    },
    token_type: { type: 'varchar(32)', notNull: true, default: 'asset_token' },
    quantity: { type: 'numeric(20,6)', notNull: true, default: 0 },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'wallet_token_positions',
    'wallet_token_positions_unique_holder_asset_type',
    'UNIQUE(institution_id, user_id, asset_id, token_type)',
  );

  pgm.createIndex('projects', ['institution_id', 'status', 'created_at'], {
    name: 'idx_projects_institution_status_created',
  });
  pgm.createIndex('project_dataroom_items', ['project_id', 'created_at'], {
    name: 'idx_project_dataroom_project_created',
  });
  pgm.createIndex('funding_requests', ['project_id', 'status', 'created_at'], {
    name: 'idx_funding_requests_project_status_created',
  });
  pgm.createIndex('dvp_settlements', ['buyer_institution_id', 'settled_at'], {
    name: 'idx_dvp_settlements_buyer_settled',
  });
  pgm.createIndex('dvp_settlements', ['seller_institution_id', 'settled_at'], {
    name: 'idx_dvp_settlements_seller_settled',
  });
  pgm.createIndex('wallet_token_positions', ['institution_id', 'user_id'], {
    name: 'idx_wallet_token_positions_holder',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('wallet_token_positions', ['institution_id', 'user_id'], {
    name: 'idx_wallet_token_positions_holder',
  });
  pgm.dropIndex('dvp_settlements', ['seller_institution_id', 'settled_at'], {
    name: 'idx_dvp_settlements_seller_settled',
  });
  pgm.dropIndex('dvp_settlements', ['buyer_institution_id', 'settled_at'], {
    name: 'idx_dvp_settlements_buyer_settled',
  });
  pgm.dropIndex('funding_requests', ['project_id', 'status', 'created_at'], {
    name: 'idx_funding_requests_project_status_created',
  });
  pgm.dropIndex('project_dataroom_items', ['project_id', 'created_at'], {
    name: 'idx_project_dataroom_project_created',
  });
  pgm.dropIndex('projects', ['institution_id', 'status', 'created_at'], {
    name: 'idx_projects_institution_status_created',
  });

  pgm.dropConstraint(
    'wallet_token_positions',
    'wallet_token_positions_unique_holder_asset_type',
  );

  pgm.dropTable('wallet_token_positions');
  pgm.dropTable('dvp_settlements');
  pgm.dropTable('funding_requests');
  pgm.dropTable('project_dataroom_items');
  pgm.dropTable('projects');
};
