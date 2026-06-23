---
name: decisions
description: "timerge 기술 결정 히스토리 — 날짜별 결정 근거 누적"
metadata:
  type: project
---

## 2026-06-23 — TimePicker 데스크톱 드래그 스크롤 추가 + 드래그발(發) 클릭 흡수 패턴

**결정**: 데스크톱 웹에서 TimePicker 휠 조작성 개선을 위해 마우스 좌클릭 드래그로 스크롤하는 기능을 추가(`pointerType === 'mouse'`로 한정, 터치는 기존 네이티브 스크롤 유지). 숫자 클릭→키보드 입력 방식은 보류(디자인 언어 이질감 + IME/검증 비용 대비 효용 낮다고 판단, 드래그만으로 충분할 것으로 예상).

구현 중 발견된 버그 2건도 함께 수정:
1. `picker-overlay`(어두운 배경) 클릭 시 `onClick`에 `stopPropagation()`이 없어서, 클릭 이벤트가 부모 `DayEditModal`의 `modal-backdrop onClick={onClose}`까지 전파되어 TimePicker와 바텀시트가 동시에 닫히던 버그.
2. (본 기능 추가로 노출) 드래그 거리가 휠 영역의 실제 높이를 초과해 pointerup이 카드 경계 밖(어두운 배경)에서 발생하면, 그 직후 브라우저가 발생시키는 `click` 이벤트가 "바깥 클릭"으로 오인되어 picker가 닫혀버리던 버그. 드래그 시작 시 이동 거리를 추적해 3px 초과 시 `dragged` 플래그를 세우고, pointerup 처리 후 `window`에 캡처 단계 1회용 `click` 리스너를 달아 그 다음 click 이벤트의 `stopPropagation`/`preventDefault`로 흡수.

**이유**: React의 `stopPropagation()`은 synthetic 이벤트의 React-tree 버블만 막을 뿐, 네이티브 DOM 트리에서 이미 일어난 버블링이나 별도로 발생하는 `click` 이벤트 자체를 막지 못함. 드래그 후 마우스 위치가 어디든 의도된 제스처(스크롤)였다면 그 직후의 클릭은 "닫기 의도"가 아니므로, 클릭 자체를 흡수하는 게 좌표 기반 판정보다 안전함.

**관련 파일**: `src/components/TimePicker.tsx`(onDragStart, picker-overlay onClick), `src/index.css`(`.picker-card__col` cursor: grab)

---

## 2026-06-23 — 홈 헤더 로고: 워드마크 PNG 대신 마크 SVG + 기존 텍스트 조합

**결정**: `~/Downloads/brand/logo-color.png`(마크+"Timerge" 텍스트 통합 이미지) 대신 `logo-mark.svg`(시계 아이콘만)를 `src/assets/logo-mark.svg`로 가져와 기존 그라디언트 "Timerge" 텍스트 왼쪽에 작게 배치. 아이콘 추가 후 텍스트가 상대적으로 커 보여 폰트 크기를 1.5625rem → 1.1875rem으로 축소.

**이유**: `logo-color.png`는 "Timerge" 글자 부분이 고정 네이비 색이라 다크모드 배경에서 거의 안 보일 위험이 있었음. `logo-mark.svg`는 색이 고정 퍼플 그라디언트(`#9d7dff~#5a32e6`)라 텍스트 색에 의존하지 않고, 앱 아이콘과 동일 자산이라 양쪽 모드에서 이미 검증됨 — 별도 다크모드용 로고를 새로 만들 필요 없음. 헤더 텍스트는 다크모드 대응이 이미 돼 있는 기존 그라디언트 스타일을 그대로 살리는 쪽이 PNG 워드마크 전체 교체보다 안전.

**관련 파일**: `src/assets/logo-mark.svg`(신규), `src/App.tsx`(`app-header__brand` 래퍼), `src/index.css`(`.app-header__logo`, `.app-header__title` 폰트 크기)

---

## 2026-06-23 — 앱 아이콘 교체: `@capacitor/assets`로 생성, splash 변경분은 revert (이슈 #16)

**결정**: `@capacitor/assets`(devDependency) 설치 → `assets/icon.png`(1024×1024, `~/Downloads/brand/app-icon.png` 풀-블리드 정사각형 원본, 라운드 처리 없는 버전)을 소스로 `npx capacitor-assets generate --android --ios` 실행. Android(legacy+adaptive+round 전 dpi)·iOS(`AppIcon-512@2x.png`) 둘 다 갱신.

**이유**: `app-icon.png`(정사각형, OS가 자체 마스킹)과 `app-icon-rounded.png`(이미 라운드 처리됨) 두 버전이 있었는데, OS가 어차피 자체적으로 모양을 적용하므로(Android adaptive icon, iOS 자동 라운드) 풀-블리드 정사각형 원본을 소스로 쓰는 게 표준 방식. 라운드 버전은 OS 마스킹이 없는 곳(Google OAuth 브랜딩 로고 등)에 이미 따로 쓰임.

**함정**: `capacitor-assets generate`는 인자 없이 실행하면 PWA(`www/manifest.json`)까지 같이 생성을 시도해 에러로 전체가 실패함 — `--android --ios`로 플랫폼을 명시해야 함. 또한 아이콘 소스만 지정해도 **스플래시 화면까지 같이 덮어씀**(흰 배경에 아이콘 중앙 배치하는 기본 스플래시로 교체) — 아이콘만 바꾸고 싶을 때는 생성 후 `git status`로 스플래시 관련 변경(`drawable*/splash.png`, `Splash.imageset/*`, 신규 night/land 변형 디렉터리)을 찾아 전부 revert 필요. PWA 전용 webp 아이콘도 `icons/`에 별도 생성되는데 프로젝트가 PWA가 아니라 삭제.

