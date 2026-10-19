-- ArduHub accounts. Privileged operations live outside the exposed schema.
create schema if not exists private;
grant usage on schema private to authenticated;
create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 display_name text not null check(char_length(display_name) between 1 and 20),
 role text not null default 'student' check(role in ('student','teacher')),
 avatar_frame text, timezone text not null default 'Asia/Almaty',
 sparks integer not null default 0 check(sparks>=0),
 mentor_tokens integer not null default 50 check(mentor_tokens>=0),
 hide_from_leaderboard boolean not null default false,
 inventory jsonb not null default '[]', freeze_count integer not null default 0 check(freeze_count>=0), hint_count integer not null default 0 check(hint_count>=0),
 created_at timestamptz not null default now()
);
create table public.progress(user_id uuid primary key references public.profiles on delete cascade,data jsonb not null,updated_at timestamptz not null default now());
create table public.drafts(user_id uuid references public.profiles on delete cascade,lesson_id text,scene jsonb not null,code text not null check(octet_length(code)<=16384),data jsonb not null default '{}',updated_at timestamptz not null default now(),primary key(user_id,lesson_id));
create table public.projects(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,title text not null check(char_length(title) between 1 and 100),idea text not null default '',scene jsonb not null,code text not null check(octet_length(code)<=16384),thumbnail_svg text not null default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index projects_user on public.projects(user_id);
create table public.xp_events(id bigint generated always as identity primary key,user_id uuid not null references public.profiles on delete cascade,amount integer not null check(amount>0 and amount<=500),source text not null check(source in ('lesson','mission','game')),ref_id text not null,created_at timestamptz not null default now(),unique(user_id,source,ref_id));
create index xp_weekly on public.xp_events(created_at,user_id);
create table public.mission_progress(user_id uuid references public.profiles on delete cascade,day date,mission_id text,value integer not null default 0,done boolean not null default false,primary key(user_id,day,mission_id));
create table public.shop_items(id text primary key,kind text not null,title text not null,description text not null,price_sparks integer not null check(price_sparks>=0),one_time boolean not null default true,payload jsonb not null,active boolean not null default true);
create table public.purchases(id bigint generated always as identity primary key,user_id uuid not null references public.profiles on delete cascade,item_id text not null references public.shop_items,request_id uuid not null,one_time boolean not null,created_at timestamptz not null default now(),unique(user_id,request_id));
create unique index purchase_once on public.purchases(user_id,item_id) where one_time;
alter table public.profiles enable row level security;
create policy "read own profiles" on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy "edit own profile" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
alter table public.progress enable row level security;
create policy "read own progress" on public.progress for select to authenticated using ((select auth.uid())=user_id);
create policy "insert own progress" on public.progress for insert to authenticated  with check ((select auth.uid())=user_id);
create policy "update own progress" on public.progress for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "delete own progress" on public.progress for delete to authenticated using ((select auth.uid())=user_id) ;
alter table public.drafts enable row level security;
create policy "read own drafts" on public.drafts for select to authenticated using ((select auth.uid())=user_id);
create policy "insert own drafts" on public.drafts for insert to authenticated  with check ((select auth.uid())=user_id);
create policy "update own drafts" on public.drafts for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "delete own drafts" on public.drafts for delete to authenticated using ((select auth.uid())=user_id) ;
alter table public.projects enable row level security;
create policy "read own projects" on public.projects for select to authenticated using ((select auth.uid())=user_id);
create policy "insert own projects" on public.projects for insert to authenticated  with check ((select auth.uid())=user_id);
create policy "update own projects" on public.projects for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "delete own projects" on public.projects for delete to authenticated using ((select auth.uid())=user_id) ;
alter table public.xp_events enable row level security;
create policy "read own xp_events" on public.xp_events for select to authenticated using ((select auth.uid())=user_id);
alter table public.mission_progress enable row level security;
create policy "read own mission_progress" on public.mission_progress for select to authenticated using ((select auth.uid())=user_id);
alter table public.shop_items enable row level security;
create policy "read own shop_items" on public.shop_items for select to authenticated using (true);
alter table public.purchases enable row level security;
create policy "read own purchases" on public.purchases for select to authenticated using ((select auth.uid())=user_id);
create policy "public catalog" on public.shop_items for select to anon using (active);
grant select on public.shop_items to anon,authenticated;
grant select on public.profiles,public.xp_events,public.mission_progress,public.purchases to authenticated;
grant update(display_name,avatar_frame,timezone,hide_from_leaderboard) on public.profiles to authenticated;
grant select,insert,update,delete on public.progress,public.drafts,public.projects to authenticated;

create function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name,role,timezone) values(new.id,left(coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'),''),'Ученик'),20),case when new.raw_user_meta_data->>'role'='teacher' then 'teacher' else 'student' end,case when exists(select 1 from pg_timezone_names where name=new.raw_user_meta_data->>'timezone') then new.raw_user_meta_data->>'timezone' else 'Asia/Almaty' end);
 return new;
end;$$;
revoke all on function private.handle_new_user() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create function private.limit_projects() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=new.user_id for update;
 if (select count(*) from public.projects where user_id=new.user_id)>=20 then raise exception 'project_limit'; end if;
 return new;
end;$$;
revoke all on function private.limit_projects() from public;
create trigger limit_projects before insert on public.projects for each row execute function private.limit_projects();

create function private.award(p_source text,p_ref_id text,p_amount integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); profile public.profiles; today date; total integer; perfect boolean:=false; local_progress jsonb; awarded integer;
begin
 if uid is null then raise exception 'unauthorized'; end if;
 if p_source not in ('lesson','mission','game') or p_ref_id is null or char_length(p_ref_id)>100 or p_amount is null or p_amount<1 or p_amount>100 then raise exception 'bad_request'; end if;
 select * into strict profile from public.profiles where id=uid for update;
 today:=(now() at time zone profile.timezone)::date;
 if exists(select 1 from public.xp_events where user_id=uid and source=p_source and ref_id=p_ref_id) then raise exception 'already_awarded'; end if;
 select coalesce(sum(amount),0) into total from public.xp_events where user_id=uid and (created_at at time zone profile.timezone)::date=today;
 if total+p_amount>500 then raise exception 'daily_cap'; end if;
 if p_source='lesson' then
  if p_ref_id !~ '^lesson-([1-9]|1[0-2])$' then raise exception 'bad_request'; end if;
  awarded:=30+((substring(p_ref_id from 8)::integer-1)/3)*10;
  if p_amount<>awarded then raise exception 'bad_request'; end if;
  select data into local_progress from public.progress where user_id=uid;
  if coalesce(local_progress#>>array['lessons',p_ref_id,'status'],'')<>'done' then raise exception 'bad_request'; end if;
  perfect:=coalesce((local_progress#>>array['lessons',p_ref_id,'attempts'])::integer,0)=1 and coalesce((local_progress#>>array['lessons',p_ref_id,'bestErrors'])::integer,99)=0;
 elsif p_source='mission' then
  if p_ref_id<>today::text or p_amount<>5 or (select count(*) from public.mission_progress where user_id=uid and day=today and done)=3 is not true then raise exception 'mission_incomplete'; end if;
 elsif p_source='game' and p_ref_id like 'quiz:%' then
  if p_ref_id<>'quiz:'||today::text or p_amount<>5 then raise exception 'bad_request'; end if;
 end if;
 insert into public.xp_events(user_id,amount,source,ref_id) values(uid,p_amount,p_source,p_ref_id);
 update public.profiles set sparks=sparks+case when p_source='mission' then 10 else p_amount end,mentor_tokens=mentor_tokens+case when p_source='mission' then 5 else 0 end where id=uid;
 insert into public.mission_progress values(uid,today,'lesson',case when p_source='lesson' then 1 else 0 end,p_source='lesson') on conflict(user_id,day,mission_id) do update set value=mission_progress.value+excluded.value,done=mission_progress.done or excluded.done;
 insert into public.mission_progress values(uid,today,'xp',total+p_amount,total+p_amount>=50) on conflict(user_id,day,mission_id) do update set value=excluded.value,done=excluded.done;
 insert into public.mission_progress values(uid,today,'perfect',case when perfect then 1 else 0 end,perfect) on conflict(user_id,day,mission_id) do update set value=greatest(mission_progress.value,excluded.value),done=mission_progress.done or excluded.done;
 return jsonb_build_object('ok',true,'sparks',(select sparks from public.profiles where id=uid),'mentorTokens',(select mentor_tokens from public.profiles where id=uid),'xpToday',total+p_amount,'xp',(select sum(amount) from public.xp_events where user_id=uid));
end;$$;
create function public.award(source text,ref_id text,amount integer) returns jsonb language sql security invoker set search_path='' as $$select private.award(source,ref_id,amount);$$;
revoke all on function private.award(text,text,integer),public.award(text,text,integer) from public;
grant execute on function private.award(text,text,integer),public.award(text,text,integer) to authenticated;

create function private.buy_item(p_item_id text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); profile public.profiles; item public.shop_items;
begin
 if uid is null then raise exception 'unauthorized'; end if;
 select * into strict profile from public.profiles where id=uid for update;
 if exists(select 1 from public.purchases where user_id=uid and request_id=p_request_id) then return jsonb_build_object('ok',true,'sparks',profile.sparks); end if;
 select * into item from public.shop_items where id=p_item_id and active;
 if not found then raise exception 'bad_request'; end if;
 if item.one_time and exists(select 1 from public.purchases where user_id=uid and item_id=p_item_id) then raise exception 'already_purchased'; end if;
 if profile.sparks<item.price_sparks then raise exception 'insufficient_sparks'; end if;
 insert into public.purchases(user_id,item_id,request_id,one_time) values(uid,item.id,p_request_id,item.one_time);
 update public.profiles set sparks=sparks-item.price_sparks,mentor_tokens=mentor_tokens+coalesce((item.payload->>'tokens')::integer,0),freeze_count=freeze_count+coalesce((item.payload->>'freeze')::integer,0),hint_count=hint_count+coalesce((item.payload->>'hints')::integer,0),inventory=case when inventory ? item.id then inventory else inventory||jsonb_build_array(item.id) end,avatar_frame=coalesce(item.payload->>'frame',avatar_frame) where id=uid;
 return jsonb_build_object('ok',true,'sparks',profile.sparks-item.price_sparks);
end;$$;
create function public.buy_item(item_id text,request_id uuid default gen_random_uuid()) returns jsonb language sql security invoker set search_path='' as $$select private.buy_item(item_id,request_id);$$;
revoke all on function private.buy_item(text,uuid),public.buy_item(text,uuid) from public;
grant execute on function private.buy_item(text,uuid),public.buy_item(text,uuid) to authenticated;

create function private.spend_mentor_tokens(n integer) returns integer language plpgsql security definer set search_path='' as $$
declare left_tokens integer;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 if n is null or n<1 or n>20 then raise exception 'bad_request'; end if;
 update public.profiles set mentor_tokens=mentor_tokens-n where id=auth.uid() and mentor_tokens>=n returning mentor_tokens into left_tokens;
 if left_tokens is null then raise exception 'insufficient_tokens'; end if;
 return left_tokens;
end;$$;
create function public.spend_mentor_tokens(n integer) returns integer language sql security invoker set search_path='' as $$select private.spend_mentor_tokens(n);$$;
revoke all on function private.spend_mentor_tokens(integer),public.spend_mentor_tokens(integer) from public;
grant execute on function private.spend_mentor_tokens(integer),public.spend_mentor_tokens(integer) to authenticated;

create function private.get_weekly_leaderboard(p_limit integer) returns table(rank bigint,display_name text,avatar_frame text,xp bigint,is_self boolean) language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 return query with scores as (select e.user_id,sum(e.amount)::bigint as xp from public.xp_events e where e.created_at>=date_trunc('week',now()) group by e.user_id),ranked as (select row_number() over(order by s.xp desc,p.id) as rank,p.id,p.display_name,p.avatar_frame,s.xp from scores s join public.profiles p on p.id=s.user_id where not p.hide_from_leaderboard) select r.rank,r.display_name,r.avatar_frame,r.xp,r.id=auth.uid() from ranked r where r.rank<=least(greatest(p_limit,1),20) or r.id=auth.uid() order by r.rank;
end;$$;
create function public.get_weekly_leaderboard("limit" integer default 20) returns table(rank bigint,display_name text,avatar_frame text,xp bigint,is_self boolean) language sql security invoker set search_path='' as $$select * from private.get_weekly_leaderboard("limit");$$;
revoke all on function private.get_weekly_leaderboard(integer),public.get_weekly_leaderboard(integer) from public;
grant execute on function private.get_weekly_leaderboard(integer),public.get_weekly_leaderboard(integer) to authenticated;

-- Merge completed lessons under a row lock so two devices cannot erase a completion.
create function private.save_progress(p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); old_data jsonb; result jsonb; entry record; own jsonb; profile public.profiles;
begin
 if uid is null then raise exception 'unauthorized'; end if;
 if jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>500000 then raise exception 'bad_request'; end if;
 select * into strict profile from public.profiles where id=uid for update;
 select data into old_data from public.progress where user_id=uid;
 result:=p_data;
 for entry in select key,value from jsonb_each(coalesce(old_data->'lessons','{}')) loop
  own:=coalesce(result#>array['lessons',entry.key],entry.value);
  if entry.value->>'status'='done' then own:=jsonb_set(own,'{status}','"done"'); end if;
  own:=jsonb_set(own,'{attempts}',to_jsonb(greatest(coalesce((own->>'attempts')::int,0),coalesce((entry.value->>'attempts')::int,0))));
  own:=jsonb_set(own,'{bestErrors}',to_jsonb(least(coalesce((own->>'bestErrors')::int,99),coalesce((entry.value->>'bestErrors')::int,99))));
  result:=jsonb_set(result,array['lessons',entry.key],own,true);
 end loop;
 result:=jsonb_set(result,'{sparks}',to_jsonb(profile.sparks));
 result:=jsonb_set(result,'{xp}',to_jsonb((select coalesce(sum(amount),0) from public.xp_events where user_id=uid)));
 insert into public.progress(user_id,data,updated_at) values(uid,result,now()) on conflict(user_id) do update set data=excluded.data,updated_at=now();
 return result;
end;$$;
create function public.save_progress(data jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.save_progress(data);$$;
revoke all on function private.save_progress(jsonb),public.save_progress(jsonb) from public;
grant execute on function private.save_progress(jsonb),public.save_progress(jsonb) to authenticated;
revoke insert,update,delete on public.progress from authenticated;

create function private.consume_boost(p_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); profile public.profiles; last_day date; today date; result jsonb;
begin
 if uid is null then raise exception 'unauthorized'; end if;
 select * into strict profile from public.profiles where id=uid for update;
 if p_kind='hint' then
  update public.profiles set hint_count=hint_count-1 where id=uid and hint_count>0;
  if not found then raise exception 'insufficient_boost'; end if;
 elsif p_kind='freeze' then
  today:=(now() at time zone profile.timezone)::date;
  select (data#>>'{streak,lastActiveDate}')::date into last_day from public.progress where user_id=uid;
  if profile.freeze_count<1 or last_day is null or today-last_day<>2 then return jsonb_build_object('used',false); end if;
  update public.profiles set freeze_count=freeze_count-1 where id=uid;
  update public.progress set data=jsonb_set(data,'{streak,lastActiveDate}',to_jsonb((today-1)::text)) where user_id=uid;
 else raise exception 'bad_request'; end if;
 return jsonb_build_object('used',true);
end;$$;
create function public.consume_boost(kind text) returns jsonb language sql security invoker set search_path='' as $$select private.consume_boost(kind);$$;
revoke all on function private.consume_boost(text),public.consume_boost(text) from public;
grant execute on function private.consume_boost(text),public.consume_boost(text) to authenticated;


create function private.validate_profile_settings() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'invalid_timezone'; end if;
 if new.avatar_frame is not null and not (new.inventory ? ('frame-'||new.avatar_frame)) then raise exception 'frame_not_owned'; end if;
 return new;
end;$$;
revoke all on function private.validate_profile_settings() from public;
create trigger validate_profile_settings before update on public.profiles for each row execute function private.validate_profile_settings();

-- SHOP SEED
insert into public.shop_items(id,kind,title,description,price_sparks,one_time,payload,active) values
('oma','mentor','Ома','Спокойно объясняет шаг за шагом.',60,true,'{"mentor":"oma"}'::jsonb,true),
('rezik','mentor','Резик','Помогает разобраться через короткие вопросы.',100,true,'{"mentor":"rezik"}'::jsonb,true),
('shina','mentor','Шина','Помогает связывать идеи в целую систему.',150,true,'{"mentor":"shina"}'::jsonb,true),
('freeze','boost','Заморозка серии','Сохраняет серию при пропуске одного дня.',40,true,'{"freeze":1}'::jsonb,true),
('hints','boost','Набор подсказок','Три дополнительные подсказки для уроков.',30,false,'{"hints":3}'::jsonb,true),
('tokens','boost','Токены наставника','Десять дополнительных токенов наставника.',25,false,'{"tokens":10}'::jsonb,true),
('frame-amber','frame','Янтарная рамка','Тёплый акцент для аватара.',50,true,'{"frame":"amber"}'::jsonb,true),
('frame-forest','frame','Лесная рамка','Цвет первых работающих схем.',60,true,'{"frame":"forest"}'::jsonb,true),
('frame-circuit','frame','Рамка «Контакт»','Узор из маленьких соединений.',70,true,'{"frame":"circuit"}'::jsonb,true),
('frame-master','frame','Рамка мастера','Двойной контур для твоего профиля.',80,true,'{"frame":"master"}'::jsonb,true);
