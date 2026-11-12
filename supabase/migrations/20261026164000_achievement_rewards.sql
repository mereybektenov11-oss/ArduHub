-- G15: bounded, one-time spark rewards. Existing balances and receipts are retained.
create table public.user_achievements (
 user_id uuid not null references auth.users(id) on delete cascade,
 achievement_id text not null check(achievement_id in ('first-light','light-bearer','seven-days','perfect','check-master','inventor','buyer','mentor-friend','speed','explorer','electrician','weekly-best')),
 unlocked_at timestamptz not null default now(),
 awarded_at timestamptz,
 primary key(user_id,achievement_id)
);
alter table public.user_achievements enable row level security;
grant select on public.user_achievements to authenticated;
create policy achievement_owner_read on public.user_achievements for select to authenticated using((select auth.uid())=user_id);

-- Only trusted server producers may append action evidence. Client progress JSON
-- is never accepted as proof of a paid mentor answer or a game result.
create table private.achievement_events (
 seq bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 event_id uuid not null,
 kind text not null check(kind in ('mentor','blitz','topic')),
 correct boolean,
 topic text check(topic in ('leds','buttons','sensors','motors','display','projects')),
 created_at timestamptz not null default now(),
 unique(user_id,event_id)
);
revoke all on private.achievement_events from public,anon,authenticated;