**환경 이슈**: `npx cap sync ios`에서 `pod install`이 기본 셸 LANG(POSIX/C)일 때 CocoaPods가 유니코드 정규화 에러로 실패함. `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios`로 해결 — 코드 문제가 아니라 로컬 셸 환경 설정 문제.

**관련 파일**: `assets/icon.png`(신규, 소스), `android/app/src/main/res/mipmap-*/ic_launcher*.png`, `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, `package.json`(`@capacitor/assets` 추가)

---

## 2026-06-23 — Google OAuth Supabase URL 노출: 부분 해결로 클로즈 (이슈 #12)

**결정**: Google Cloud Console "브랜딩"에서 앱 이름(Timerge)·로고·홈페이지(https://timerge.vercel.app)·승인된 도메인(timerge.vercel.app) 등록 완료. 이로써 OAuth 권한 동의 화면(스코프 설명 화면)은 Supabase URL 대신 Timerge로 표시됨. 다만 로그인 첫 화면인 "계정 선택" 화면에는 여전히 `tsizysmfcpxhxunalxoe.supabase.co (으)로 이동`이 노출되는데, 이는 Google이 OAuth `redirect_uri`의 실제 호스트를 보안/투명성 목적으로 항상 표시하는 영역이라 브랜딩으로 가릴 수 없음. 완전 해결에는 Supabase Custom Domain(Pro 플랜, $25/월~)으로 자체 도메인을 redirect_uri로 써야 함 — 비용 대비 우선순위가 낮다고 판단해 보류하고 이슈를 부분 해결로 클로즈.

**이유**: "승인된 도메인" 필드에 `vercel.app`만 입력하면 "퍼블릭 서픽스 도메인이라 최상위 비공개 도메인이어야 함" 에러 발생 — `timerge.vercel.app` 풀 서브도메인으로 입력해야 통과됨. 동의 화면 브랜딩과 계정 선택 화면은 Google 내부적으로 서로 다른 레이어라, 브랜딩만으로는 후자를 못 고친다는 점을 실측으로 확인.

**관련 파일**: 없음 (Google Cloud Console 설정만, 코드 변경 없음)

---

## 2026-06-23 — 웹 배포: Vercel 선택 + Supabase URL Configuration 정리

**결정**: 웹 배포 플랫폼으로 GitHub Pages 대신 Vercel 선택. CLI(`npx vercel`)로 직접 배포(GitHub 레포 자동 연동은 실패했지만 CLI 배포는 git 연동 불필요라 무관). `VITE_GOOGLE_CALENDAR_API_KEY`/`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`를 Vercel production+preview 환경변수로 등록 후 `vercel --prod`. 배포 URL: https://timerge.vercel.app (이슈 #11 클로즈)

**이유**: GitHub Pages는 완전 무료·레포 종속이지만 (1) Vite 빌드타임 env 주입을 GitHub Actions secrets 워크플로로 직접 구성해야 하고 (2) 서브패스 배포(`<repo>.github.io/timerge/`)라 `vite.config.ts` base 경로 + OAuth 리다이렉트 경로 보정이 추가로 필요함. `src/services/auth.ts`가 웹에서 `window.location.origin`을 OAuth `redirectTo`로 그대로 쓰므로, 루트 도메인을 기본 제공하는 Vercel이 설정 마찰이 적었음.

**Supabase Auth URL Configuration 함정**: Site URL 필드는 와일드카드를 허용하지 않음(`https://timerge.vercel.app/**`로 잘못 입력했다가 `https://timerge.vercel.app`로 수정). Redirect URLs 목록에는 와일드카드 허용 — `https://timerge.vercel.app/**` + 기존 `com.timerge.app://`(네이티브) 둘 다 등록. 웹 Google 로그인 실기기 확인 완료.

**관련 파일**: `.vercel/project.json`(gitignore됨), `src/services/auth.ts`

---

## 2026-06-22 — `currentWeekMonday()` 타임존 버그: 근본원인이 기기 시계여도 수정 유지

**결정**: 폴드 폰에서 주간 카드가 일~토 순서로 표시되는 신고를 분석하다, `db/index.ts`의 `currentWeekMonday()`가 로컬 시간으로 월요일을 계산한 뒤 `toISOString()`(UTC 변환)으로 문자열화하는 것을 발견. KST 자정~오전 9시 사이엔 로컬 날짜와 UTC 날짜가 달라 결과가 하루 당겨질 수 있는 코드 버그였음. 이후 사용자가 실제 원인은 기기가 오랫동안 인터넷 미연결로 시계 자체가 틀어졌던 것이라고 확인 — 시계 보정 전후 모두 정상 순서로 표시됨. 그럼에도 코드 수정(`getFullYear/getMonth/getDate` 로컬 조합)은 되돌리지 않고 유지하기로 결정.

**이유**: 신고된 증상의 직접 원인은 아니었지만, 코드 자체에 자정 근처 시간대(KST 00~09시)에서 재현 가능한 잠재 버그가 실재함. 이미 같은 파일/화면에서 `WeekView.tsx`의 `localTodayStr()`은 이 패턴을 올바르게 구현해뒀던 것과 비교해도 비일관적이었음.

**관련 파일**: `src/db/index.ts` (`currentWeekMonday()`)

---

## 2026-06-22 — Android 뒤로가기: 오버레이 우선 처리를 전역 스택으로 구현

