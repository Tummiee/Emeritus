import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
export async function testDatabase(upgrade = false) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon,authenticated,service_role;
    create schema auth; create schema storage;
    grant usage on schema auth,storage to anon,authenticated,service_role;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to authenticated;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
    alter default privileges in schema public grant all on tables to service_role;
    alter default privileges in schema public grant usage,select on sequences to service_role;
  `);
  const files: string[] = JSON.parse(
    readFileSync(resolve("supabase/migration-manifest.json"), "utf8"),
  );
  for (const file of files) {
    if (upgrade && file.startsWith("202610")) break;
    await db.exec(
      `set check_function_bodies = ${file.startsWith("202610") ? "on" : "off"}`,
    );
    try {
      await db.exec(readFileSync(resolve("supabase/migrations", file), "utf8"));
    } catch (error) {
      await db.close();
      throw new Error(
        `Migration ${file}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  return db;
}
