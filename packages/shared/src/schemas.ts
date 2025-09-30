import { z } from 'zod'

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(25)
})

export const IntervalSchema = z.enum(['all', '1y', '3m', '1m', '1w', '1d'])

export const PublicStatsSchema = z.object({
  enabled: z.boolean(),
  shareUrl: z.string().url()
})

export type PaginationInput = z.infer<typeof PaginationSchema>
export type IntervalInput = z.infer<typeof IntervalSchema>
export type PublicStatsInput = z.infer<typeof PublicStatsSchema>
