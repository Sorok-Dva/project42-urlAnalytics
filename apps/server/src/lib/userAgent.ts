import UAParser from 'ua-parser-js'

export const parseUserAgent = (ua: string | undefined) => {
  if (!ua) {
    return {
      device: 'unknown',
      os: 'unknown',
      browser: 'unknown'
    }
  }

  const parser = new UAParser(ua)
  const deviceType = parser.getDevice().type ?? 'desktop'
  const os = parser.getOS().name ?? 'unknown'
  const browser = parser.getBrowser().name ?? 'unknown'

  return {
    device: deviceType,
    os,
    browser
  }
}

export const isBotUserAgent = (ua: string | undefined) => {
  if (!ua) return false
  const botPatterns = [/bot/i, /spider/i, /crawl/i, /headless/i, /preview/i]
  return botPatterns.some(pattern => pattern.test(ua))
}
