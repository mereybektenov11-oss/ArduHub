-- Extend reward types without changing existing events or balances.
alter table public.xp_events drop constraint xp_events_source_check;
alter table public.xp_events add constraint xp_events_source_check check(source in ('lesson','lesson_quiz','mission','game'));
create or replace function private.award(p_source text,p_ref_id text,p_amount integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); profile public.profiles; today date; total integer; perfect boolean:=false; local_progress jsonb; awarded integer; quiz_lesson text; quiz_question text; quiz_answer integer; answer_key jsonb := '{"lesson-1":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2},"lesson-2":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-3":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-4":{"q1":0,"q2":2,"q3":1,"q4":0,"q5":2,"q6":1},"lesson-5":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-6":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2},"lesson-7":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-8":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2},"lesson-9":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-10":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2},"lesson-11":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-12":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2}}'::jsonb;
begin
 if uid is null then raise exception 'unauthorized'; end if;
 if p_source not in ('lesson','lesson_quiz','mission','game') or p_ref_id is null or char_length(p_ref_id)>100 or p_amount is null or p_amount<1 or p_amount>100 then raise exception 'bad_request'; end if;
 select * into strict profile from public.profiles where id=uid for update;
 today:=(now() at time zone profile.timezone)::date;
 if exists(select 1 from public.xp_events where user_id=uid and source=p_source and ref_id=p_ref_id) then raise exception 'already_awarded'; end if;
 select coalesce(sum(amount),0) into total from public.xp_events where user_id=uid and (created_at at time zone profile.timezone)::date=today;
 if total+p_amount>500 then raise exception 'daily_cap'; end if;
 if p_source='lesson' then
  if p_ref_id !~ '^lesson-([1-9]|1[0-2])$' then raise exception 'bad_request'; end if;
  awarded:=30;
  if p_amount<>awarded then raise exception 'bad_request'; end if;
  select data into local_progress from public.progress where user_id=uid;
  if coalesce(local_progress#>>array['lessons',p_ref_id,'status'],'')<>'done' then raise exception 'bad_request'; end if;
  perfect:=coalesce((local_progress#>>array['lessons',p_ref_id,'attempts'])::integer,0)=1 and coalesce((local_progress#>>array['lessons',p_ref_id,'bestErrors'])::integer,99)=0;
 elsif p_source='lesson_quiz' then
  if p_ref_id !~ '^lesson-([1-9]|1[0-2]):q[1-6]$' or p_amount<>1 then raise exception 'bad_request'; end if;
  quiz_lesson:=split_part(p_ref_id,':',1); quiz_question:=split_part(p_ref_id,':',2);
  select data into local_progress from public.progress where user_id=uid;
  if coalesce(local_progress#>>array['lessons',quiz_lesson,'stages','video'],'false')<>'true' then raise exception 'bad_request'; end if;
  quiz_answer:=coalesce(local_progress#>>array['lessons',quiz_lesson,'quiz','retryAnswers',quiz_question],local_progress#>>array['lessons',quiz_lesson,'quiz','answers',quiz_question])::integer;
  if quiz_answer is distinct from (answer_key#>>array[quiz_lesson,quiz_question])::integer then raise exception 'bad_request'; end if;
 elsif p_source='mission' then
  if p_ref_id<>today::text or p_amount<>5 or (select count(*) from public.mission_progress where user_id=uid and day=today and done)=3 is not true then raise exception 'mission_incomplete'; end if;
 elsif p_source='game' and p_ref_id like 'quiz:%' then
  if p_ref_id<>'quiz:'||today::text or p_amount<>5 then raise exception 'bad_request'; end if;
 end if;
 insert into public.xp_events(user_id,amount,source,ref_id) values(uid,p_amount,p_source,p_ref_id);
 update public.profiles set sparks=sparks+case when p_source in ('lesson','mission') then 10 when p_source='lesson_quiz' then 0 else p_amount end,mentor_tokens=mentor_tokens+case when p_source='mission' then 5 else 0 end where id=uid;
 insert into public.mission_progress values(uid,today,'lesson',case when p_source='lesson' then 1 else 0 end,p_source='lesson') on conflict(user_id,day,mission_id) do update set value=mission_progress.value+excluded.value,done=mission_progress.done or excluded.done;
 insert into public.mission_progress values(uid,today,'xp',total+p_amount,total+p_amount>=50) on conflict(user_id,day,mission_id) do update set value=excluded.value,done=excluded.done;
 insert into public.mission_progress values(uid,today,'perfect',case when perfect then 1 else 0 end,perfect) on conflict(user_id,day,mission_id) do update set value=greatest(mission_progress.value,excluded.value),done=mission_progress.done or excluded.done;
 return jsonb_build_object('ok',true,'sparks',(select sparks from public.profiles where id=uid),'mentorTokens',(select mentor_tokens from public.profiles where id=uid),'xpToday',total+p_amount,'xp',(select sum(amount) from public.xp_events where user_id=uid));
end;$$;
