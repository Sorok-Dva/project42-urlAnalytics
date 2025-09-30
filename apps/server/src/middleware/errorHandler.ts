import { NextFunction, Request, Response } from 'express'

export const errorHandler = (error: unknown, req: Request, res: Response, next: NextFunction) => {
  const status = (error as { status?: number }).status ?? 500
  const message = (error as { message?: string }).message ?? 'Internal error'
  if (req.app.get('env') !== 'test') console.error(error)
  res.status(status).json({ error: message })
}
