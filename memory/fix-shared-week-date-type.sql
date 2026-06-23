-- get_shared_week: weeks.start_date/end_date가 text 컬럼이라 date와 직접 비교하면 타입 에러 발생.
-- v_today를 text로 바꿔 비교하도록 수정 (ISO 형식 "YYYY-MM-DD"는 문자열 비교로도 날짜순과 동일).

create or replace function public.get_shared_week(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_display_name text;
  v_today text;
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

  v_today := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD');

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
