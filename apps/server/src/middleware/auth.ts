import { NextFunction, Request, Response } from 'express'
import { verifyToken, getUserById } from '../services/authService'

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })
  const [, token] = authHeader.split(' ')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const payload = verifyToken(token)
    const user = await getUserById(payload.sub)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    req.currentUser = user
    req.workspaceId = payload.workspaceId
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
