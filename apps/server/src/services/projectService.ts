import { nanoid } from 'nanoid'
import { Op } from 'sequelize'
import { Project } from '../models/project'
import { Link } from '../models/link'
import { env } from '../config/env'

export const createProject = async (payload: {
  workspaceId: string
  ownerId: string
  name: string
  description?: string
}) => {
  const slug = payload.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
  const uniqueSlug = await ensureUniqueSlug(payload.workspaceId, slug)

  return Project.create({
    workspaceId: payload.workspaceId,
    ownerId: payload.ownerId,
    name: payload.name,
    description: payload.description ?? null,
    slug: uniqueSlug,
    isPublic: false,
    publicStatsToken: null,
    isArchived: false
  })
}

const ensureUniqueSlug = async (workspaceId: string, base: string, counter = 0): Promise<string> => {
  const candidate = counter === 0 ? base : `${base}-${counter}`
  const existing = await Project.findOne({
    where: {
      workspaceId,
      slug: candidate
    }
  })
  if (!existing) return candidate
  return ensureUniqueSlug(workspaceId, base, counter + 1)
}

export const listProjects = async (workspaceId: string) => {
  return Project.findAll({
    where: {
      workspaceId,
      isArchived: false
    },
    order: [['createdAt', 'DESC']]
  })
}

export const toggleProjectPublicStats = async (projectId: string, enabled: boolean) => {
  const project = await Project.findByPk(projectId)
  if (!project) throw new Error('Project not found')
  project.isPublic = enabled
  project.publicStatsToken = enabled ? project.publicStatsToken ?? nanoid(16) : null
  await project.save()
  return project
}

export const getProjectShareUrl = (project: Project) => {
  if (!project.publicStatsToken) return null
  return `${env.publicBaseUrl}/share/project/${project.publicStatsToken}`
}

export const getProjectStatsSnapshot = async (projectId: string) => {
  const project = await Project.findByPk(projectId)
  if (!project) throw new Error('Project not found')
  const totalLinks = await Link.count({ where: { projectId, status: { [Op.ne]: 'deleted' } } })
  const totalClicks = await Link.sum('clickCount', { where: { projectId } })
  return {
    project,
    totalLinks,
    totalClicks: Number(totalClicks ?? 0)
  }
}

export const getProjectByToken = async (token: string) => {
  return Project.findOne({ where: { publicStatsToken: token, isPublic: true } })
}
