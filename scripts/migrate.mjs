import postgres from "postgres";
import { readFile, readdir } from "node:fs/promises";
if (!process.env.DIRECT_URL)
  throw Error("Configure DIRECT_URL no ambiente antes de aplicar migrações.");
const sql = postgres(process.env.DIRECT_URL, {
  ssl: "require",
  max: 1,
  prepare: false,
});
try {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(74362019)`;
    await tx`create table if not exists public.schema_migrations(name text primary key,applied_at timestamptz not null default now())`;
    for (const name of (
      await readdir(new URL("../db/migrations/", import.meta.url))
    )
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      const applied =
        await tx`select name from public.schema_migrations where name=${name}`;
      if (applied.length) continue;
      await tx.unsafe(
        await readFile(
          new URL("../db/migrations/" + name, import.meta.url),
          "utf8",
        ),
      );
      await tx`insert into public.schema_migrations(name) values(${name})`;
      console.log("Aplicada:", name);
    }
  });
  console.log("Migrações concluídas.");
} catch (error) {
  console.error(
    "Falha ao aplicar migrações. Código PostgreSQL:",
    error.code ?? "sem código",
  );
  process.exitCode = 1;
} finally {
  await sql.end();
}
