// Management API: nunca imprime claves ni datos personales. SQL de pruebas dentro de ROLLBACK.
import { loadEnvFile } from "node:process";
import { readFile } from "node:fs/promises";
loadEnvFile(".env.supabase");
const ref = (await readFile("supabase/.temp/project-ref", "utf8")).trim();
const run = async (query) => {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!r.ok) {
    console.error("Database API:", r.status, (await r.text()).slice(0, 600));
    process.exit(1);
  }
  return r.json();
};
const mode = process.argv[2] ?? "inspect";
if (mode === "inspect")
  console.log(
    JSON.stringify(
      await run(
        "select version from supabase_migrations.schema_migrations order by version;",
      ),
    ),
  );
else if (mode === "apply") {
  const migration = process.argv[3];
  if (!/^\d{14}_[a-z_]+\.sql$/.test(migration ?? ""))
    throw new Error("Migración inválida");
  const version = migration.slice(0, 14),
    name = migration.slice(15, -4);
  const existing = await run(
    `select version from supabase_migrations.schema_migrations where version='${version}'`,
  );
  if (existing.length) console.log("Migración ya aplicada:", version);
  else {
    const sql = await readFile(`supabase/migrations/${migration}`, "utf8");
    await run(
      `begin; ${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values ('${version}','${name}',array[$elite_migration$${sql}$elite_migration$]); commit;`,
    );
    console.log("Migración aplicada:", version);
  }
} else if (mode === "test") {
  const file = process.argv[3];
  if (!/^[a-z0-9_-]+\.sql$/.test(file ?? ""))
    throw new Error("Prueba inválida");
  const sql = await readFile(`supabase/tests/database/${file}`, "utf8");
  console.log(JSON.stringify(await run(sql)));
} else throw new Error("Modo inválido");
