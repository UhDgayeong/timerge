---
name: holiday-data-approach
description: "공휴일 데이터를 Google Calendar API로 가져오는 이유 및 3계층 fallback 구조"
metadata:
  type: project
---

## 왜 Google Calendar API인가

공휴일 데이터 조달 방법을 검토한 결과:

| 방식 | 탈락 이유 |
|---|---|
| 수동 하드코딩 | 대체공휴일이 연도마다 달라 실수 위험 |
| 공공데이터포털 API (런타임) | 브라우저에서 직접 호출 시 **CORS 차단** 가능성 |
| 공공데이터포털 API (빌드 타임) | 새 연도마다 재빌드 필요, API 키 관리 부담 |
| **Google Calendar API** | CORS 허용, 무료, OAuth 없이 API 키만으로 공개 캘린더 읽기 가능 |

Google Calendar의 한국 공휴일 캘린더 ID: `ko.south_korea#holiday@group.v.calendar.google.com`

API 키는 `.env.local`에 `VITE_GOOGLE_CALENDAR_API_KEY`로 저장 (gitignore됨).

## 3계층 fallback 구조

```
1순위: DB 캐시 (IndexedDB, 30일 TTL)
  └ 유효하면 네트워크 요청 없이 즉시 반환

2순위: Google Calendar API 호출
  └ 성공하면 DB에 캐시 후 반환

3순위: 정적 fallback (src/data/holidays.ts)
  └ 네트워크도 없고 캐시도 없을 때 사용
  └ 출처: superkts.com (2025.01 기준), 2025~2027 커버
```

앱 시작 시 `syncHolidaysInBackground([올해, 내년])`을 호출해 백그라운드 동기화.
캐시가 이미 유효하면 건너뜀. 실패해도 조용히 무시.

## HolidayOverride 우선순위

`resolveHoliday(date)` 함수에서 HolidayOverride(유저 수동 토글)가 최우선.
공휴일 데이터보다 유저 설정이 항상 이긴다.

**Why:** 회사마다 쉬는 날이 다를 수 있고(대체 근무, 자체 휴무 등), 유저가 명시적으로 토글한 것은 어떤 데이터보다 신뢰해야 함.
