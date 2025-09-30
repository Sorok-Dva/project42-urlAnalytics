import { User } from './user'
import { Workspace } from './workspace'
import { WorkspaceMember } from './workspaceMember'
import { Project } from './project'
import { Domain } from './domain'
import { Link } from './link'
import { LinkEvent } from './linkEvent'
import { QrCode } from './qrCode'
import { ApiKey } from './apiKey'
import { Webhook } from './webhook'

export const models = {
  User,
  Workspace,
  WorkspaceMember,
  Project,
  Domain,
  Link,
  LinkEvent,
  QrCode,
  ApiKey,
  Webhook
}

export const registerAssociations = () => {
  Workspace.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' })
  WorkspaceMember.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
  WorkspaceMember.belongsTo(User, { foreignKey: 'userId', as: 'user' })
  User.hasMany(WorkspaceMember, { foreignKey: 'userId', as: 'memberships' })

  Project.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
  Project.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' })
  Workspace.hasMany(Project, { foreignKey: 'workspaceId', as: 'projects' })

  Domain.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
  Domain.belongsTo(Project, { foreignKey: 'projectId', as: 'project' })
  Workspace.hasMany(Domain, { foreignKey: 'workspaceId', as: 'domains' })

  Link.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
  Link.belongsTo(Project, { foreignKey: 'projectId', as: 'project' })
  Link.belongsTo(Domain, { foreignKey: 'domainId', as: 'domain' })
  Link.belongsTo(User, { foreignKey: 'createdById', as: 'creator' })
  Workspace.hasMany(Link, { foreignKey: 'workspaceId', as: 'links' })
  Project.hasMany(Link, { foreignKey: 'projectId', as: 'links' })
  Domain.hasMany(Link, { foreignKey: 'domainId', as: 'links' })

  LinkEvent.belongsTo(Link, { foreignKey: 'linkId', as: 'link' })
  LinkEvent.belongsTo(Project, { foreignKey: 'projectId', as: 'project' })
  LinkEvent.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
  Link.hasMany(LinkEvent, { foreignKey: 'linkId', as: 'events' })

  QrCode.belongsTo(Link, { foreignKey: 'linkId', as: 'link' })
  QrCode.belongsTo(Project, { foreignKey: 'projectId', as: 'project' })
  QrCode.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
  QrCode.belongsTo(User, { foreignKey: 'createdById', as: 'creator' })
  Link.hasMany(QrCode, { foreignKey: 'linkId', as: 'qrCodes' })
  Workspace.hasMany(QrCode, { foreignKey: 'workspaceId', as: 'qrCodes' })

  ApiKey.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
  ApiKey.belongsTo(Project, { foreignKey: 'projectId', as: 'project' })
  ApiKey.belongsTo(User, { foreignKey: 'createdById', as: 'creator' })
  Workspace.hasMany(ApiKey, { foreignKey: 'workspaceId', as: 'apiKeys' })

  Webhook.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
  Webhook.belongsTo(User, { foreignKey: 'createdById', as: 'creator' })
  Workspace.hasMany(Webhook, { foreignKey: 'workspaceId', as: 'webhooks' })
}