**결정**: 뒤로가기 종료 처리(이슈 #14)를 추가하면서, 바텀시트(DayEditModal·OcrImportModal)와 TimePicker가 열려 있을 때는 뒤로가기가 시트를 닫아야 하고 종료 토스트/종료로 이어지면 안 됨. 각 오버레이 컴포넌트의 state를 App.tsx가 알 필요 없이 처리하기 위해 `src/lib/backHandler.ts`에 전역 콜백 스택(`pushBackHandler` / `consumeBackHandler`)을 도입. 오버레이는 마운트 시 자신의 close 함수를 스택에 push, 언마운트 시 pop. `App.tsx`의 `backButton` 리스너는 `consumeBackHandler()`를 가장 먼저 호출 — true면(오버레이가 있어서 닫혔으면) 종료/네비게이션 로직을 건너뜀.

**이유**: WeekView/SettingsView/DayEditModal에 모달 state가 각각 분산되어 있어, App.tsx가 모든 모달 state를 끌어올리거나 prop으로 내려받지 않고도 "지금 뒤로가기를 가로챌 오버레이가 있는가"를 알아야 했음. 스택 방식이면 DayEditModal 안에서 TimePicker가 열린 중첩 상황도 자연히 처리됨(나중에 mount된 TimePicker가 스택 맨 위라 먼저 소비).

**관련 파일**: `src/lib/backHandler.ts`(신규), `src/App.tsx`, `src/components/DayEditModal.tsx`, `src/components/OcrImportModal.tsx`, `src/components/TimePicker.tsx`

---

## 2026-06-19 — CSS var() fallback 없이 max() 사용 시 0px 문제

**결정**: `--sab` 등 JS로 뒤늦게 주입되는 CSS 변수를 `max()` 안에서 사용할 때는 반드시 `var(--sab, 0px)` 형태로 fallback을 명시.

**이유**: `var(--sab)` (fallback 없음)는 CSS 파서가 해당 커스텀 속성을 아직 정의 전이면 "guaranteed-invalid value"가 됨. `max(36px, calc(22px + invalid))`는 전체 선언이 무효 → `padding-bottom: 0px`으로 처리됨. JS `requestAnimationFrame`이 실행되기 전 첫 렌더에서 이 문제가 발생.

**How to apply**: CSS `max()` / `calc()` 안의 CSS 변수는 항상 `, 0px` 또는 적절한 fallback을 붙인다.

**관련 파일**: `src/index.css` (`.modal padding-bottom`, `.settings__scroll padding-bottom`)

---

## 2026-06-19 — 계획 목표 입력: 숫자(시간) → 출퇴근 시각 피커로 전환

**결정**: DayEditModal의 "이 날 목표시간 (계획)" 입력을 `<input type="number">` (N시간) 방식에서 TimePicker 2개(출근~퇴근)로 교체. 저장값은 기존과 동일하게 `fixedTargetMinutes`(분 정수).

**이유**: 숫자 입력은 "9:20~16:30"처럼 세밀한 출퇴근 시각 기반 목표 설정 불가. 사용자가 요일 규칙(예: 09:30~16:30)에서 출근만 10분 앞당기는 경우를 표현할 수 없음. 출퇴근 시각으로 입력 받으면 `(퇴근-출근)-점심`으로 인정시간을 자동 계산하므로 더 직관적.

**초기값**: `day.fixedTargetManual=true`(이번 주 해제 상태)면 빈값, 아니면 요일 규칙의 `startMin`/`endMin`으로 프리필.

**제한**: 이전에 숫자로 저장된 `fixedTargetMinutes` override는 시각으로 역변환 불가 → 재오픈 시 규칙 시각으로 프리필됨(사용자가 재조정 필요).

**관련 파일**: `src/components/DayEditModal.tsx`

---

## 2026-06-19 — 바텀시트 애니메이션: will-change + backdrop-filter 동시 사용 불가

**결론**: `will-change: transform`과 `backdrop-filter`는 WebKit(Capacitor iOS/Android 포함)에서 동시에 작동하지 않음. `will-change: transform`이 별도 GPU 컴포지팅 레이어를 만들면 그 레이어는 뒤에 있는 픽셀을 "볼 수" 없어서 `backdrop-filter`가 blur 대신 빈 배경을 필터링함 → 애니메이션 중 불투명 하양이다가 끝나면 젖빛 유리로 바뀌는 색상 플래시 발생.

**최종 결정**: `will-change` 제거, `backdrop-filter`는 항상 유지, animation은 easing 커브만 개선 (`0.2s ease` → `0.36s cubic-bezier(0.32, 0.72, 0, 1)`). native sheet와 유사한 감속 커브로 체감 부드러움 확보.

**관련 파일**: `src/index.css` (`.modal` 셀렉터)

---

## 2026-06-19 — 화면 전환 슬라이드: position:absolute 두 뷰 동시 유지 방식

**결정**: 홈↔설정 전환을 조건부 렌더 대신 두 뷰를 동시에 DOM에 유지하고 `position:absolute; inset:0`으로 겹쳐 쌓은 뒤 `transform:translateX()`로 슬라이드.

**구조**: `.app { overflow:hidden }` → `.view-slide--home`(항상 translateX(0)) + `.view-slide--settings`(비활성=translateX(100%), 활성=translateX(0)). CSS `transition: 0.32s cubic-bezier(0.4,0,0.2,1)`.

**설정 패널 배경 필수**: 설정 카드가 glass(backdrop-filter)라 뒤의 홈 화면이 비침 → `.view-slide--settings { background: var(--bg) }`로 홈 완전 차단.

**관련 파일**: `src/App.tsx`, `src/index.css`

---

## 2026-06-19 — 주 이동 슬라이드: key re-mount + @keyframes, overflow:hidden은 week-view에 추가 금지

**결정**: 주 이동 시 `week-content` div에 `key={slideKey}`(증가 카운터)를 부여해 React가 re-mount하도록 유도 → CSS `@keyframes`(translateX ±100%→0) 자동 재생.

**overflow:hidden 추가 금지**: 슬라이드 clip을 위해 `.week-view { overflow:hidden }`을 추가하면 카드 box-shadow가 직선으로 잘리는 버그 재발(이전 이슈와 동일 패턴). `.app__scroll`의 `overflow-y:auto`가 이미 horizontal paint overflow를 clip하므로 불필요. transform 기반 이동은 layout overflow를 만들지 않아 스크롤바도 생기지 않음.

**터치 스와이프**: `onTouchStart`/`onTouchEnd`로 dx/dy 측정 → `|dx| > |dy| && |dx| > 48px`이면 이전/다음 주 이동. 세로 스크롤과 구분.

**관련 파일**: `src/components/WeekView.tsx`, `src/index.css`

---

## 2026-06-18 — 카드 그림자 클리핑: overflow-y:auto + padding 분리 적용

**결정**: `overflow-y: auto` 요소에 `padding` 단축 표기로 `max()+var()` 혼합 시 파싱 실패(computed 0px). `padding-left`/`padding-right`/`padding-bottom` 개별 속성으로 분리해 적용.

**Why**: CSS 파싱 실패는 무음(fallback 없이 0)으로 처리되어 그림자 클리핑이 재현됨. 단축 표기 안에 `max()`, `calc()`, `var()` 여러 함수가 중첩되면 일부 엔진에서 전체 선언을 무시.

**How to apply**: `overflow-y: auto` 스크롤 컨테이너에 복잡한 값이 있는 padding은 단축 표기 대신 개별 속성으로 선언.

## 2026-06-18 — 설정 화면 요일별 목표 입력 방식: input[type=time] → TimePicker pill

**결정**: `<input type="time">` native 입력을 제거하고, DayEditModal과 동일한 `time-pill` 버튼 + `TimePicker` 컴포넌트 방식으로 교체.

**이유**: native time input은 WebView에서 `--:--` 빈 상태, 플레이스홀더 불가, chevron 불가 등 디자인 일치가 구조적으로 불가능. DayEditModal에 이미 동일 패턴이 구현되어 있어 재사용이 자연스러움.

**관련 파일**: `src/components/SettingsView.tsx`, `src/index.css` (`.settings__wd-time`, `.settings__wd-time--empty`)

---

## 2026-06-18 — TimePicker 분 선택 단위: 5분 → 1분

**결정**: `MINS` 배열을 12개(5분 간격) → 60개(1분 간격)로 변경. `parse`에서 `Math.round(m / 5) % 12` → `m` 직접 사용. `format`에서 `mIdx * 5` → `mIdx`. `onScroll` max 11 → 59.

**이유**: 5분 단위는 FLEX 화면에서 정확한 시각(예: 9:03, 18:37 등)을 입력할 수 없음. 1분 단위로 변경해 실제 출퇴근 기록과 일치.

**관련 파일**: `src/components/TimePicker.tsx`

---

## 2026-06-18 — Android 터치 하이라이트·텍스트 선택 제거

**결정**: `* { -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }` 전역 적용. `*:focus { outline: none }` + `*:focus-visible { outline: 2px solid var(--accent) }` 로 키보드 접근성 유지.

**이유**: Android WebView(갤럭시)에서 버튼/카드 터치 시 파란 반투명 영역이 덮임 — `-webkit-tap-highlight-color` 기본값이 파란색. 롱프레스 시 텍스트 선택 컨텍스트메뉴(복사/모두선택/공유)가 뜨는 것도 네이티브 앱처럼 보이지 않음. 데스크톱 브라우저에서는 이 속성이 무의미해 사이드이펙트 없음. input에서 텍스트 선택이 막힐 경우 `input, textarea { user-select: text }` 예외 추가 예정.

**관련 파일**: `src/index.css`

---

## 2026-06-18 — 폰트: IBM Plex Sans KR 로컬 번들 적용

**결정**: `@fontsource/ibm-plex-sans-kr` npm 패키지로 로컬 번들링. `src/main.tsx`에서 400/500/600/700 weight CSS import.

**이유**: Capacitor 앱은 `file://` 프로토콜로 동작해 Google Fonts CDN `@import url(...)` 방식이 네트워크를 타지 않아 폰트 미로드. fontsource는 woff2 파일을 빌드 산출물에 포함시키므로 오프라인/모바일 환경 모두 동작. weight 800은 IBM Plex Sans KR 미지원(최대 700) — 기존 800 선언부는 자동으로 700으로 fallback됨.

**관련 파일**: `src/main.tsx`, `src/index.css`, `package.json`

---

## 2026-06-18 — 설정 화면 OS 뒤로가기 처리

**결정**: Android `backButton` + iOS `popstate` 이벤트 두 갈래로 처리. 설정 진입 시 `history.pushState()`로 히스토리 엔트리 추가 → iOS 엣지 스와이프가 `popstate` 발생 → `setView('week')`. Android는 Capacitor `CapApp.addListener('backButton', ...)`. 두 리스너 모두 `useEffect([view])`에서 등록/해제.  
**이유**: SPA라 네이티브 네비게이션 스택이 없음. iOS WKWebView는 히스토리 엔트리가 있어야 엣지 스와이프가 동작. Android Capacitor `backButton` 이벤트는 기본적으로 앱 종료 동작을 하므로 명시적으로 가로채야 함.  
**관련 파일**: `src/App.tsx`

---

## 2026-06-18 — 수동 테마 전환: data-theme 속성 + localStorage

**결정**: `<html data-theme="light|dark">` 속성으로 OS 설정을 override. CSS에서 `:root[data-theme="dark"]`와 `:root[data-theme="light"]`가 `@media (prefers-color-scheme: dark)`보다 specificity가 높아(0,2,0 vs 0,1,0) 항상 우선 적용. 기존 미디어쿼리는 `:root:not([data-theme="light"])`로 변경해 data-theme="light" 설정 시 OS 다크모드를 무시. 기본값은 `'light'`(localStorage 없을 때).  
**이유**: 디자인 명세 — 기본 라이트, 설정에서 수동 전환. OS 설정 무시가 핵심 요구사항. Capacitor `file://` 환경에서도 localStorage 동작 확인.  
**관련 파일**: `src/index.css`, `src/App.tsx`, `src/components/SettingsView.tsx`

---

## 2026-06-18 — UI 리디자인 2차: PhoneScreen.dc.html 기반 글래스 시스템

**결정**: CSS 변수 시스템 전면 교체 (`--text-primary` 등 → `--text/--glass/--accent` 등 디자인 파일 그대로). 기존 컴포넌트 하위호환을 위해 alias 변수 추가. `input[type=time]` 완전 제거 → 커스텀 휠 스크롤 피커(TimePicker.tsx) 구현. OCR 버튼 `position:fixed` → inline.  
**이유**: 디자인 파일(PhoneScreen.dc.html, 7.9KB)은 직접 읽기 가능. offline 버전(500KB+)은 Base64 이미지로 읽기 불가. `--sheet-solid` 변수가 picker fade gradient에 필수 — 없으면 위아래 페이드가 배경을 비침.  
**관련 파일**: `src/index.css`, `src/App.tsx`, `src/components/TimePicker.tsx`, `src/components/DayEditModal.tsx`, `src/components/DayCard.tsx`, `src/components/WeekHeader.tsx`

---

## 2026-06-17 — 글래스 리디자인 1차: 퍼플 팔레트

**결정**: 파랑(#1677ff) → 퍼플(#6D4BFF) 전체 교체. WeekHeader를 다크 네이비 단색 → 글래스 카드(backdrop-filter blur, CSS 변수 --wh-*)로 전환. 라이트/다크 모두 별도 변수 세트 사용.  
**이유**: Claude Design에서 글래스 리디자인 작업 후 Send to로 전달. DesignSync/WebFetch 로그인 이슈로 파일 직접 파싱 불가 → 스크린샷 기반으로 1차 구현. 디자인과 세부 디테일 불일치 있어 추후 재수정 예정.  
**관련 파일**: `src/index.css`, `src/components/WeekHeader.tsx`

---

## 2026-06-09 — 공휴일 표시 방식 (B방식 확정)

**결정**: 공휴일은 "목표 −8h + 누적 0" 한 방식으로만 처리  
**이유**: "목표 −8h 하면서 동시에 공휴일 8h를 누적에도 더하면" double-subtract가 되어
공휴일 있는 주에 평일 부담이 잘못 줄어드는 버그 발생 (공휴일 1주에 6h/일이 나옴).  
**검증**: 공휴일 1주 → 목표 32h, 평일 32h 채우면 남은 0 = 8h/일 ✓  
**관련 파일**: `src/domain/calc.ts`, `DESIGN.md §1.4`

---

## 2026-06-09 — DB 라이브러리 선택

**결정**: Dexie.js  
**이유**: IndexedDB를 직접 쓰면 비동기 처리가 복잡. Dexie는 Promise 기반 API + React hooks(`dexie-react-hooks`) 제공. 2단계 동기화 붙일 때도 마이그레이션 구조(`version()`) 가 명확함.  
**관련 파일**: `src/db/index.ts`

---

## 2026-06-10 — 공휴일 데이터 조달 전략

**결정**: Google Calendar API + DB캐시(30일) + 정적 fallback 3계층  
**이유**:
- 수동 하드코딩 → 대체공휴일이 매년 달라 실수 위험
- 공공데이터포털 API → 브라우저에서 직접 호출 시 **CORS 차단** 위험. Capacitor(모바일)는 괜찮지만 웹에서 막힘
- Google Calendar API → CORS 허용, 무료, API 키만으로 공개 캘린더 읽기 가능

**동작 방식**: 앱 시작 시 `syncHolidaysInBackground` 백그라운드 호출 → 성공 시 DB 캐시 갱신. 캐시 TTL 30일. 오프라인이면 캐시 사용, 캐시도 없으면 정적 fallback.  
**API 키**: `.env.local`의 `VITE_GOOGLE_CALENDAR_API_KEY` (gitignore됨, 팀 내 공유 필요)  
**캘린더 ID**: `ko.south_korea#holiday@group.v.calendar.google.com`  
**관련 파일**: `src/services/holidaySync.ts`, `src/data/holidays.ts`

---

## 2026-06-10 — 주간 현황 화면 데이터 로딩 패턴

**결정**: `useWeekData` 훅이 진입 시 그 주의 7일치 `DayRecord` 스텁을 **DB에 즉시 생성(upsert)** 하고, 공휴일 여부는 그때 `resolveHoliday`로 판정해 레코드에 **baked-in** 한다. 리로드는 `version` 카운터 증가로 트리거.  
**이유**:
- 빈 DB 첫 로드 시 주/일 레코드가 없으면 화면이 비거나 깨짐 → get-or-create가 필수
- 공휴일 플래그를 매 렌더마다 재조회하지 않고 레코드에 박아두면, 저장(`upsertDay`) 후 리로드해도 기존 레코드를 다시 읽을 뿐 공휴일 재판정을 안 함 → **모달에서 공휴일 토글 시 day 레코드의 `isHoliday`를 직접 갱신**해야 함 (override만 쓰면 반영 안 됨). DayEditModal이 둘 다 기록하는 이유.
- 날짜 계산은 calc.ts와 동일하게 UTC 기준 유틸 재사용 (로컬 Date 산술 금지 — 경계일 off-by-one 방지)

**관련 파일**: `src/hooks/useWeekData.ts`, `src/components/WeekView.tsx`, `src/components/DayEditModal.tsx`

---

## 2026-06-10 — 일 입력 모달 범위 (실적만, 고정목표 보류)

**결정**: DayEditModal은 **실적(`recognizedMinutes`)** + 공휴일 토글만 입력. **미래 계획값(`fixedTargetMinutes`)은 의도적으로 다음 작업으로 미룸.**  
**이유**: 우선순위 항목이 "유형 선택 + 시각 입력"(실적)이고, 역산 핵심값인 `avgNeededPerPendingDay`는 고정목표 없이도 동작. 모달 1차 범위를 일상적 입력(매일 출퇴근 기록)에 집중. 고정목표 입력 UI는 역산 정확도 향상이 필요할 때 추가.  
**관련 파일**: `src/components/DayEditModal.tsx`, `memory/implementation_status.md`(다음 작업 3번)

---

## 2026-06-10 — 요일별 목표 규칙: 출퇴근 시각 기반 설계

**결정**: `weekdayTargets`에 `{ startMin, endMin }` (WeekdayRule) 저장. 인정시간은 `recognizedFromSegments`로 렌더 타임에 계산. 홈 화면 override는 `fixedTargetMinutes`(분)으로 저장(시각 없이).  
**이유**:
- "N시간" 숫자 대신 출퇴근 시각을 저장하면 UI가 직관적 (실제 일정처럼 보임)
- 인정시간 = 클락 − 점심. 저장 시 계산하면 lunchMinutes 설정 변경 시 불일치. 렌더 타임 계산으로 항상 최신값 사용.
- 홈 화면 override는 "이번 주 이 날만" 이므로 시각 불필요 — 분만 저장해 단순화.
- `effectiveTarget()` 한 함수가 { minutes, startMin?, endMin? } 리턴 → DayCard·WeekHeader가 출퇴근 시각 조건부 표시.

**관련 파일**: `src/domain/types.ts`(WeekdayRule), `src/domain/calc.ts`(effectiveTarget), `src/components/SettingsView.tsx`, `src/components/DayCard.tsx`, `src/components/WeekHeader.tsx`

---

## 2026-06-11 — 반차 분리 + 휴게 차감 명시화

**결정**: `halfday` → `halfday-am` / `halfday-pm` 분리. `Segment`에 `lunchExcluded?: boolean` 추가. 기존 `halfday` 레거시 데이터는 타입 유니온에 유지(위치 기반 자동 판단 레거시 경로).

**오전반차+근무 점심 규칙**: 오전반차 `lunchExcluded=true`면 점심을 "흡수" → 같은 날 근무 구간에서 별도 차감 없음. 오전반차(09:00~14:00) + 오후근무(14:00~18:30) = 240+270 = **510분** (FLEX 실데이터와 일치).

**DayCard 배지 수정**: 기존에 `recognizedMinutes != null`이면 무조건 "휴게 1시간 제외" 배지 표시하던 것을 `wasLunchDeducted(segments)` 실제 차감 여부로 변경. 오후반차만 있는 날은 배지 안 뜸.

**관련 파일**: `src/domain/types.ts`, `src/domain/calc.ts`(wasLunchDeducted), `src/components/DayEditModal.tsx`, `src/components/DayCard.tsx`

---

## 2026-06-10 — 주 이동 네비게이션 구조

**결정**: 현재 주 월요일(`currentWeekMonday()`)을 `useMemo`로 고정하던 것을 `monday` **state**로 전환. `thisMonday`(이번 주 기준값)는 별도 memo로 유지해 "오늘로" 복귀와 "이번 주" 라벨 판정에 사용. nav 바(‹/›/오늘로)는 `loading` early-return **바깥**에 두어 주 전환 시에도 항상 보이게 함.  
**이유**:
- 주 전환은 `setMonday(m => addDays(m, ±7))` 한 줄. UTC 기준 `addDays` 재사용(로컬 Date 산술 금지 원칙 유지).
- nav를 loading 분기 안에 두면 주를 넘길 때마다 "불러오는 중"이 통째로 화면을 덮어 nav까지 사라짐 → 깜빡임/연타 불가. 그래서 nav는 항상 렌더하고 헤더+리스트 영역만 로딩 표시로 교체.
- `today` 강조는 실제 오늘 날짜 기준이라 다른 주를 보면 자연히 강조 없음(의도된 동작).

**관련 파일**: `src/components/WeekView.tsx`, `src/index.css`(`.week-nav`)

---

## 2026-06-11 — 퇴근 역산: remainingMinutes 보정 (lastDayFixed 재가산)

**결정**: `WeekHeader`에서 `calcLastDayDeparture`에 넘기는 remaining = `summary.remainingMinutes + effectiveFixedTarget(lastDay)`.

**이유**: `summarizeWeek`의 `remainingMinutes = goal - recognized - totalFixed`에는 마지막 날 자신의 고정목표도 차감된다. 이 값을 그대로 퇴근 역산에 쓰면, "마지막 날에 얼마나 일해야 하나"에서 이미 빠진 몫을 또 빼는 이중 차감이 된다. → 마지막 날 고정목표만큼 출발 시각이 앞당겨지는 버그(12:55가 17:55가 되어야 할 상황에서 일찍 나옴). 보정 후 `summary.remainingMinutes + lastDayFixed`가 곧 "마지막 날에 필요한 실근무 분".

**관련 파일**: `src/components/WeekHeader.tsx`

---

## 2026-06-11 — CSS 변수 전환으로 다크모드 통합 관리

**결정**: 하드코딩된 색상값을 `:root` CSS 변수로 전환. 다크모드는 `@media (prefers-color-scheme: dark) { :root { ... } }` 방식으로 변수 재정의.

**이유**: 기존 방식(개별 selector마다 다크 override 추가)은 새 컴포넌트 추가 시 다크 override를 누락하면 라이트 색상이 그대로 노출됨. 설정 화면에서 `.settings__hint`, `.settings__unit` 등이 누락되어 희멀건 색상으로 표시되는 문제가 발생. 변수 방식으로 전환하면 변수만 정의하면 자동 반영.

**변수 분류**: 중립 색상(bg-base/card/subtle/elevated/input, border, text), 상태 색상(today/done/fixed/holiday), 레이블 색상, 상태 메시지 색상 (~25개).

**week-header 예외**: `.week-header`는 라이트/다크 모두 어두운 배경(#1a1a2e/#0d0d1a)을 사용하는 의도적 설계라 변수 미적용, 별도 dark override 유지.

**관련 파일**: `src/index.css`

---

## 2026-06-11 — OCR: Tesseract.js 한국어 인식 전략

**결정**: `kor+eng` 언어팩, 배지(인정시간) 값만 신뢰(배지 신뢰 원칙). 출퇴근 시각은 segment 보조 데이터로만 저장.

**실측 결과**:
- 주 범위(`6.1-6.7`), 인정시간 배지(`8시간57분`), 공휴일명(`지방 선거일`), 구간 상세(`9시간 57분ㆍ근무(판교 오피스)`) — 정확 인식
- 요일(`화`→`5}`, `목`→`_`): 완전히 깨짐 → 주 범위 + 날짜 숫자로 요일 계산
- `오전` → `2M`/`aM`으로 깨짐 → 오후(`오후`)가 아닌 시각은 오전으로 처리
- 일부 날 배지 숫자가 `?`로 치환(`?시간 42분`) → `recognizedMinutes: null` 처리, ⚠️ 표시 후 수동 입력

**설계 선택**: 여러 장 이미지 → 각각 OCR → dayOfMonth 기준 병합. 같은 날 중복 시 인정시간 있는 쪽 우선. 저장 시 `source: 'ocr'` 마킹.

**관련 파일**: `src/services/flexOcr.ts`, `src/components/OcrImportModal.tsx`

---

## 2026-06-11 — 퇴근 역산: 부분 입력(출근만) segments 보존

**결정**: DayEditModal에서 출근만 입력하고 퇴근은 비워도 segments를 DB에 보존(recognizedMinutes=null 유지). 기존에는 완전 입력(출퇴근 둘 다)이 없으면 segments를 `[]`로 초기화했음.

**이유**: 퇴근 역산 배너(`calcLastDayDeparture`)는 마지막 근무가능일의 `segments`에서 `clockInMin`을 읽는다. 부분 입력을 버리면 사용자가 출근을 찍어도 배너가 절대 뜨지 않는다.

**주의**: `liveRecognized` 미리보기는 endMin=null이면 `-60분(-1시간)`으로 나왔는데, 부분 입력 감지 시 "퇴근 입력 후 계산"으로 대체 표시.

**관련 파일**: `src/components/DayEditModal.tsx`(hasPartialInput), `src/components/WeekHeader.tsx`, `src/domain/calc.ts`(lastWorkableDay, calcLastDayDeparture)

---

## 2026-06-15 — Capacitor OAuth 딥링크 패턴

**결정**: 네이티브 앱에서 Google OAuth `redirectTo`를 `com.timerge.app://`(커스텀 스킴)으로 설정. 웹에서는 기존대로 `window.location.origin`.

**이유**: Capacitor WebView 안에서 OAuth 완료 후 `localhost`로 리다이렉트되면 서버가 없어 ERR_CONNECTION_REFUSED 발생. 커스텀 스킴을 쓰면 Android intent-filter가 가로채서 앱을 다시 열고, `appUrlOpen` 이벤트로 `#access_token=...` 해시를 추출해 `supabase.auth.setSession()` 호출.

**필수 설정**: Supabase Dashboard → Authentication → URL Configuration → Redirect URLs에 `com.timerge.app://` 추가 필요.

**관련 파일**: `src/services/auth.ts`(OAUTH_REDIRECT), `src/App.tsx`(appUrlOpen 리스너), `android/app/src/main/AndroidManifest.xml`(intent-filter)

---

## 2026-06-15 — 앱 이름: Clokoo → 2026-06-17 Timerge로 복귀

**결정**: 앱 이름을 **Timerge**로 사용. 패키지 ID `com.timerge.app`.

**이유**:
- Clokoo로 변경했으나 팀 논의 후 원래 이름 Timerge로 복귀 결정.
- App Store에 동일 이름 macOS 앱이 있다는 우려가 있었으나, 카테고리·플랫폼이 다르고 브랜드 충돌 우려보다 팀 아이덴티티 유지가 더 중요하다고 판단.
- GitHub 레포명(timerge)과 앱 이름이 다시 일치하게 됨.

**관련 이슈**: #7

---

## 2026-06-16 — Safe Area 상단 여백: calc(1rem + env(safe-area-inset-top)) 유지

**결정**: 상단 Safe Area 패딩을 `env(safe-area-inset-top)` 단독이 아닌 `calc(1rem + env(safe-area-inset-top))`으로 적용. 기존 `.app { padding: 1rem }` 위에 덮는 방식.

**이유**: 순수 `env(safe-area-inset-top)` 단독이면 상태바 바로 아래 헤더가 너무 바짝 붙어 보일 수 있음. 실기기에서 확인 결과 다른 앱들과 상단 여백이 비슷한 수준으로 판단돼 1rem 기본 패딩을 그대로 유지.

**관련 파일**: `src/index.css`(.app), `index.html`(viewport-fit=cover)

---

## 2026-06-16 — recognizedFromSegments 점심 차감 방어 조건 추가

**결정**: 레거시 점심 차감 경로(`hasExplicitLunch === false`)에서 `work.length > 0` 조건 대신 `workDuration > 0` (실제 근무 시간 합산값)을 조건으로 사용.

**이유**: 설정에서 요일별 목표 시작·종료 시각을 동일하게 설정하면 `minutesBetween(x, x) = 0`이라 근무 시간이 0분인데, 기존 조건(`work.length > 0`)은 세그먼트 존재 여부만 보므로 무조건 60분 차감 → `0 - 60 = -60분(-1시간)` 표시 버그 발생. `workDuration`을 직접 합산해 실제 시간이 0이면 차감 스킵.

**관련 파일**: `src/domain/calc.ts`(recognizedFromSegments, 레거시 else 분기)

---

## 2026-06-17 — 헤더 고정: position:sticky → flex 레이아웃으로 전환

**결정**: 홈/설정 헤더 고정을 `position: sticky` 대신 **flex 컬럼 레이아웃**으로 구현. `html/body/#root { height: 100% }`, `.app { display: flex; flex-direction: column }`, 콘텐츠 영역은 `.app__scroll / .settings__scroll { flex: 1; overflow-y: auto }`.

**이유**: Android WebView에서 `position: sticky`가 신뢰할 수 없음 — 스크롤 컨테이너 판정 방식이 브라우저와 달라 무시되는 경우가 있음. 프리뷰 웹에서는 잘 됐지만 실기기에선 동작 안 함. flex + overflow 방식은 모바일 WebView에서 100% 안정적.

**관련 파일**: `src/index.css`(.app, .app__scroll, .settings, .settings__scroll, .settings__header, .app-header), `src/App.tsx`, `src/components/SettingsView.tsx`

---

## 2026-06-17 — Safe Area 하단 여백: --sab CSS 변수 + JS probe + Android 56px fallback

**결정**: `env(safe-area-inset-bottom)` 단독 대신 CSS 변수 `--sab`를 도입. JS probe로 실측 후 주입하고, Android에서 측정값이 20px 미만이면 56px로 강제.

**3계층 방어**:
1. `MainActivity.java`에 `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)` 명시 → Android WebView가 window inset을 받도록
2. `App.tsx`의 `applySafeAreaBottom()`: 보이지 않는 div로 `env(safe-area-inset-bottom)` 실측 → `--sab` CSS 변수로 주입. Android에서 0이면 56px fallback.
3. CSS 전체에서 `env(safe-area-inset-bottom)` → `var(--sab)` 교체. `.settings__scroll`은 `max(4rem, calc(2rem + var(--sab)))` — 최소 패딩 보장.

**이유**: Galaxy Fold(Android 15 edge-to-edge 강제) + Capacitor WebView 조합에서 `env(safe-area-inset-bottom)`이 0을 반환하는 경우 발생. `WindowCompat`만으로 해결 안 됨.

**주의**: CSS에 `--sab: var(--sab)` 자기참조 선언이 있어도(린터가 만든 것) JS inline style이 우선하므로 런타임 동작은 정상.

**남은 한계**: 설정 화면은 스크롤 끝까지 내리면 시스템 바와 겹침 없음. 중간 스크롤 위치에서는 마지막 항목이 바 위에 보일 수 있음(사용자 수용).

**관련 파일**: `android/app/src/main/java/com/timerge/app/MainActivity.java`, `src/App.tsx`(applySafeAreaBottom), `src/index.css`(--sab 전체)

---

## 2026-06-15 — Phase 2 백엔드: Supabase 선택 + 카카오 보류

**결정**: 백엔드 플랫폼으로 Supabase 선택. 카카오 OAuth는 구현했으나 비활성화, Google OAuth만 운영.

**이유**:
- Supabase: 기존 Dexie 스키마(weeks/days/settings/holiday_overrides)가 Postgres 테이블로 1:1 매핑. RLS로 유저별 데이터 격리. 사용자가 이미 경험 있어 선택.
- 카카오: 이메일(`account_email`) 수집이 비즈앱 심사 필요 항목. 사업자등록증 + 배포된 서비스 URL + 개인정보처리방침 필요 → 앱스토어 출시 시점에 재신청 예정.
- 동기화 전략: last-write-wins(`updated_at` 타임스탬프 비교). 로컬 Dexie가 primary store(오프라인 완전 동작), 온라인 복귀 시 `syncAll()` 자동 실행.

**관련 파일**: `src/lib/supabase.ts`, `src/services/auth.ts`, `src/services/sync.ts`, `src/components/AuthSection.tsx`
