-- Rosin: a studio is a teacher and their pupils. Each pupil's plan, sessions and flags live in one
-- JSON document that the pupil and their teacher can both read and write. Run once in the SQL editor.
-- Safe to run in the same Supabase project as Noticed: every object here is prefixed rosin_.

create extension if not exists pgcrypto;

create table if not exists public.rosin_studios (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.rosin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  studio_id uuid not null references public.rosin_studios(id) on delete cascade,
  role text not null check (role in ('teacher','student')),
  name text,
  joined_at timestamptz not null default now()
);

create table if not exists public.rosin_students (
  user_id uuid primary key references auth.users(id) on delete cascade,
  studio_id uuid not null references public.rosin_studios(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.rosin_studios enable row level security;
alter table public.rosin_members enable row level security;
alter table public.rosin_students enable row level security;

create or replace function public.rosin_my_studio() returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select studio_id from public.rosin_members where user_id = auth.uid()
$$;
create or replace function public.rosin_my_role() returns text
language sql stable security definer set search_path = public, extensions as $$
  select role from public.rosin_members where user_id = auth.uid()
$$;

drop policy if exists "rosin members: read own or my studio as teacher" on public.rosin_members;
create policy "rosin members: read own or my studio as teacher" on public.rosin_members for select
  using (user_id = auth.uid() or (studio_id = public.rosin_my_studio() and public.rosin_my_role() = 'teacher'));

drop policy if exists "rosin studios: read mine" on public.rosin_studios;
create policy "rosin studios: read mine" on public.rosin_studios for select using (id = public.rosin_my_studio());

drop policy if exists "rosin students: read own or my studio as teacher" on public.rosin_students;
create policy "rosin students: read own or my studio as teacher" on public.rosin_students for select
  using (user_id = auth.uid() or (studio_id = public.rosin_my_studio() and public.rosin_my_role() = 'teacher'));
drop policy if exists "rosin students: write own or my studio as teacher" on public.rosin_students;
create policy "rosin students: write own or my studio as teacher" on public.rosin_students for update
  using (user_id = auth.uid() or (studio_id = public.rosin_my_studio() and public.rosin_my_role() = 'teacher'))
  with check (user_id = auth.uid() or (studio_id = public.rosin_my_studio() and public.rosin_my_role() = 'teacher'));

-- A teacher creates a studio and gets a code to give pupils.
create or replace function public.rosin_create_studio(studio_name text, teacher_name text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare sid uuid; scode text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from public.rosin_members where user_id = auth.uid()) then raise exception 'You are already in a studio'; end if;
  scode := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
  insert into public.rosin_studios (code, name, teacher_id) values (scode, coalesce(nullif(trim(studio_name),''), 'My studio'), auth.uid()) returning id into sid;
  insert into public.rosin_members (user_id, studio_id, role, name) values (auth.uid(), sid, 'teacher', teacher_name);
  return scode;
end $$;

-- A pupil joins with the code and gets an empty plan document.
create or replace function public.rosin_join_studio(join_code text, student_name text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare sid uuid; sname text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select id, name into sid, sname from public.rosin_studios where code = upper(trim(join_code));
  if sid is null then raise exception 'No studio with that code'; end if;
  insert into public.rosin_members (user_id, studio_id, role, name) values (auth.uid(), sid, 'student', student_name)
    on conflict (user_id) do update set studio_id = excluded.studio_id, role = 'student', name = excluded.name;
  insert into public.rosin_students (user_id, studio_id, data) values (auth.uid(), sid, jsonb_build_object('profile', jsonb_build_object('name', student_name)))
    on conflict (user_id) do update set studio_id = excluded.studio_id;
  return sname;
end $$;

-- What the signed-in user is: their role, studio name and code (code only for teachers).
create or replace function public.rosin_me() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m record; s record;
begin
  if auth.uid() is null then return null; end if;
  select * into m from public.rosin_members where user_id = auth.uid();
  if m is null then return null; end if;
  select * into s from public.rosin_studios where id = m.studio_id;
  return jsonb_build_object('role', m.role, 'name', m.name, 'studio', s.name, 'code', case when m.role = 'teacher' then s.code else null end);
end $$;

-- Teacher: every pupil in my studio with their document. Pupil: just mine.
create or replace function public.rosin_students_list() returns setof public.rosin_students
language sql stable security definer set search_path = public, extensions as $$
  select * from public.rosin_students
  where user_id = auth.uid() or (studio_id = public.rosin_my_studio() and public.rosin_my_role() = 'teacher')
  order by updated_at desc
$$;

-- Save a pupil's document. Pupils save their own; teachers save for pupils in their studio.
create or replace function public.rosin_save_student(target uuid, doc jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if target <> auth.uid() and not (public.rosin_my_role() = 'teacher' and exists (select 1 from public.rosin_students where user_id = target and studio_id = public.rosin_my_studio())) then
    raise exception 'Not your pupil';
  end if;
  update public.rosin_students set data = doc, updated_at = now() where user_id = target;
end $$;

revoke execute on function public.rosin_create_studio(text, text) from public, anon;
revoke execute on function public.rosin_join_studio(text, text) from public, anon;
revoke execute on function public.rosin_me() from public, anon;
revoke execute on function public.rosin_students_list() from public, anon;
revoke execute on function public.rosin_save_student(uuid, jsonb) from public, anon;
grant execute on function public.rosin_create_studio(text, text) to authenticated;
grant execute on function public.rosin_join_studio(text, text) to authenticated;
grant execute on function public.rosin_me() to authenticated;
grant execute on function public.rosin_students_list() to authenticated;
grant execute on function public.rosin_save_student(uuid, jsonb) to authenticated;
grant execute on function public.rosin_my_studio() to authenticated;
grant execute on function public.rosin_my_role() to authenticated;
