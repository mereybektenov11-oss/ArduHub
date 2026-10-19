create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and length(email) <= 254),
  role text null check (role in ('student', 'teacher', 'school', 'parent', 'other')),
  source text not null default 'landing',
  locale text not null default 'ru',
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;
revoke all on table public.waitlist_signups from anon, authenticated;
grant select, insert on table public.waitlist_signups to service_role;

-- No public policies: only the server-side secret may write or read addresses.
comment on table public.waitlist_signups is 'ArduHub early access requests; server-only access';
