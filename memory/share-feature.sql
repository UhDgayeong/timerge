-- 공유 기능: Supabase SQL 에디터에서 실행
-- settings 테이블에 컬럼 추가 + 공개 RPC 함수 1개만 anon에 공개 (weeks/days 테이블 자체는 그대로 비공개)

alter table public.settings
  add column if not exists share_token uuid,
  add column if not exists share_display_name text;

create unique index if not exists settings_share_token_idx
  on public.settings (share_token)
  where share_token is not null;

create or replace function public.get_shared_week(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_display_name text;
  v_today date;
  v_week record;
  v_days json;
  v_settings record;
begin
  select user_id, share_display_name into v_user_id, v_display_name
  from public.settings
  where share_token = p_token;

  if v_user_id is null then
    return null;
  end if;

  if v_display_name is null or v_display_name = '' then
    select coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')
    into v_display_name
    from auth.users
    where id = v_user_id;
  end if;

  v_today := (now() at time zone 'Asia/Seoul')::date;

  select * into v_week
  from public.weeks
  where user_id = v_user_id
    and start_date <= v_today
    and end_date >= v_today
  order by start_date desc
  limit 1;

  if v_week.id is null then
    select * into v_week
    from public.weeks
    where user_id = v_user_id
    order by start_date desc
    limit 1;
  end if;

  if v_week.id is null then
    return json_build_object(
      'displayName', v_display_name,
      'week', null,
      'days', '[]'::json,
      'settings', null
    );
  end if;

  select json_agg(d) into v_days
  from (
    select id, date, recognized_minutes, fixed_target_minutes, fixed_target_manual,
           is_holiday, holiday_name, segments
    from public.days
    where week_id = v_week.id
    order by date
  ) d;

  select daily_standard_minutes, lunch_minutes, weekday_targets, core_time_start, core_time_end
  into v_settings
  from public.settings
  where user_id = v_user_id;

  return json_build_object(
    'displayName', v_display_name,
    'week', json_build_object(
      'id', v_week.id,
      'startDate', v_week.start_date,
      'endDate', v_week.end_date,
      'baseGoalMinutes', v_week.base_goal_minutes
    ),
    'days', coalesce(v_days, '[]'::json),
    'settings', json_build_object(
      'dailyStandardMinutes', v_settings.daily_standard_minutes,
      'lunchMinutes', v_settings.lunch_minutes,
      'weekdayTargets', v_settings.weekday_targets,
      'coreTimeStart', v_settings.core_time_start,
      'coreTimeEnd', v_settings.core_time_end
    )
  );
end;
$$;

revoke all on function public.get_shared_week(uuid) from public;
grant execute on function public.get_shared_week(uuid) to anon;
grant execute on function public.get_shared_week(uuid) to authenticated;
