-- G1/G4: evidence-based progress and a single receipt across normal/fallback completion.
-- No balances, existing reward receipts or user rows are removed.
alter table public.xp_events drop constraint xp_events_source_check;
alter table public.xp_events add constraint xp_events_source_check check(source in ('lesson','lesson_fallback','lesson_quiz','mission','game'));

create function private.lesson_answer_keys() returns jsonb language sql immutable security invoker set search_path='' as $$select '{"lesson-1":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2},"lesson-2":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-3":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-4":{"q1":0,"q2":2,"q3":1,"q4":0,"q5":2,"q6":1},"lesson-5":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-6":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2},"lesson-7":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-8":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2},"lesson-9":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-10":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2},"lesson-11":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-12":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2}}'::jsonb;$$;
revoke all on function private.lesson_answer_keys() from public,anon;
grant execute on function private.lesson_answer_keys() to authenticated;

create function private.lesson_stages(p_lesson jsonb, p_key jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare video_ok boolean:=false; test_ok boolean:=false; practice_ok boolean:=false;
        question record; answer jsonb; score integer:=0; count_answers integer:=0; total integer:=0;
begin
 if p_lesson#>'{stages,video}'='true'::jsonb then
  video_ok:=p_lesson#>'{video,confirmed}'='true'::jsonb;
  if jsonb_typeof(p_lesson#>'{video,watchedRatio}')='number' then
   video_ok:=coalesce(video_ok,false) or (p_lesson#>>'{video,watchedRatio}')::numeric>=0.8;
  end if;
 end if;
 if coalesce(video_ok,false) and p_lesson#>'{stages,test}'='true'::jsonb and p_lesson#>>'{quiz,phase}' in ('result','review','reviewResult') and jsonb_typeof(p_key)='object' then
  for question in select key,value from jsonb_each(p_key) loop
   total:=total+1;
   answer:=coalesce(p_lesson#>array['quiz','retryAnswers',question.key],p_lesson#>array['quiz','answers',question.key]);
   if answer in ('0'::jsonb,'1'::jsonb,'2'::jsonb,'3'::jsonb) then count_answers:=count_answers+1; end if;
   if answer=question.value then score:=score+1; end if;
  end loop;
  test_ok:=total>0 and count_answers=total and score*100>=total*70;
 end if;
 practice_ok:=test_ok and p_lesson#>'{stages,practice}'='true'::jsonb and p_lesson#>'{practice,circuit}'='true'::jsonb and p_lesson#>'{practice,code}'='true'::jsonb and p_lesson#>'{practice,run}'='true'::jsonb;
 return jsonb_build_object('video',coalesce(video_ok,false),'test',coalesce(test_ok,false),'practice',coalesce(practice_ok,false));
end;$$;
revoke all on function private.lesson_stages(jsonb,jsonb) from public,anon;
grant execute on function private.lesson_stages(jsonb,jsonb) to authenticated;

create or replace function private.save_progress(p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); old_data jsonb; result jsonb; own jsonb; previous jsonb; profile public.profiles;
        lesson_id text; ordinal integer; blocked boolean:=false; verified jsonb; answer_key jsonb:=private.lesson_answer_keys();
begin
 if uid is null then raise exception 'unauthorized'; end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>500000 or coalesce(jsonb_typeof(p_data->'lessons'),'null')<>'object' then raise exception 'bad_request'; end if;
 select * into strict profile from public.profiles where id=uid for update;
 select data into old_data from public.progress where user_id=uid;
 result:=p_data;
 -- Normalization is authoritative for evidence-aware clients. Legacy callers keep
 -- their old merge behavior until their next upgraded client save.
 if p_data->>'progressEvidenceVersion'='1' or old_data->>'progressEvidenceVersion'='1' then
  result:=jsonb_set(result,'{progressEvidenceVersion}','1'::jsonb);
  for ordinal in 1..12 loop
   lesson_id:='lesson-'||ordinal;
   own:=coalesce(result#>array['lessons',lesson_id],'{}'::jsonb);
   previous:=old_data#>array['lessons',lesson_id];
   if jsonb_typeof(own)<>'object' then raise exception 'bad_request'; end if;
   -- Preserve genuine completed evidence across stale device snapshots, never bare done flags.
   if previous->>'status'='done' and private.lesson_stages(previous,answer_key->lesson_id)->>'practice'='true' then
    own:=previous||jsonb_build_object('rewarded',coalesce(previous->'rewarded','false'::jsonb));
   end if;
   verified:=private.lesson_stages(own,answer_key->lesson_id);
   own:=jsonb_set(own,'{stages}',verified);
   own:=jsonb_set(own,'{status}',to_jsonb(case when blocked then 'locked' when own->>'status'='done' and verified->>'practice'='true' then 'done' else 'current' end));
   if own->>'status'<>'done' then blocked:=true; end if;
   if exists(select 1 from public.xp_events where user_id=uid and source in ('lesson','lesson_fallback') and ref_id=lesson_id) then
    own:=jsonb_set(own,'{rewarded}','true'::jsonb);
   end if;
   result:=jsonb_set(result,array['lessons',lesson_id],own,true);
  end loop;
 else
  for lesson_id,previous in select key,value from jsonb_each(coalesce(old_data->'lessons','{}')) loop
   own:=coalesce(result#>array['lessons',lesson_id],previous);
   if previous->>'status'='done' then own:=jsonb_set(own,'{status}','"done"'); end if;
   own:=jsonb_set(own,'{attempts}',to_jsonb(greatest(coalesce((own->>'attempts')::int,0),coalesce((previous->>'attempts')::int,0))));
   own:=jsonb_set(own,'{bestErrors}',to_jsonb(least(coalesce((own->>'bestErrors')::int,99),coalesce((previous->>'bestErrors')::int,99))));
   result:=jsonb_set(result,array['lessons',lesson_id],own,true);
  end loop;
 end if;
 result:=jsonb_set(result,'{sparks}',to_jsonb(profile.sparks));
 result:=jsonb_set(result,'{xp}',to_jsonb((select coalesce(sum(amount),0) from public.xp_events where user_id=uid)));
 -- Mentor token balance is server-owned too.
 if jsonb_typeof(result->'mentor')='object' then result:=jsonb_set(result,'{mentor,tokens}',to_jsonb(profile.mentor_tokens)); end if;
 insert into public.progress(user_id,data,updated_at) values(uid,result,now()) on conflict(user_id) do update set data=excluded.data,updated_at=now();
 return result;
end;$$;

-- Keep first correct answers for an offline reward queue across retries.
create or replace function private.award(p_source text,p_ref_id text,p_amount integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); profile public.profiles; today date; total integer; perfect boolean:=false; local_progress jsonb; awarded integer; quiz_lesson text; quiz_question text; quiz_answer integer; answer_key jsonb := '{"lesson-1":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2},"lesson-2":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-3":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-4":{"q1":0,"q2":2,"q3":1,"q4":0,"q5":2,"q6":1},"lesson-5":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-6":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2},"lesson-7":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-8":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2},"lesson-9":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-10":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2},"lesson-11":{"q1":1,"q2":0,"q3":2,"q4":1,"q5":0,"q6":2},"lesson-12":{"q1":0,"q2":1,"q3":2,"q4":0,"q5":1,"q6":2}}'::jsonb;
begin
 if uid is null then raise exception 'unauthorized'; end if;
 if p_source not in ('lesson','lesson_fallback','lesson_quiz','mission','game') or p_ref_id is null or char_length(p_ref_id)>100 or p_amount is null or p_amount<1 or p_amount>100 then raise exception 'bad_request'; end if;
 select * into strict profile from public.profiles where id=uid for update;
 today:=(now() at time zone profile.timezone)::date;
 if exists(select 1 from public.xp_events where user_id=uid and ref_id=p_ref_id and (source=p_source or (p_source in ('lesson','lesson_fallback') and source in ('lesson','lesson_fallback')))) then raise exception 'already_awarded'; end if;
 select coalesce(sum(amount),0) into total from public.xp_events where user_id=uid and (created_at at time zone profile.timezone)::date=today;
 if total+p_amount>500 then raise exception 'daily_cap'; end if;
 if p_source in ('lesson','lesson_fallback') then
  if p_ref_id !~ '^lesson-([1-9]|1[0-2])$' then raise exception 'bad_request'; end if;
  awarded:=case when p_source='lesson_fallback' then 15 else 30 end;
  if p_amount<>awarded then raise exception 'bad_request'; end if;
  select data into local_progress from public.progress where user_id=uid;
  if coalesce(local_progress#>>array['lessons',p_ref_id,'status'],'')<>'done' then raise exception 'bad_request'; end if;
  if private.lesson_stages(local_progress#>array['lessons',p_ref_id],answer_key->p_ref_id)->>'practice'<>'true' or local_progress#>>array['lessons',p_ref_id,'completionSource'] is distinct from p_source then raise exception 'bad_request'; end if;
  if exists(select 1 from generate_series(1,substring(p_ref_id from 8)::integer-1) n where coalesce(local_progress#>>array['lessons','lesson-'||n,'status'],'')<>'done' or private.lesson_stages(local_progress#>array['lessons','lesson-'||n],answer_key->('lesson-'||n))->>'practice'<>'true') then raise exception 'bad_request'; end if;
  perfect:=p_source='lesson' and coalesce((local_progress#>>array['lessons',p_ref_id,'attempts'])::integer,0)=1 and coalesce((local_progress#>>array['lessons',p_ref_id,'bestErrors'])::integer,99)=0;
 elsif p_source='lesson_quiz' then
  if p_ref_id !~ '^lesson-([1-9]|1[0-2]):q[1-6]$' or p_amount<>1 then raise exception 'bad_request'; end if;
  quiz_lesson:=split_part(p_ref_id,':',1); quiz_question:=split_part(p_ref_id,':',2);
  select data into local_progress from public.progress where user_id=uid;
  if coalesce(local_progress#>>array['lessons',quiz_lesson,'stages','video'],'false')<>'true' then raise exception 'bad_request'; end if;
  quiz_answer:=coalesce(local_progress#>>array['lessons',quiz_lesson,'quiz','awardedAnswers',quiz_question],local_progress#>>array['lessons',quiz_lesson,'quiz','retryAnswers',quiz_question],local_progress#>>array['lessons',quiz_lesson,'quiz','answers',quiz_question])::integer;
  if quiz_answer is distinct from (answer_key#>>array[quiz_lesson,quiz_question])::integer then raise exception 'bad_request'; end if;
 elsif p_source='mission' then
  if p_ref_id<>today::text or p_amount<>5 or (select count(*) from public.mission_progress where user_id=uid and day=today and done)=3 is not true then raise exception 'mission_incomplete'; end if;
 elsif p_source='game' and p_ref_id like 'quiz:%' then
  if p_ref_id<>'quiz:'||today::text or p_amount<>5 then raise exception 'bad_request'; end if;
 end if;
 insert into public.xp_events(user_id,amount,source,ref_id) values(uid,p_amount,p_source,p_ref_id);
 update public.profiles set sparks=sparks+case when p_source in ('lesson','mission') then 10 when p_source='lesson_fallback' then 5 when p_source='lesson_quiz' then 0 else p_amount end,mentor_tokens=mentor_tokens+case when p_source='mission' then 5 else 0 end where id=uid;
 insert into public.mission_progress values(uid,today,'lesson',case when p_source in ('lesson','lesson_fallback') then 1 else 0 end,p_source in ('lesson','lesson_fallback')) on conflict(user_id,day,mission_id) do update set value=mission_progress.value+excluded.value,done=mission_progress.done or excluded.done;
 insert into public.mission_progress values(uid,today,'xp',total+p_amount,total+p_amount>=50) on conflict(user_id,day,mission_id) do update set value=excluded.value,done=excluded.done;
 insert into public.mission_progress values(uid,today,'perfect',case when perfect then 1 else 0 end,perfect) on conflict(user_id,day,mission_id) do update set value=greatest(mission_progress.value,excluded.value),done=mission_progress.done or excluded.done;
 return jsonb_build_object('ok',true,'sparks',(select sparks from public.profiles where id=uid),'mentorTokens',(select mentor_tokens from public.profiles where id=uid),'xpToday',total+p_amount,'xp',(select sum(amount) from public.xp_events where user_id=uid));
end;$$;

revoke all on function private.award(text,text,integer),private.save_progress(jsonb) from public,anon;
grant execute on function private.award(text,text,integer),private.save_progress(jsonb) to authenticated;
