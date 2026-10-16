import { test } from "node:test";
import assert from "node:assert/strict";
import { schemas, riskPriority, dateLabel } from "../src/lib/domain.ts";
const a = {
  titulo: "Desvio de processo",
  desvio: "O indicador variou durante o período de observação.",
  indicador: "Spillover",
  unidade: "%",
  baseline_valor: 35,
  meta_valor: 10,
  baseline_inicio: "2026-07-01",
  baseline_fim: "2026-08-31",
  direcao: "menor_melhor",
  responsavel: "Facilitador",
  status: "investigando",
};
test("análise aceita baseline e meta coerentes", () =>
  assert.equal(schemas.analises.parse(a).meta_valor, 10));
test("meta deve melhorar a direção do indicador", () =>
  assert.equal(
    schemas.analises.safeParse({ ...a, meta_valor: 40 }).success,
    false,
  ));
test("data inválida e período invertido são recusados", () => {
  assert.equal(
    schemas.analises.safeParse({ ...a, baseline_fim: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    schemas.analises.safeParse({ ...a, baseline_fim: "2026-06-30" }).success,
    false,
  );
});
test("campo numérico vazio não vira zero silenciosamente", () =>
  assert.equal(
    schemas.analises.safeParse({ ...a, baseline_valor: "" }).success,
    false,
  ));
test("campos derivados enviados pelo cliente são removidos", () =>
  assert.equal("score" in schemas.analises.parse({ ...a, score: 999 }), false));
test("categoria crítica promove severidade máxima mesmo com baixa probabilidade", () =>
  assert.deepEqual(
    riskPriority({
      id: "r",
      categoria: "seguranca",
      probabilidade: 1,
      severidade: 5,
    }),
    { level: "Crítico", promoted: true },
  ));
test("categorias comuns seguem exposição", () =>
  assert.deepEqual(
    riskPriority({
      id: "r",
      categoria: "prazo",
      probabilidade: 3,
      severidade: 4,
    }),
    { level: "Alto", promoted: false },
  ));
test("data sem horário não muda o dia com fuso local", () =>
  assert.equal(dateLabel("2026-10-15"), "15/10/2026"));
