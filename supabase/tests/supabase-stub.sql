-- Minimal stand-ins for what Supabase provides (roles, auth, extensions schema, pg_cron).
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create schema extensions;
create schema cron;
create table cron.job (jobid serial primary key, jobname text, schedule text, command text);
create function cron.schedule(name text, sched text, cmd text) returns bigint language sql as $$ insert into cron.job (jobname, schedule, command) values (name, sched, cmd) returning jobid $$;
create function cron.unschedule(name text) returns boolean language sql as $$ delete from cron.job where jobname = name returning true $$;
