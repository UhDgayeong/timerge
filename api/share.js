function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async function handler(req, res) {
  const { token } = req.query
  const origin = `https://${req.headers.host}`

  let displayName = null
  try {
    const r = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/get_shared_week`, {
      method: 'POST',
      headers: {
        apikey: process.env.VITE_SUPABASE_ANON_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ p_token: token }),
    })
    if (r.ok) {
      const data = await r.json()
      displayName = data?.displayName ?? null
    }
  } catch {
    // 메타데이터 조회 실패해도 페이지는 정상 렌더링되어야 함
  }

  const title = displayName
    ? `Timerge - ${displayName}님의 이번 주 근무 현황`
    : 'Timerge - 근무 현황 공유'
  const description = displayName
    ? `${displayName}님이 공유한 근무 현황을 확인해 보세요.`
    : '공유된 근무 현황을 확인해 보세요.'
  const pageUrl = `${origin}/share/${token}`

  const indexRes = await fetch(`${origin}/index.html`)
  let html = await indexRes.text()

  const metaTags = `
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:type" content="website" />`

  html = html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/\s*<meta property="og:[^"]+"[^>]*\/>\n?/g, '')
    .replace('</head>', `${metaTags}\n  </head>`)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(html)
}
