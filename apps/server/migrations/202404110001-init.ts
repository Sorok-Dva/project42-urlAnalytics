import { DataTypes, QueryInterface } from 'sequelize'

export const up = async ({ context }: { context: QueryInterface }) => {
  await context.createTable('users', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    avatar_url: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    timezone: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })

  await context.createTable('workspaces', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    plan: {
      type: DataTypes.STRING(32),
      allowNull: false
    },
    plan_limits: {
      type: DataTypes.JSON,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })

  await context.createTable('workspace_members', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    workspace_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'member', 'viewer'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'pending'),
      defaultValue: 'active'
    },
    invited_by_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })

  await context.createTable('projects', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    workspace_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    public_stats_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })

  await context.createTable('domains', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    workspace_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'verified'),
      defaultValue: 'pending'
    },
    verification_token: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })

  await context.createTable('links', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    workspace_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    domain_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    original_url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'archived', 'deleted'),
      defaultValue: 'active'
    },
    geo_rules: {
      type: DataTypes.JSON,
      allowNull: false
    },
    expiration_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    max_clicks: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    click_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    fallback_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    public_stats: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    utm: {
      type: DataTypes.JSON,
      allowNull: true
    },
    created_by_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })

  await context.addIndex('links', ['workspace_id'])
  await context.addIndex('links', ['project_id'])
  await context.addIndex('links', ['slug', 'domain_id'], { unique: true })

  await context.createTable('link_events', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    workspace_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    link_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    event_type: {
      type: DataTypes.ENUM('click', 'scan'),
      allowNull: false
    },
    referer: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    device: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    os: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    browser: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    language: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    continent: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    is_bot: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    ip_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    occurred_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    utm: {
      type: DataTypes.JSON,
      allowNull: true
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })

  await context.addIndex('link_events', ['workspace_id', 'occurred_at'])
  await context.addIndex('link_events', ['link_id', 'occurred_at'])

  await context.createTable('qr_codes', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    workspace_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    link_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    design: {
      type: DataTypes.JSON,
      allowNull: false
    },
    total_scans: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    created_by_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })

  await context.createTable('api_keys', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    workspace_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    scopes: {
      type: DataTypes.JSON,
      allowNull: false
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_by_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })

  await context.createTable('webhooks', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    workspace_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    target_url: {
      type: DataTypes.STRING(512),
      allowNull: false
    },
    secret: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    events: {
      type: DataTypes.JSON,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_by_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })
}

export const down = async ({ context }: { context: QueryInterface }) => {
  await context.dropTable('webhooks')
  await context.dropTable('api_keys')
  await context.dropTable('qr_codes')
  await context.dropTable('link_events')
  await context.dropTable('links')
  await context.dropTable('domains')
  await context.dropTable('projects')
  await context.dropTable('workspace_members')
  await context.dropTable('workspaces')
  await context.dropTable('users')
}
