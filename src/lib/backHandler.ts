// 바텀시트/오버레이가 열려 있을 때 Android 뒤로가기를 "닫기"로 처리하기 위한 스택.
// 가장 마지막에 등록된(=가장 위에 떠 있는) 오버레이가 뒤로가기를 가져간다.
const stack: Array<() => void> = []

export function pushBackHandler(close: () => void) {
  stack.push(close)
  return () => {
    const idx = stack.indexOf(close)
    if (idx !== -1) stack.splice(idx, 1)
  }
}

// true를 반환하면 오버레이가 닫혔으므로 앱 종료 로직 등 다음 처리를 건너뛴다.
export function consumeBackHandler(): boolean {
  const close = stack[stack.length - 1]
  if (!close) return false
  close()
  return true
}
