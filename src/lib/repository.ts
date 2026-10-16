import "server-only";
import postgres from "postgres";
import { Entity, Data } from "./domain";
let connection: ReturnType<typeof postgres>;
function db() {
  return (connection ??= postgres(process.env.DATABASE_URL!, {
    ssl: "require",
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 15,
    transform: { undefined: null },
  }));
}
export async function withUser<T>(
  id: string,
  work: (tx: postgres.TransactionSql) => Promise<T>,
) {
  return db().begin(async (tx) => {
    await tx`set local role causa_raiz_app`;
    await tx`select set_config('app.usuario_id',${id},true)`;
    return work(tx);
  }) as Promise<T>;
}
export async function load(id: string): Promise<Data> {
  return withUser(id, async (tx) => {
    const [space] = await tx`select criar_meu_espaco() as id`;
    const data: Record<string, unknown> = { time_id: space.id };
    for (const table of [
      "analises",
      "causas",
      "hipoteses",
      "riscos",
      "acoes",
      "medicoes",
      "historico",
    ]) {
      data[table] = await tx`select * from ${tx(table)} order by id`;
    }
    data.efeitos = await tx`select analise_id as id,* from v_efeito_analise`;
    return data as Data;
  });
}
export async function save(
  user: string,
  entity: Entity,
  id: string,
  version: number | null,
  values: Record<string, unknown>,
  analysis: string,
) {
  return withUser(user, async (tx) => {
    let rows;
    if (version !== null) {
      rows =
        await tx`update ${tx(entity)} set ${tx(values)} where id=${id} and version=${version} returning *`;
      if (!rows.length) throw Error("CONFLICT");
    } else {
      if (entity === "analises") {
        const [space] = await tx`select criar_meu_espaco() as id`;
        values = { ...values, time_id: space.id, criado_por: user };
      } else values = { ...values, analise_id: analysis };
      rows =
        await tx`insert into ${tx(entity)} ${tx({ id, ...values })} returning *`;
    }
    return rows[0];
  });
}
