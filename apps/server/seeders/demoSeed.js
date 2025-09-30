"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDemoSeed = void 0;
const date_fns_1 = require("date-fns");
const nanoid_1 = require("nanoid");
const database_1 = require("../src/config/database");
const models_1 = require("../src/models");
const link_1 = require("../src/models/link");
const linkEvent_1 = require("../src/models/linkEvent");
const project_1 = require("../src/models/project");
const qrCode_1 = require("../src/models/qrCode");
const workspace_1 = require("../src/models/workspace");
const workspaceMember_1 = require("../src/models/workspaceMember");
const domain_1 = require("../src/models/domain");
const user_1 = require("../src/models/user");
const runDemoSeed = async () => {
    (0, models_1.registerAssociations)();
    await database_1.sequelize.sync({ force: false });
    const [user] = await user_1.User.findOrCreate({
        where: { email: 'demo@p42.local' },
        defaults: {
            name: 'Demo User',
            passwordHash: null,
            avatarUrl: null,
            timezone: 'UTC'
        }
    });
    const workspace = await workspace_1.Workspace.findOne({ where: { name: 'Demo Workspace' } }) ??
        (await workspace_1.Workspace.create({
            name: 'Demo Workspace',
            slug: `demo-${(0, nanoid_1.nanoid)(6)}`,
            ownerId: user.id,
            plan: 'pro',
            planLimits: {
                links: 10000,
                qrCodes: 10000,
                members: 20
            },
            isActive: true
        }));
    await workspaceMember_1.WorkspaceMember.findOrCreate({
        where: { workspaceId: workspace.id, userId: user.id },
        defaults: {
            role: 'owner',
            status: 'active'
        }
    });
    const domain = await domain_1.Domain.findOrCreate({
        where: { workspaceId: workspace.id, domain: 'demo.p42.local' },
        defaults: {
            projectId: null,
            status: 'verified',
            verificationToken: `seed-${(0, nanoid_1.nanoid)(6)}`,
            verifiedAt: new Date()
        }
    });
    const projectA = await project_1.Project.findOrCreate({
        where: { workspaceId: workspace.id, slug: 'mir-alpha' },
        defaults: {
            ownerId: user.id,
            name: 'MIR-ALPHA',
            description: 'Marketing insights radar',
            isPublic: true,
            publicStatsToken: (0, nanoid_1.nanoid)(12),
            isArchived: false
        }
    });
    const projectB = await project_1.Project.findOrCreate({
        where: { workspaceId: workspace.id, slug: 'mir-beta' },
        defaults: {
            ownerId: user.id,
            name: 'MIR-BETA',
            description: 'Mobile expansion',
            isPublic: false,
            publicStatsToken: null,
            isArchived: false
        }
    });
    const links = await Promise.all(['launch', 'summer', 'product', 'press'].map(async (slug) => {
        const [link] = await link_1.Link.findOrCreate({
            where: { workspaceId: workspace.id, slug, domainId: (await domain_1.Domain.findOne({ where: { domain: 'demo.p42.local' } }))?.id ?? null },
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
        });
        return link;
    }));
    for (const link of links) {
        for (let i = 0; i < 60; i += 1) {
            const occurredAt = (0, date_fns_1.subDays)(new Date(), Math.floor(Math.random() * 30));
            await linkEvent_1.LinkEvent.create({
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
            });
        }
        const total = await linkEvent_1.LinkEvent.count({ where: { linkId: link.id } });
        await link.update({ clickCount: total });
    }
    await qrCode_1.QrCode.findOrCreate({
        where: { workspaceId: workspace.id, name: 'Demo QR' },
        defaults: {
            workspaceId: workspace.id,
            projectId: projectB[0].id,
            linkId: links[0].id,
            name: 'Demo QR',
            code: (0, nanoid_1.nanoid)(8),
            design: {
                foreground: '#7f5af0',
                background: '#0f172a'
            },
            totalScans: 42,
            createdById: user.id
        }
    });
};
exports.runDemoSeed = runDemoSeed;
