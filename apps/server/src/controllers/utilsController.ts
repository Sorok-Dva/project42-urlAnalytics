import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'

export const buildUtm = asyncHandler(async (req: Request, res: Response) => {
  const { url, source, medium, campaign, content, term } = req.body
  if (!url) return res.status(400).json({ error: 'url is required' })

  try {
    const parsed = new URL(url)
    if (source) parsed.searchParams.set('utm_source', source)
    if (medium) parsed.searchParams.set('utm_medium', medium)
    if (campaign) parsed.searchParams.set('utm_campaign', campaign)
    if (content) parsed.searchParams.set('utm_content', content)
    if (term) parsed.searchParams.set('utm_term', term)
    res.json({ url: parsed.toString() })
  } catch (error) {
    res.status(400).json({ error: 'Invalid URL' })
  }
})
