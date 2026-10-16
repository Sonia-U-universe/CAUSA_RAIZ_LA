import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("PostgreSQL: integridade, regras do método, RLS e identidade por transação", async (t) => {
  const db = new PGlite();
  await db.waitReady;
  for (const f of (await readdir(new URL("../db/migrations/", import.meta.url)))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(
      await readFile(new URL("../db/migrations/" + f, import.meta.url), "utf8"),
    );
  const run = (uid, sql, params = []) =>
    db.transaction(async (tx) => {
      await tx.exec("set local role causa_raiz_app");
      await tx.query("select set_config('app.usuario_id',$1,true)", [uid]);
      return tx.query(sql, params);
    });
  const aid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    bid = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    cid = "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    hid = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const ta = (await run("user-a", "select criar_meu_espaco() as id")).rows[0]
      .id,
    tb = (await run("user-b", "select criar_meu_espaco() as id")).rows[0].id;
  const insert = `insert into analises(id,time_id,titulo,desvio,indicador,unidade,baseline_valor,meta_valor,baseline_inicio,baseline_fim,direcao,responsavel,criado_por) values($1,$2,'Análise teste','Desvio observado durante um período de teste','Spillover','%',35,10,'2026-07-01','2026-08-31','menor_melhor','Facilitador',$3)`;
  await run("user-a", insert, [aid, ta, "user-a"]);
  await run("user-b", insert, [bid, tb, "user-b"]);
  await t.test("bootstrap pessoal idempotente", async () =>
    assert.equal(
      (await run("user-a", "select criar_meu_espaco() as id")).rows[0].id,
      ta,
    ),
  );
  await t.test("SELECT sem WHERE não vaza o outro espaço", async () =>
    assert.deepEqual(
      (await run("user-a", "select id from analises")).rows.map((x) => x.id),
      [aid],
    ),
  );
  await t.test("UPDATE no outro espaço não altera registros", async () =>
    assert.equal(
      (
        await run(
          "user-a",
          "update analises set titulo='Tentativa indevida' where id=$1 returning id",
          [bid],
        )
      ).rows.length,
      0,
    ),
  );
  await t.test("INSERT em outro espaço é recusado", async () =>
    assert.rejects(
      () => run("user-a", insert, [crypto.randomUUID(), tb, "user-a"]),
      /row-level security/,
    ),
  );
  await run(
    "user-a",
    `insert into causas(id,analise_id,dimensao,causa) values($1,$2,'processos','Muitos itens simultâneos')`,
    [cid, aid],
  );
  await run(
    "user-a",
    `insert into hipoteses(id,analise_id,causa_id,enunciado,evidencia_necessaria,fonte_evidencia,impacto,forca_evidencia,viabilidade) values($1,$2,$3,'Limitar itens pode reduzir a espera','Comparar antes e depois do experimento','Quadro Kanban',5,3,4)`,
    [hid, aid, cid],
  );
  const action = `insert into acoes(analise_id,hipotese_id,o_que,por_que,quem,onde,quando,como,tipo) values($1,$2,'Limitar trabalho em andamento','Reduzir filas e observar o resultado','Facilitador','Quadro','2026-10-30','Acordar um limite e verificar duas sprints','corretiva') returning id`;
  await t.test(
    "ação sobre hipótese não validada recusada por SQL direto",
    async () =>
      assert.rejects(
        () => run("user-a", action, [aid, hid]),
        /Valide a hipótese/,
      ),
  );
  await t.test("validar sem resultado é recusado", async () =>
    assert.rejects(
      () =>
        run("user-a", "update hipoteses set estado='validada' where id=$1", [
          hid,
        ]),
      /conclusao_exige_resultado/,
    ),
  );
  await t.test("score gerado não diverge dos fatores", async () =>
    assert.equal(
      (await run("user-a", "select score from hipoteses where id=$1", [hid]))
        .rows[0].score,
      60,
    ),
  );
  await run(
    "user-a",
    "update hipoteses set estado='validada',resultado_teste='Resultado detalhado do teste observado' where id=$1",
    [hid],
  );
  const actionId = (await run("user-a", action, [aid, hid])).rows[0].id;
  await t.test("concluir ação sem efeito é recusado", async () =>
    assert.rejects(
      () =>
        run("user-a", "update acoes set status='concluida' where id=$1", [
          actionId,
        ]),
      /conclusao_exige_efeito/,
    ),
  );
  await t.test("hipótese com ação não pode perder validação", async () =>
    assert.rejects(
      () =>
        run("user-a", "update hipoteses set estado='refutada' where id=$1", [
          hid,
        ]),
      /possui contramedidas/,
    ),
  );
  await t.test(
    "caminho válido de conclusão preserva efeito e incrementa versão",
    async () => {
      await run(
        "user-a",
        "update acoes set status='concluida',efeito_observado='A espera diminuiu no período observado' where id=$1",
        [actionId],
      );
      const r = (
        await run(
          "user-a",
          "select version,concluido_em from acoes where id=$1",
          [actionId],
        )
      ).rows[0];
      assert.equal(r.version, 2);
      assert.ok(r.concluido_em);
    },
  );
  await t.test("versão antiga não sobrescreve versão nova", async () =>
    assert.equal(
      (
        await run(
          "user-a",
          "update acoes set quem='Outro facilitador' where id=$1 and version=1 returning id",
          [actionId],
        )
      ).rows.length,
      0,
    ),
  );
  await t.test("amostra zero recusada", async () =>
    assert.rejects(
      () =>
        run(
          "user-a",
          "insert into medicoes(analise_id,momento,data_ref,valor,amostra) values($1,'antes','2026-08-31',35,0)",
          [aid],
        ),
      /check constraint/,
    ),
  );
  await t.test("concluir análise sem depois é recusado", async () =>
    assert.rejects(
      () =>
        run("user-a", "update analises set status='concluida' where id=$1", [
          aid,
        ]),
      /medição depois/,
    ),
  );
  await t.test("risco aceito exige justificativa", async () =>
    assert.rejects(
      () =>
        run(
          "user-a",
          "insert into riscos(analise_id,descricao,categoria,probabilidade,severidade,resposta,dono) values($1,'Ambiente pode indisponibilizar o teste','prazo',3,4,'aceitar','Facilitador')",
          [aid],
        ),
      /aceite_exige_gatilho/,
    ),
  );
  await t.test("subcausa não pode criar ciclo", async () => {
    const sub = crypto.randomUUID();
    await run(
      "user-a",
      "insert into causas(id,analise_id,dimensao,causa,parent_id) values($1,$2,'processos','Limite não acordado',$3)",
      [sub, aid, cid],
    );
    await assert.rejects(
      () =>
        run("user-a", "update causas set parent_id=$1 where id=$2", [sub, cid]),
      /ciclo/,
    );
  });
  await t.test("vínculo cruzado entre análises é recusado", async () =>
    assert.rejects(
      () =>
        run(
          "user-b",
          "insert into hipoteses(analise_id,causa_id,enunciado,evidencia_necessaria,fonte_evidencia,impacto,forca_evidencia,viabilidade) values($1,$2,'Hipótese com vínculo de outra análise','Dados suficientes do experimento','Quadro',3,3,3)",
          [bid, cid],
        ),
      /foreign key/,
    ),
  );
  await run(
    "user-a",
    "insert into medicoes(analise_id,momento,data_ref,valor,amostra) values($1,'antes','2026-08-31',35,48),($1,'depois','2026-09-30',21,42)",
    [aid],
  );
  await t.test(
    "view calcula redução de 35 para 21 como melhora de 40%",
    async () => {
      const e = (await run("user-a", "select * from v_efeito_analise")).rows;
      assert.equal(e.length, 1);
      assert.equal(Number(e[0].melhora_percentual), 40);
      assert.equal(e[0].amostra_depois, 42);
    },
  );
  await t.test(
    "views respeitam RLS e ocultam causas do outro usuário",
    async () => {
      assert.equal(
        (await run("user-b", "select * from v_medicao_atual")).rows.length,
        0,
      );
      assert.equal(
        (await run("user-b", "select * from causas")).rows.length,
        0,
      );
      assert.equal(
        (await run("user-b", "select * from historico")).rows.filter(
          (x) => x.analise_id === aid,
        ).length,
        0,
      );
    },
  );
  await t.test("falta de identidade resulta em nenhum dado", async () =>
    assert.equal((await run("", "select * from analises")).rows.length, 0),
  );
  await t.test(
    "sem privilégios para excluir, inserir membros ou forjar histórico",
    async () => {
      await assert.rejects(
        () => run("user-a", "delete from analises where id=$1", [aid]),
        /permission denied/,
      );
      await assert.rejects(
        () =>
          run(
            "user-a",
            "insert into membros_time(usuario_id,time_id) values('intruso',$1)",
            [ta],
          ),
        /permission denied/,
      );
      await assert.rejects(
        () =>
          run(
            "user-a",
            "insert into historico(analise_id,entidade,registro_id,atual)values($1,'analises',$1,'concluida')",
            [aid],
          ),
        /permission denied/,
      );
    },
  );
  await t.test("contexto de usuário não persiste após transação", async () => {
    const result = await db.query(
      "select nullif(current_setting('app.usuario_id',true),'') as uid,current_user as role",
    );
    assert.equal(result.rows[0].uid, null);
    assert.notEqual(result.rows[0].role, "causa_raiz_app");
  });
  await db.close();
});
