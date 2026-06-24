// 네이티브 코드가 바뀐 릴리스(플러그인 추가, 권한 변경 등)일 때 동료들이 재설치할 Android APK를
// 빌드해서 Vercel Blob에 업로드한다. 매번 같은 키로 덮어써서 다운로드 링크가 고정된다.
// 사용법: npm run apk:publish (android 디버그 키로 서명된 APK, 내부 배포용)
import { put } from '@vercel/blob'
import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const apkPath = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')

console.log('Android 디버그 APK 빌드 중...')
execSync('./gradlew assembleDebug', { cwd: join(root, 'android'), stdio: 'inherit' })

if (!existsSync(apkPath)) {
  console.error(`APK를 찾을 수 없습니다: ${apkPath}`)
  process.exit(1)
}

const apkBuffer = readFileSync(apkPath)

const blob = await put('timerge.apk', apkBuffer, {
  access: 'public',
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: 'application/vnd.android.package-archive',
  // .env.local의 VERCEL_OIDC_TOKEN을 @vercel/blob이 자동으로 우선 사용해버려서 명시 지정 필요
  token: process.env.BLOB_READ_WRITE_TOKEN,
})

console.log(`업로드 완료: ${blob.url}`)
