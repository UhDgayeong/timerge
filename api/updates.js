// @capgo/capacitor-updater self-hosted update server.
// 앱이 시작될 때마다 POST로 호출됨. dist/ota/latest.json(publish-ota.mjs로 생성)과
// 클라이언트가 보낸 현재 OTA 버전(version_name)을 비교해 새 버전이 있으면 다운로드 정보를 응답한다.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const origin = `https://${req.headers.host}`
  const currentVersion = req.body?.version_name

  let manifest = null
  try {
    const r = await fetch(`${origin}/ota/latest.json`)
    if (r.ok) manifest = await r.json()
  } catch {
    // 매니페스트 조회 실패 시 업데이트 없음으로 처리
  }

  if (!manifest || manifest.version === currentVersion) {
    res.status(200).json({})
    return
  }

  res.status(200).json(manifest)
}