create function private.achievement_evidence_data(p_uid uuid,p_data jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare stats jsonb; run integer:=0; best integer:=0; attempt record;
begin
 for attempt in select correct from private.achievement_events where user_id=p_uid and kind='blitz' order by seq loop
  run:=case when attempt.correct then run+1 else 0 end; best:=greatest(best,run);
 end loop;
 stats:=jsonb_build_object(
  'projectIds',coalesce((select jsonb_agg(id::text) from public.projects where user_id=p_uid),'[]'::jsonb),
  'mentorQuestionIds',coalesce((select jsonb_agg(event_id::text) from private.achievement_events where user_id=p_uid and kind='mentor'),'[]'::jsonb),
  'blitzBest',best,
  'activityDates',coalesce((select jsonb_agg(distinct (e.created_at at time zone p.timezone)::date) from public.xp_events e join public.profiles p on p.id=e.user_id where e.user_id=p_uid),'[]'::jsonb),
  'topics',coalesce((select jsonb_agg(distinct topic) from private.achievement_events where user_id=p_uid and topic is not null),'[]'::jsonb));
 return jsonb_set(coalesce(p_data,'{}'::jsonb),'{achievementStats}',stats,true);
end;$$;
revoke all on function private.achievement_evidence_data(uuid,jsonb) from public,anon,authenticated;

create function private.achievement_rank(p_uid uuid) returns bigint
language sql stable security definer set search_path='' as $$
 with scores as (select user_id,sum(amount) xp from public.xp_events where created_at>=date_trunc('week',now()) group by user_id),
 ranked as (select s.user_id,row_number() over(order by s.xp desc,p.id) place from scores s join public.profiles p on p.id=s.user_id where not p.hide_from_leaderboard)
 select place from ranked where user_id=p_uid;
$$;
revoke all on function private.achievement_rank(uuid) from public,anon,authenticated;

-- Retain once-only notification state across stale-device saves. Claim state is
-- rebuilt from server receipts; a client cannot assert that sparks were paid.
create function private.preserve_achievements() returns trigger
language plpgsql security definer set search_path='' as $$
declare previous jsonb:=case when tg_op='UPDATE' then old.data else '{}'::jsonb end; merged jsonb; key text; ids jsonb;
begin
 merged:='{}'::jsonb;
 foreach key in array array['unlocked','notified'] loop
  select coalesce(jsonb_agg(distinct value),'[]'::jsonb) into ids from (
   select value from jsonb_array_elements_text(case when jsonb_typeof(previous#>array['achievements',key])='array' then previous#>array['achievements',key] else '[]'::jsonb end)
   union select value from jsonb_array_elements_text(case when jsonb_typeof(new.data#>array['achievements',key])='array' then new.data#>array['achievements',key] else '[]'::jsonb end)
   union select achievement_id from public.user_achievements where user_id=new.user_id and key='unlocked'
  ) s where value=any(array['first-light','light-bearer','seven-days','perfect','check-master','inventor','buyer','mentor-friend','speed','explorer','electrician','weekly-best']);
  merged:=jsonb_set(merged,array[key],ids,true);
 end loop;
 select coalesce(jsonb_agg(achievement_id),'[]'::jsonb) into ids from public.user_achievements where user_id=new.user_id and awarded_at is not null;
 merged:=jsonb_set(merged,'{claimed}',ids,true);
 new.data:=jsonb_set(new.data,'{achievements}',merged,true);
 return new;
end;$$;
revoke all on function private.preserve_achievements() from public,anon,authenticated;
create trigger preserve_achievements before insert or update of data on public.progress for each row execute function private.preserve_achievements();

create function private.achievement_eligible(p_id text,p_data jsonb,p_inventory jsonb,p_weekly_rank bigint,p_today date default current_date) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare n integer; own jsonb; verified jsonb; done_ids text[]:='{}'; perfect_count integer:=0; done_topics text[]:='{}';
 topic_names text[]:=array['leds','leds','buttons','leds','leds','sensors','leds','projects','display','motors','sensors','display'];
 total_days integer; last_day date; active_day date;
begin
 for n in 1..12 loop
  own:=p_data#>array['lessons','lesson-'||n];
  verified:=private.lesson_stages(own,private.lesson_answer_keys()->('lesson-'||n));
  exit when own->>'status' is distinct from 'done' or verified->>'practice' is distinct from 'true';
  done_ids:=array_append(done_ids,'lesson-'||n); done_topics:=array_append(done_topics,topic_names[n]);
  if own->>'attempts'='1' and own->>'bestErrors'='0' then perfect_count:=perfect_count+1; end if;
 end loop;
 case p_id
 when 'first-light' then return 'lesson-1'=any(done_ids);
 when 'light-bearer' then return done_ids@>array['lesson-1','lesson-2','lesson-4','lesson-5','lesson-7'];
 when 'perfect' then return perfect_count>=1;
 when 'check-master' then return perfect_count>=5;
 when 'electrician' then return cardinality(done_ids)>=10;
 when 'buyer' then return jsonb_array_length(coalesce(p_inventory,'[]'))>0;
 when 'inventor' then return jsonb_array_length(coalesce(p_data#>'{achievementStats,projectIds}','[]'))>0;
 when 'mentor-friend' then return (select count(distinct value) from jsonb_array_elements_text(coalesce(p_data#>'{achievementStats,mentorQuestionIds}','[]')))>=10;
 when 'speed' then return coalesce((p_data#>>'{achievementStats,blitzBest}')::integer,0)>=10;
 when 'explorer' then
  select array_agg(distinct value) into done_topics from (select unnest(done_topics) as value union select jsonb_array_elements_text(coalesce(p_data#>'{achievementStats,topics}','[]'))) q;
  return done_topics@>array['leds','buttons','sensors','motors','display','projects'];
 when 'seven-days' then
  -- Only real, server-timestamped XP activity counts. Frozen/client dates do not
  -- manufacture an active day; an already-earned receipt remains permanent.
  total_days:=0; last_day:=null;
  for active_day in select distinct value::date from jsonb_array_elements_text(coalesce(p_data#>'{achievementStats,activityDates}','[]')) where value::date<=p_today order by value::date desc loop
   if last_day is null then
    if p_today-active_day not between 0 and 1 then return false; end if;
   elsif last_day-active_day<>1 then exit;
   end if;
   total_days:=total_days+1; last_day:=active_day;
   if total_days>=7 then return true; end if;
  end loop;
  return false;
 when 'weekly-best' then return p_weekly_rank between 1 and 3;
 else return false;
 end case;
exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or invalid_parameter_value then return false;
end;$$;
revoke all on function private.achievement_eligible(text,jsonb,jsonb,bigint,date) from public,anon;

-- Capture achieved conditions on saved evidence, so an earned streak/ranking is
-- retained when its temporary condition ends. Clients cannot write these rows.
create function private.capture_achievements() returns trigger language plpgsql security definer set search_path='' as $$
declare own public.profiles; id text; place bigint; evidence jsonb;
begin
 select * into own from public.profiles where profiles.id=new.user_id;
 place:=private.achievement_rank(new.user_id);
 evidence:=private.achievement_evidence_data(new.user_id,new.data);
 foreach id in array array['first-light','light-bearer','seven-days','perfect','check-master','inventor','buyer','mentor-friend','speed','explorer','electrician','weekly-best'] loop
  if coalesce(private.achievement_eligible(id,evidence,own.inventory,place,(now() at time zone own.timezone)::date),false) then
   insert into public.user_achievements(user_id,achievement_id) values(new.user_id,id) on conflict do nothing;
  end if;
 end loop;
 return new;
end;$$;
revoke all on function private.capture_achievements() from public,anon,authenticated;
create trigger capture_achievements after insert or update of data on public.progress for each row execute function private.capture_achievements();

-- Privilege is needed only to atomically update the owner's server-managed balance.
-- The caller supplies an identifier, never a reward amount or recipient.
create function private.claim_achievement(p_achievement_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); own public.profiles; data jsonb; place bigint; inserted integer;
begin
 if uid is null then raise exception 'unauthorized'; end if;
 select * into strict own from public.profiles where id=uid for update;
 if exists(select 1 from public.user_achievements where user_id=uid and achievement_id=p_achievement_id and awarded_at is not null) then return jsonb_build_object('claimed',false,'sparks',own.sparks); end if;
 data:=private.achievement_evidence_data(uid,coalesce((select p.data from public.progress p where user_id=uid),'{}'::jsonb));
 if p_achievement_id='weekly-best' then place:=private.achievement_rank(uid); end if;
 if not exists(select 1 from public.user_achievements where user_id=uid and achievement_id=p_achievement_id) and not coalesce(private.achievement_eligible(p_achievement_id,data,own.inventory,place,(now() at time zone own.timezone)::date),false) then raise exception 'achievement_locked'; end if;
 insert into public.user_achievements(user_id,achievement_id) values(uid,p_achievement_id) on conflict do nothing;
 update public.user_achievements set awarded_at=now() where user_id=uid and achievement_id=p_achievement_id and awarded_at is null;
 get diagnostics inserted=row_count;
 if inserted=1 then update public.profiles set sparks=sparks+5 where id=uid returning sparks into own.sparks; end if;
 return jsonb_build_object('claimed',inserted=1,'sparks',own.sparks);
end;$$;
create function public.claim_achievement(achievement_id text) returns jsonb language sql security invoker set search_path='' as $$select private.claim_achievement(achievement_id);$$;
revoke all on function private.claim_achievement(text),public.claim_achievement(text) from public,anon;
grant execute on function private.claim_achievement(text),public.claim_achievement(text) to authenticated;

-- Producer contract: call only after a server-confirmed mentor response or a
-- validated game answer. Never proxy arbitrary browser-submitted facts here.
create function public.record_achievement_event(target_user uuid,event_id uuid,event_kind text,event_correct boolean default null,event_topic text default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 if event_kind not in ('mentor','blitz','topic') or (event_kind='blitz' and event_correct is null) then raise exception 'bad_event'; end if;
 insert into private.achievement_events(user_id,event_id,kind,correct,topic) values(target_user,event_id,event_kind,event_correct,event_topic) on conflict on constraint achievement_events_user_id_event_id_key do nothing;
 -- Captures newly earned receipts through the existing trigger without changing progress.
 update public.progress set data=data where user_id=target_user;
end;$$;
revoke all on function public.record_achievement_event(uuid,uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.record_achievement_event(uuid,uuid,text,boolean,text) to service_role;

-- Persist the first-project right at creation, even if that project is later deleted.
create function private.capture_project_achievement() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.user_achievements(user_id,achievement_id) values(new.user_id,'inventor') on conflict do nothing;
 return new;
end;$$;
revoke all on function private.capture_project_achievement() from public,anon,authenticated;
create trigger capture_project_achievement after insert on public.projects for each row execute function private.capture_project_achievement();
