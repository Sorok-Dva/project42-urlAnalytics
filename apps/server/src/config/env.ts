import { config } from 'dotenv'
import path from 'path'

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
config({ path: path.resolve(process.cwd(), '../../', envFile) })

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) return fallback
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase())
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseNumber(process.env.SERVER_PORT, 4000),
  appUrl: process.env.APP_URL ?? 'http://localhost:4000',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  mysql: {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: parseNumber(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER ?? 'p42',
    password: process.env.MYSQL_PASSWORD ?? 'p42pass',
    database: process.env.MYSQL_DATABASE ?? 'p42_urlmanager'
  },
  sessionSecret: process.env.SESSION_SECRET ?? 'supersecretkey',
  jwtSecret: process.env.JWT_SECRET ?? 'jwtsecret',
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
  maxmind: {
    accountId: process.env.MAXMIND_ACCOUNT_ID,
    licenseKey: process.env.MAXMIND_LICENSE_KEY
  },
  redisUrl: process.env.REDIS_URL,
  cacheTtl: parseNumber(process.env.CACHE_TTL_SECONDS, 300),
  rateLimit: {
    window: parseNumber(process.env.RATE_LIMIT_WINDOW, 60),
    max: parseNumber(process.env.RATE_LIMIT_MAX, 120),
    apiMax: parseNumber(process.env.API_RATE_LIMIT_MAX, 240)
  },
  webhookSecret: process.env.WEBHOOK_SECRET ?? 'whsec_dev',
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000',
  defaultDomain: process.env.DEFAULT_DOMAIN ?? 'url.p-42.fr',
  feature: {
    linkInBio: parseBoolean(process.env.FEATURE_LINK_IN_BIO, false)
  },
  oauth: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET
    },
    redirectUrl: process.env.OAUTH_REDIRECT_URL ?? 'http://localhost:4000/api/auth/callback'
  }
}
