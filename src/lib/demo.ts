import { Data, Row, emptyData } from "./domain";
const a = "22222222-2222-4222-8222-222222222222",
  c = "33333333-3333-4333-8333-333333333333",
  h = "44444444-4444-4444-8444-444444444444";
export function demoData(): Data {
  const d = emptyData();
  d.time_id = "11111111-1111-4111-8111-111111111111";
  d.analises = [
    {
      id: a,
      time_id: d.time_id,
      titulo: "Histórias que transbordam a sprint",
      desvio:
        "35% das histórias comprometidas nas sprints de julho e agosto não foram concluídas no período, exigindo replanejamento na sprint seguinte.",
      indicador: "Spillover",
      unidade: "%",
      baseline_valor: 35,
      meta_valor: 10,
      baseline_inicio: "2026-07-01",
      baseline_fim: "2026-08-31",
      direcao: "menor_melhor",
      responsavel: "Agile Master",
      status: "medindo",
      version: 1,
    },
  ];
  d.causas = [
    {
      id: c,
      analise_id: a,
      dimensao: "processos",
      causa: "Excesso de trabalho em andamento",
      parent_id: null,
      porques: [
        "Não existe um limite de trabalho em andamento acordado.",
        "A equipe prioriza iniciar tarefas em vez de concluir o fluxo.",
      ],
      origem: "retrospectiva",
      version: 1,
    },
    ...["dependencias", "requisitos", "tecnologia"].map((dimensao, i) => ({
      id: `55555555-5555-4555-8555-55555555555${i}`,
      analise_id: a,
      dimensao,
      causa: [
        "Espera pelo time de integração",
        "Critérios de aceite descobertos durante a execução",
        "Ambiente de testes instável",
      ][i],
      parent_id: null,
      porques: [],
      origem: "workshop",
      version: 1,
    })),
  ];
  d.hipoteses = [
    {
      id: h,
      analise_id: a,
      causa_id: c,
      enunciado:
        "Limitar itens simultâneos reduz o transbordamento de histórias.",
      evidencia_necessaria:
        "Comparar sprints antes e depois de um limite de trabalho acordado.",
      fonte_evidencia: "Quadro Kanban · dados fictícios",
      impacto: 5,
      forca_evidencia: 4,
      viabilidade: 4,
      score: 80,
      frequencia: 18,
      estado: "validada",
      resultado_teste:
        "No exemplo fictício, o período seguinte apresentou redução com outras condições ainda não controladas.",
      version: 1,
    },
  ];
  d.acoes = [
    {
      id: "66666666-6666-4666-8666-666666666666",
      analise_id: a,
      hipotese_id: h,
      o_que: "Experimentar limite de dois itens por pessoa",
      por_que: "Reduzir filas de trabalho e observar o indicador.",
      quem: "Facilitador",
      onde: "Quadro do time",
      quando: "2026-10-30",
      como: "Acordar a política, acompanhar diariamente e revisar após duas sprints.",
      quanto: "Sem custo adicional",
      tipo: "corretiva",
      status: "em_andamento",
      efeito_observado: "",
      version: 1,
    },
  ];
  d.riscos = [
    {
      id: "77777777-7777-4777-8777-777777777777",
      analise_id: a,
      descricao:
        "Indisponibilidade do ambiente comprometer a comparação do experimento.",
      categoria: "disponibilidade",
      probabilidade: 3,
      severidade: 5,
      exposicao: 15,
      resposta: "mitigar",
      gatilho: "Mais de um dia de indisponibilidade.",
      dono: "Facilitador",
      status: "aberto",
      version: 1,
    },
  ];
  d.medicoes = [
    {
      id: crypto.randomUUID(),
      analise_id: a,
      momento: "antes",
      data_ref: "2026-08-31",
      valor: 35,
      amostra: 48,
      p50: 6,
      p85: 14,
      observacao: "Exemplo fictício",
      version: 1,
    },
    {
      id: crypto.randomUUID(),
      analise_id: a,
      momento: "depois",
      data_ref: "2026-09-30",
      valor: 21,
      amostra: 42,
      p50: 5,
      p85: 10,
      observacao: "Exemplo fictício",
      version: 1,
    },
  ];
  return deriveDemo(d);
}
export function deriveDemo(d: Data): Data {
  return {
    ...d,
    efeitos: d.analises.map((a) => {
      const latest = (m: string) =>
        d.medicoes
          .filter((r) => r.analise_id === a.id && r.momento === m)
          .sort((x, y) => y.data_ref.localeCompare(x.data_ref))[0];
      const b = latest("antes"),
        n = latest("depois");
      return {
        id: a.id,
        analise_id: a.id,
        valor_antes: b?.valor ?? null,
        valor_depois: n?.valor ?? null,
        amostra_antes: b?.amostra ?? null,
        amostra_depois: n?.amostra ?? null,
        melhora_percentual:
          b && n && Number(b.valor) !== 0
            ? ((Number(n.valor) - Number(b.valor)) /
                Math.abs(Number(b.valor))) *
              100 *
              (a.direcao === "menor_melhor" ? -1 : 1)
            : null,
      };
    }),
  };
}
export function validateDemo(entity: string, row: Row, d: Data) {
  if (
    entity === "acoes" &&
    !d.hipoteses.some(
      (h) => h.id === row.hipotese_id && h.estado === "validada",
    )
  )
    throw Error(
      "Valide a hipótese por evidências antes de criar uma contramedida.",
    );
  if (
    entity === "hipoteses" &&
    row.estado !== "validada" &&
    d.acoes.some((a) => a.hipotese_id === row.id)
  )
    throw Error(
      "Esta hipótese possui contramedidas e sua validação precisa ser preservada.",
    );
  if (
    entity === "analises" &&
    row.status === "concluida" &&
    !d.medicoes.some((m) => m.analise_id === row.id && m.momento === "depois")
  )
    throw Error("Registre a medição depois antes de concluir.");
  if (entity === "causas") {
    let parent = row.parent_id;
    const visited = new Set([row.id]);
    while (parent) {
      if (visited.has(parent))
        throw Error("A subcausa não pode criar um ciclo.");
      visited.add(parent);
      parent = d.causas.find((c) => c.id === parent)?.parent_id;
    }
  }
}
