import { z } from "zod";
z.config(z.locales.pt());
export const dimensions = [
  "processos",
  "pessoas",
  "tecnologia",
  "requisitos",
  "dependencias",
  "metricas",
  "governanca",
] as const;
export const labels: Record<string, string> = {
  analises: "Análise",
  hipoteses: "Hipótese",
  acoes: "Ação",
  criado: "Criado",
  processos: "Processos",
  pessoas: "Pessoas",
  tecnologia: "Tecnologia",
  requisitos: "Requisitos",
  dependencias: "Dependências",
  metricas: "Métricas",
  governanca: "Governança",
  hipotese: "Hipótese",
  em_teste: "Em teste",
  validada: "Validada",
  refutada: "Refutada",
  inconclusiva: "Inconclusiva",
  rascunho: "Rascunho",
  investigando: "Investigando",
  contramedidas: "Contramedidas",
  medindo: "Medindo",
  concluida: "Concluída",
  reaberta: "Reaberta",
  planejada: "Planejada",
  em_andamento: "Em andamento",
  cancelada: "Cancelada",
  contencao: "Contenção",
  corretiva: "Corretiva",
  preventiva: "Preventiva",
  menor_melhor: "Menor é melhor",
  maior_melhor: "Maior é melhor",
  antes: "Antes",
  depois: "Depois",
  seguranca: "Segurança",
  financeiro: "Financeiro",
  disponibilidade: "Disponibilidade",
  prazo: "Prazo",
  conformidade: "Conformidade",
  mitigar: "Mitigar",
  transferir: "Transferir",
  aceitar: "Aceitar",
  evitar: "Evitar",
  aberto: "Aberto",
  monitorado: "Monitorado",
  materializado: "Materializado",
  encerrado: "Encerrado",
  workshop: "Workshop",
  retrospectiva: "Retrospectiva",
  incidente: "Incidente",
  dado: "Dado",
  ia_sugerida: "Sugerida por IA",
};
// Flexible database row; all incoming mutations are parsed with the schemas below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = { id: string; version?: number; [key: string]: any };
export type Entity =
  "analises" | "causas" | "hipoteses" | "riscos" | "acoes" | "medicoes";
export type Data = Record<Entity, Row[]> & {
  efeitos: Row[];
  historico: Row[];
  time_id: string;
};
const txt = (min = 2) =>
  z
    .string({ error: "Preencha este campo." })
    .trim()
    .min(min, `Escreva pelo menos ${min} caracteres.`);
