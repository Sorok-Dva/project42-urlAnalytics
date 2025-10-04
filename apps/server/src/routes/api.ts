import { Router, type Router as ExpressRouter } from 'express'
import * as authController from '../controllers/authController'
import * as linkController from '../controllers/linkController'
import * as projectController from '../controllers/projectController'
import * as eventController from '../controllers/eventController'
import * as publicStatsController from '../controllers/publicStatsController'
import * as domainController from '../controllers/domainController'
import * as qrController from '../controllers/qrController'
import * as webhookController from '../controllers/webhookController'
import * as utilsController from '../controllers/utilsController'
import * as dashboardController from '../controllers/dashboardController'
import * as workspaceController from '../controllers/workspaceController'
import * as adminController from '../controllers/adminController'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { apiRateLimit } from '../middleware/rateLimit'
import { requireAdmin } from '../middleware/requireAdmin'

const router: ExpressRouter = Router()

router.post('/auth/register', authController.register)
router.post('/auth/login', authController.login)
router.get('/auth/features', authController.features)
router.get('/auth/me', requireAuth, authController.current)
router.post('/auth/switch', requireAuth, authController.switchWorkspace)
router.get('/public/links/:token', publicStatsController.linkStats)
router.get('/public/projects/:token', publicStatsController.projectStats)

router.use(requireAuth, apiRateLimit)

router.get('/admin/stats', requireAdmin, adminController.stats)
router.get('/admin/workspaces', requireAdmin, adminController.listWorkspaces)
router.patch('/admin/workspaces/:id', requireAdmin, adminController.updateWorkspace)
router.get('/admin/invites', requireAdmin, adminController.invites)
router.post('/admin/invites', requireAdmin, adminController.createInvite)
router.get('/admin/users', requireAdmin, adminController.listUsers)
router.get('/admin/analytics', requireAdmin, adminController.analytics)

router.get('/workspaces', workspaceController.list)
router.post('/workspaces', workspaceController.create)
router.get('/workspaces/:id', workspaceController.detail)
router.get('/workspaces/:id/members', workspaceController.members)
router.post('/workspaces/:id/members', workspaceController.invite)
router.patch('/workspaces/:id', workspaceController.update)
router.get('/workspaces/:id/domains', workspaceController.domains)

router.get('/dashboard', dashboardController.overview)

router.post('/links', requireRole('member'), linkController.create)
router.get('/links', linkController.list)
router.patch('/links/:id', requireRole('member'), linkController.update)
router.post('/links/:id/archive', requireRole('member'), linkController.archive)
router.post('/links/:id/unarchive', requireRole('member'), linkController.unarchive)
router.delete('/links/:id', requireRole('admin'), linkController.remove)
router.post('/links/:id/duplicate', requireRole('member'), linkController.duplicate)
router.post('/links/:id/move', requireRole('member'), linkController.move)
router.post('/links/:id/public', requireRole('member'), linkController.togglePublic)
router.post('/links/transfer', requireRole('admin'), linkController.bulkTransfer)
router.post('/links/:id/transfer', requireRole('admin'), linkController.transfer)
router.get('/links/:id/stats', linkController.analytics)
router.get('/links/:id/export', linkController.exportStats)
router.get('/links/:id', linkController.detail)

router.get('/events', eventController.list)

router.get('/projects', projectController.list)
router.post('/projects', requireRole('member'), projectController.create)
router.post('/projects/:id/public', requireRole('member'), projectController.makePublic)

router.get('/domains', domainController.list)
router.post('/domains', requireRole('admin'), domainController.create)
router.post('/domains/:id/verify', requireRole('admin'), domainController.verify)
router.post('/domains/:id/assign', requireRole('admin'), domainController.assign)

router.get('/qr', qrController.list)
router.post('/qr', requireRole('member'), qrController.create)
router.get('/qr/:id/download', qrController.download)
router.get('/qr/:id', qrController.detail)
router.patch('/qr/:id', requireRole('member'), qrController.update)
router.delete('/qr/:id', requireRole('member'), qrController.remove)
router.post('/qr/:id/transfer', requireRole('admin'), qrController.transfer)

router.get('/webhooks', requireRole('admin'), webhookController.list)
router.post('/webhooks', requireRole('admin'), webhookController.create)
router.post('/webhooks/tests', requireRole('admin'), webhookController.test)
router.post('/utils/utm', utilsController.buildUtm)

export default router
