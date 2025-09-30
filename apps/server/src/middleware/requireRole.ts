import { NextFunction, Request, Response } from 'express'
import { WorkspaceRole } from '@p42/shared'

export const requireRole = (role: WorkspaceRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser || !req.workspaceId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const hasRole = req.currentUser.hasRole(req.workspaceId, role)
    if (!hasRole) return res.status(403).json({ error: 'Forbidden' })
    next()
  }
}
