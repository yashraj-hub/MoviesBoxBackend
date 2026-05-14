/** Merge client-reported device context with server IP (signup / login). */

function sliceStr(v, max) {
  if (v === undefined || v === null) return ''
  const s = String(v)
  return s.length > max ? s.slice(0, max) : s
}

function platformFromUserAgent(ua = '') {
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/OPR\/|Opera/i.test(ua)) return 'Opera'
  if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) return 'Chrome'
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return ''
}

function pickNum(v, fallback = null) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/**
 * @param {object|null} existingUserDoc - mongoose doc or plain object with signupContext
 * @param {object|null} bodyCtx - req.body.signupContext from client
 * @param {import('express').Request} req
 */
function mergeSignupContext(existingUserDoc, bodyCtx, req) {
  const prev = existingUserDoc?.signupContext || {}
  const prevClient = prev.client || {}
  const c = bodyCtx?.client || {}

  const forwardedRaw = req.get('x-forwarded-for') || ''
  const forwardedFirst = forwardedRaw.split(',')[0].trim()
  const ip = forwardedFirst || req.ip || ''

  const client = {
    userAgent: sliceStr(c.userAgent ?? prevClient.userAgent, 450),
    platform: sliceStr(c.platform ?? prevClient.platform, 64),
    language: sliceStr(c.language ?? prevClient.language, 32),
    languages: Array.isArray(c.languages) ? c.languages.map((x) => sliceStr(x, 16)).slice(0, 12) : prevClient.languages || [],
    timezone: sliceStr(c.timezone ?? prevClient.timezone, 64),
    screen: sliceStr(c.screen ?? prevClient.screen, 32),
    screenDetail: sliceStr(c.screenDetail ?? prevClient.screenDetail, 64),
    deviceMemory: c.deviceMemory != null ? sliceStr(c.deviceMemory, 16) : prevClient.deviceMemory || '',
    hardwareConcurrency: pickNum(c.hardwareConcurrency, prevClient.hardwareConcurrency ?? null),
    touchPoints: pickNum(c.touchPoints, prevClient.touchPoints ?? null),
    vendor: sliceStr(c.vendor ?? prevClient.vendor, 64),
    cookieEnabled: typeof c.cookieEnabled === 'boolean' ? c.cookieEnabled : prevClient.cookieEnabled ?? null,
    online: typeof c.online === 'boolean' ? c.online : prevClient.online ?? null,
    colorScheme: sliceStr(c.colorScheme ?? prevClient.colorScheme, 32),
    connection: sliceStr(c.connection ?? prevClient.connection, 64),
    referrer: sliceStr(c.referrer ?? prevClient.referrer, 500),
    pageUrl: sliceStr(c.pageUrl ?? prevClient.pageUrl, 500),
  }

  return {
    client,
    server: {
      ip: sliceStr(ip, 45),
      forwardedFor: sliceStr(forwardedRaw, 200),
    },
    recordedAt: new Date(),
  }
}

module.exports = {
  mergeSignupContext,
  platformFromUserAgent,
}
