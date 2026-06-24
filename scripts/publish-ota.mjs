// 네이티브 앱(Capacitor)용 OTA 번들을 생성한다.
// package.json의 version을 새 OTA 버전으로 사용하므로, 호출 전에 버전을 올려둘 것.
// public/ota/ 에 생성해야 Vercel이 소스에서 다시 빌드할 때(vite가 public/* 를 dist에 복사)
// 동일한 파일이 배포 결과물에 그대로 포함된다. dist/ota는 git에 없어 Vercel 빌드 시 사라짐.
// 사용법: npm run build && node scripts/publish-ota.mjs (그 다음 git add/commit/push, npx vercel --prod)
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const distDir = join(root, 'dist')
const publicOtaDir = join(root, 'public', 'ota')

if (!existsSync(distDir)) {
  console.error('dist/ 가 없습니다. 먼저 npm run build 를 실행하세요.')
  process.exit(1)
}

const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
const zipName = `bundle-${version}.zip`

mkdirSync(publicOtaDir, { recursive: true })

// 레포 용량 증가 방지를 위해 이전 버전 zip은 남기지 않고 최신본만 유지
for (const f of readdirSync(publicOtaDir)) {
  if (f.endsWith('.zip')) unlinkSync(join(publicOtaDir, f))
}

// dist 내부(ota 디렉토리 제외)를 zip 루트에 압축 — index.html이 zip 루트에 위치해야 함
execSync(`cd ${distDir} && zip -r -X ${join(publicOtaDir, zipName)} . -x "ota/*"`, { stdio: 'inherit' })

const checksum = createHash('sha256').update(readFileSync(join(publicOtaDir, zipName))).digest('hex')

const manifest = {
  version,
  url: `https://timerge.vercel.app/ota/${zipName}`,
  checksum,
}
writeFileSync(join(publicOtaDir, 'latest.json'), JSON.stringify(manifest, null, 2))

console.log(`OTA 번들 생성 완료: public/ota/${zipName} (sha256: ${checksum})`)
console.log('다음: git add public/ota && git commit, 그리고 npx vercel --prod 로 배포하면 적용됩니다.')
