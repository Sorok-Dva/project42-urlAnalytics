import { subDays } from 'date-fns'
import { nanoid } from 'nanoid'
import { sequelize } from '../src/config/database'
import { registerAssociations } from '../src/models'
import { Link } from '../src/models/link'
import { LinkEvent } from '../src/models/linkEvent'
import { Project } from '../src/models/project'
import { QrCode } from '../src/models/qrCode'
import { Workspace } from '../src/models/workspace'
import { WorkspaceMember } from '../src/models/workspaceMember'
import { Domain } from '../src/models/domain'
import { User } from '../src/models/user'

export const runDemoSeed = async () => {
  registerAssociations()
  await sequelize.sync({ force: false })

  const [user] = await User.findOrCreate({
    where: { email: 'demo@p42.local' },
    defaults: {
      name: 'Demo User',
      passwordHash: null,
      avatarUrl: null,
      timezone: 'UTC'
    }
  })

  const workspace = await Workspace.findOne({ where: { name: 'Demo Workspace' } }) ??
    (await Workspace.create({
      name: 'Demo Workspace',
      slug: `demo-${nanoid(6)}`,
      ownerId: user.id,
      plan: 'pro',
      planLimits: {
        links: 10000,
        qrCodes: 10000,
        members: 20
      },
      isActive: true
    }))

  await WorkspaceMember.findOrCreate({
    where: { workspaceId: workspace.id, userId: user.id },
    defaults: {
      role: 'owner',
      status: 'active'
    }
  })

  const domain = await Domain.findOrCreate({
    where: { workspaceId: workspace.id, domain: 'demo.p42.local' },
    defaults: {
      projectId: null,
      status: 'verified',
      verificationToken: `seed-${nanoid(6)}`,
      verifiedAt: new Date()
    }
  })

  const projectA = await Project.findOrCreate({
    where: { workspaceId: workspace.id, slug: 'mir-alpha' },
    defaults: {
      ownerId: user.id,
      name: 'MIR-ALPHA',
      description: 'Marketing insights radar',
      isPublic: true,
      publicStatsToken: nanoid(12),
      isArchived: false
    }
  })

  const projectB = await Project.findOrCreate({
    where: { workspaceId: workspace.id, slug: 'mir-beta' },
    defaults: {
      ownerId: user.id,
      name: 'MIR-BETA',
      description: 'Mobile expansion',
      isPublic: false,
      publicStatsToken: null,
      isArchived: false
    }
  })

  const links = await Promise.all(
    ['launch', 'summer', 'product', 'press'].map(async slug => {
      const [link] = await Link.findOrCreate({
        where: { workspaceId: workspace.id, slug, domainId: (await Domain.findOne({ where: { domain: 'demo.p42.local' } }))?.id ?? null },
        defaults: {
          workspaceId: workspace.id,
          projectId: projectA[0].id,
          domainId: domain[0].id,
          slug,
          originalUrl: `https://example.com/${slug}`,
          comment: `Demo link ${slug}`,
          status: 'active',
          geoRules: [],
          expirationAt: null,
          maxClicks: null,
          clickCount: 0,
          fallbackUrl: null,
          publicStats: slug !== 'press',
          metadata: {},
          utm: {
            source: 'seed',
            medium: 'demo',
            campaign: 'mir-alpha',
            content: slug,
            term: null
          },
          createdById: user.id
        }
      })
      return link
    })
  )

  for (const link of links) {
    for (let i = 0; i < 60; i += 1) {
      const occurredAt = subDays(new Date(), Math.floor(Math.random() * 30))
      await LinkEvent.create({
        workspaceId: workspace.id,
        projectId: link.projectId,
        linkId: link.id,
        eventType: Math.random() > 0.9 ? 'scan' : 'click',
        referer: Math.random() > 0.5 ? 'https://twitter.com' : 'https://google.com',
        device: Math.random() > 0.5 ? 'desktop' : 'mobile',
        os: Math.random() > 0.5 ? 'macOS' : 'Windows',
        browser: Math.random() > 0.5 ? 'Chrome' : 'Safari',
        language: 'en',
        country: Math.random() > 0.5 ? 'FR' : 'US',
        city: Math.random() > 0.5 ? 'Paris' : 'San Francisco',
        continent: Math.random() > 0.5 ? 'EU' : 'NA',
        latitude: null,
        longitude: null,
        isBot: false,
        ipHash: `hash-${i}-${link.slug}`,
        userAgent: 'Mozilla/5.0',
        occurredAt,
        metadata: {},
        utm: link.utm
      })
    }
    const total = await LinkEvent.count({ where: { linkId: link.id } })
    await link.update({ clickCount: total })
  }

  await QrCode.findOrCreate({
    where: { workspaceId: workspace.id, name: 'Demo QR' },
    defaults: {
      workspaceId: workspace.id,
      projectId: projectB[0].id,
      linkId: links[0].id,
      name: 'Demo QR',
      code: nanoid(8),
      design: {
        foreground: '#7f5af0',
        background: '#0f172a'
      },
      totalScans: 42,
      createdById: user.id
    }
  })
}