const num = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.coerce
    .number({ error: "Informe um número válido." })
    .finite("Informe um número válido."),
);
const grade = z.coerce.number().int().min(1).max(5);
const date = z.iso.date("Informe uma data válida.");
const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null ? null : v),
  num.nullable(),
);
export const schemas = {
  analises: z
    .object({
      titulo: txt(5),
      desvio: txt(20),
      indicador: txt(),
      unidade: txt(1),
      baseline_valor: num,
      meta_valor: num,
      baseline_inicio: date,
      baseline_fim: date,
      direcao: z.enum(["menor_melhor", "maior_melhor"]),
      responsavel: txt(),
      status: z.enum([
        "rascunho",
        "investigando",
        "contramedidas",
        "medindo",
        "concluida",
        "reaberta",
      ]),
    })
    .superRefine((v, c) => {
      if (v.baseline_fim < v.baseline_inicio)
        c.addIssue({
          code: "custom",
          path: ["baseline_fim"],
          message: "A data final deve ser igual ou posterior à inicial.",
        });
      if (
        (v.direcao === "menor_melhor" && v.meta_valor >= v.baseline_valor) ||
        (v.direcao === "maior_melhor" && v.meta_valor <= v.baseline_valor)
      )
        c.addIssue({
          code: "custom",
          path: ["meta_valor"],
          message: "A meta deve melhorar o baseline na direção escolhida.",
        });
    }),
  causas: z.object({
    causa: txt(5),
    dimensao: z.enum(dimensions),
    parent_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
    porques: z.union([z.string(), z.array(z.string())]).transform((v) =>
      typeof v === "string"
        ? v
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : v,
    ),
    origem: z.enum([
      "workshop",
      "retrospectiva",
      "incidente",
      "dado",
      "ia_sugerida",
    ]),
  }),
  hipoteses: z
    .object({
      causa_id: z.uuid("Selecione uma causa."),
      enunciado: txt(15),
      evidencia_necessaria: txt(10),
      fonte_evidencia: txt(),
      impacto: grade,
      forca_evidencia: grade,
      viabilidade: grade,
      frequencia: z.coerce.number().int().min(0),
      estado: z.enum([
        "hipotese",
        "em_teste",
        "validada",
        "refutada",
        "inconclusiva",
      ]),
      resultado_teste: z.string().trim(),
    })
    .superRefine((v, c) => {
      if (
        ["validada", "refutada"].includes(v.estado) &&
        v.resultado_teste.length < 10
      )
        c.addIssue({
          code: "custom",
          path: ["resultado_teste"],
          message:
            "Registre o resultado do teste com pelo menos 10 caracteres.",
        });
    }),
  riscos: z
    .object({
      descricao: txt(15),
      categoria: z.enum([
        "seguranca",
        "financeiro",
        "disponibilidade",
        "prazo",
        "pessoas",
        "conformidade",
      ]),
      probabilidade: grade,
      severidade: grade,
      resposta: z.enum(["mitigar", "transferir", "aceitar", "evitar"]),
      gatilho: z.string().trim(),
      dono: txt(),
      status: z.enum(["aberto", "monitorado", "materializado", "encerrado"]),
    })
    .superRefine((v, c) => {
      if (v.resposta === "aceitar" && v.gatilho.length < 10)
        c.addIssue({
          code: "custom",
          path: ["gatilho"],
          message: "Justifique o aceite e informe o gatilho de revisão.",
        });
    }),
  acoes: z
    .object({
      hipotese_id: z.uuid("Selecione uma hipótese validada."),
      o_que: txt(10),
      por_que: txt(10),
      quem: txt(),
      onde: txt(),
      quando: date,
      como: txt(10),
      quanto: txt(1),
      tipo: z.enum(["contencao", "corretiva", "preventiva"]),
      status: z.enum(["planejada", "em_andamento", "concluida", "cancelada"]),
      efeito_observado: z.string().trim(),
    })
    .superRefine((v, c) => {
      if (v.status === "concluida" && v.efeito_observado.length < 10)
        c.addIssue({
          code: "custom",
          path: ["efeito_observado"],
          message: "Descreva o efeito observado antes de concluir.",
        });
    }),
  medicoes: z
    .object({
      momento: z.enum(["antes", "depois"]),
      data_ref: date,
      valor: num,
      amostra: z.coerce
        .number()
        .int()
        .positive("A amostra precisa ser maior que zero."),
      p50: optionalNumber,
      p85: optionalNumber,
      observacao: z.string().trim(),
    })
    .superRefine((v, c) => {
      if (v.p50 !== null && v.p85 !== null && v.p85 < v.p50)
        c.addIssue({
          code: "custom",
          path: ["p85"],
          message: "P85 deve ser maior ou igual a P50.",
        });
    }),
};
export const format = (n: unknown) =>
  n === null || n === undefined
    ? "—"
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
        Number(n),
      );
export const dateLabel = (s: string) =>
  s
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
        new Date(s.slice(0, 10) + "T12:00:00Z"),
      )
    : "—";
export function riskPriority(r: Row) {
  const score = Number(r.probabilidade) * Number(r.severidade),
    promoted =
      ["seguranca", "conformidade", "disponibilidade"].includes(r.categoria) &&
      Number(r.severidade) === 5;
  return {
    level:
      promoted || score >= 20
        ? "Crítico"
        : score >= 12
          ? "Alto"
          : score >= 6
            ? "Médio"
            : "Baixo",
    promoted: promoted && score < 20,
  };
}
export const emptyData = (): Data => ({
  analises: [],
  causas: [],
  hipoteses: [],
  riscos: [],
  acoes: [],
  medicoes: [],
  efeitos: [],
  historico: [],
  time_id: "",
});
