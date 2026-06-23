-- authenticated 롤에 테이블 권한이 빠져 있어 모든 동기화가 403으로 막혀 있던 문제 수정
-- (RLS 정책과는 별개로 테이블 자체에 GRANT가 있어야 함)

grant select, insert, update, delete
  on public.weeks, public.days, public.holiday_overrides, public.settings
  to authenticated;
