"use client";
import { useRef, useState } from "react";
import { Data, Entity, Row, labels, dimensions, schemas } from "@/lib/domain";
import { Button, Field, FieldSpec, Modal } from "./ui";
const opts = (keys: string[]) =>
  keys.map((value) => ({ value, label: labels[value] ?? value }));
const f = (
  key: string,
  label: string,
  type = "text",
  wide = false,
  hint?: string,
): FieldSpec => ({ key, label, type, wide, hint });
export function fields(
  entity: Entity,
  data: Data,
  analysis: string,
  row?: Row,
): FieldSpec[] {
  const causes = data.causas.filter((c) => c.analise_id === analysis),
    hypotheses = data.hipoteses.filter(
      (h) => h.analise_id === analysis && h.estado === "validada",
    );
  const select = (key: string, label: string, keys: string[]) => ({
    ...f(key, label),
    options: opts(keys),
  });
  return {
    analises: [
      f("titulo", "Título da análise", "text", true),
      f(
        "desvio",
        "Desvio observável",
        "textarea",
        true,
        "Descreva o que ocorreu, onde, quando e como foi medido.",
      ),
      f("indicador", "Indicador"),
      f("unidade", "Unidade (%, dias, itens…)"),
      f("baseline_valor", "Valor do baseline", "number"),
      f("meta_valor", "Meta", "number"),
      f("baseline_inicio", "Início do período", "date"),
      f("baseline_fim", "Fim do período", "date"),
      select("direcao", "Direção de melhora", ["menor_melhor", "maior_melhor"]),
      f("responsavel", "Responsável pela análise"),
      select("status", "Etapa", [
        "rascunho",
        "investigando",
        "contramedidas",
        "medindo",
        "concluida",
        "reaberta",
      ]),
    ],
    causas: [
      f("causa", "Possível causa", "textarea", true),
      select("dimensao", "Dimensão", [...dimensions]),
      {
        ...f("parent_id", "Subcausa de (opcional)"),
        options: [
          { value: "", label: "Causa primária" },
          ...causes
            .filter((c) => c.id !== row?.id)
            .map((c) => ({ value: c.id, label: c.causa })),
        ],
      },
      f(
        "porques",
        "Cadeia de porquês",
        "textarea",
        true,
        "Um porquê por linha. Vá até uma explicação testável.",
      ),
      select("origem", "Origem", [
        "workshop",
        "retrospectiva",
        "incidente",
        "dado",
        "ia_sugerida",
      ]),
    ],
    hipoteses: [
      {
        ...f("causa_id", "Causa relacionada"),
        options: causes.map((c) => ({ value: c.id, label: c.causa })),
      },
      f("enunciado", "Hipótese testável", "textarea", true),
      f("evidencia_necessaria", "Evidência necessária", "textarea", true),
      f("fonte_evidencia", "Fonte da evidência", "text", true),
      f("impacto", "Impacto · 1 a 5", "number"),
      f("forca_evidencia", "Força da evidência · 1 a 5", "number"),
      f("viabilidade", "Viabilidade · 1 a 5", "number"),
      f("frequencia", "Ocorrências observadas", "number"),
      select("estado", "Estado da investigação", [
        "hipotese",
        "em_teste",
        "validada",
        "refutada",
        "inconclusiva",
      ]),
      f(
        "resultado_teste",
        "Resultado do teste / evidência",
        "textarea",
        true,
        "Obrigatório para validar ou refutar. Registre o que o dado mostrou.",
      ),
    ],
    riscos: [
      f("descricao", "Descrição do risco", "textarea", true),
      select("categoria", "Categoria", [
        "seguranca",
        "financeiro",
        "disponibilidade",
        "prazo",
        "pessoas",
        "conformidade",
      ]),
      f("dono", "Responsável pelo risco"),
      f("probabilidade", "Probabilidade · 1 a 5", "number"),
      f("severidade", "Severidade · 1 a 5", "number"),
      select("resposta", "Resposta", [
        "mitigar",
        "transferir",
        "aceitar",
        "evitar",
      ]),
      select("status", "Situação", [
        "aberto",
        "monitorado",
        "materializado",
        "encerrado",
      ]),
      f("gatilho", "Gatilho / justificativa de aceite", "textarea", true),
    ],
    acoes: [
      {
        ...f("hipotese_id", "Causa validada por evidência"),
        options: hypotheses.map((h) => ({ value: h.id, label: h.enunciado })),
      },
      select("tipo", "Tipo da contramedida", [
        "contencao",
        "corretiva",
        "preventiva",
      ]),
      f("o_que", "O que será feito?", "textarea", true),
      f("por_que", "Por que fazer?", "textarea", true),
      f("quem", "Quem é responsável?"),
      f("onde", "Onde será aplicado?"),
      f("quando", "Prazo", "date"),
      f("quanto", "Quanto custa?"),
      f("como", "Como será feito?", "textarea", true),
      select("status", "Situação", [
        "planejada",
        "em_andamento",
        "concluida",
        "cancelada",
      ]),
      f(
        "efeito_observado",
        "Efeito observado",
        "textarea",
        true,
        "Obrigatório para concluir a ação.",
      ),
    ],
    medicoes: [
      select("momento", "Momento", ["antes", "depois"]),
      f("data_ref", "Data de referência", "date"),
      f("valor", "Valor do indicador", "number"),
      f("amostra", "Tamanho da amostra", "number"),
      f("p50", "P50 (opcional)", "number"),
      f("p85", "P85 (opcional)", "number"),
      f("observacao", "Contexto da medição", "textarea", true),
    ],
  }[entity];
}
const names: Record<Entity, string> = {
  analises: "análise",
  causas: "causa",
  hipoteses: "hipótese",
  riscos: "risco",
  acoes: "ação 5W2H",
  medicoes: "medição",
};
export function Editor({
  entity,
  row,
  seed,
  data,
  analysis,
  onClose,
  onSave,
}: {
  entity: Entity;
  row?: Row;
  seed?: Record<string, unknown>;
  data: Data;
  analysis: string;
  onClose: () => void;
  onSave: (
    entity: Entity,
    row: Row,
    values: Record<string, unknown>,
  ) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>({
    ...{
      status:
        entity === "analises"
          ? "rascunho"
          : entity === "riscos"
            ? "aberto"
            : "planejada",
      direcao: "menor_melhor",
      dimensao: "processos",
      parent_id: "",
      porques: "",
      origem: "workshop",
      estado: "hipotese",
      resultado_teste: "",
      impacto: 3,
      forca_evidencia: 1,
      viabilidade: 3,
      frequencia: 0,
      probabilidade: 3,
      severidade: 3,
      categoria: "prazo",
      resposta: "mitigar",
      gatilho: "",
      tipo: "corretiva",
      quanto: "Não estimado",
      efeito_observado: "",
      momento: "antes",
      p50: "",
      p85: "",
      observacao: "",
    },
    ...seed,
    ...row,
    porques: Array.isArray(row?.porques) ? row.porques.join("\n") : "",
  });
  const original = useRef(row ?? { id: crypto.randomUUID() });
  const [dirty, setDirty] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const lock = useRef(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    setError("");
    const parsed = schemas[entity].safeParse(draft);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        next[String(i.path[0])] = i.message;
      });
      setErrors(next);
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await onSave(entity, original.current, parsed.data);
      setDirty(false);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${row ? "Editar" : entity === "riscos" ? "Novo" : "Nova"} ${names[entity]}`}
      onClose={onClose}
      dirty={dirty}
      busy={busy}
    >
      <form ref={form} noValidate onSubmit={submit}>
        <div className="form-body">
          <p className="muted">
            {entity === "acoes"
              ? "Transforme uma causa validada em uma contramedida verificável."
              : "Registre os fatos e deixe explícito o que ainda precisa ser investigado."}
          </p>
          {entity === "acoes" &&
          !data.hipoteses.some(
            (h) => h.analise_id === analysis && h.estado === "validada",
          ) ? (
            <p className="inline-error">
              Valide uma hipótese com evidências antes de criar uma ação.
            </p>
          ) : null}
          <div className="form-grid">
            {fields(entity, data, analysis, row).map((spec) => (
              <Field
                key={spec.key}
                spec={spec}
                value={draft[spec.key]}
                error={errors[spec.key]}
                onChange={(v) => {
                  setDraft((d) => ({ ...d, [spec.key]: v }));
                  setDirty(true);
                  setErrors((e) => ({ ...e, [spec.key]: "" }));
                }}
              />
            ))}
          </div>
          {error ? (
            <p role="alert" className="inline-error">
              {error}
              {error.includes("sessão expirou") ? (
                <>
                  <br />
                  <a href="/" target="_blank" rel="noreferrer">
                    Entrar novamente em outra aba e preservar este formulário
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <footer className="modal-footer">
          <Button
            disabled={busy}
            onClick={() => {
              form.current
                ?.closest("dialog")
                ?.dispatchEvent(new Event("cancel", { cancelable: true }));
            }}
          >
            Cancelar
          </Button>
          <Button tone="primary" type="submit" busy={busy}>
            Salvar {names[entity]}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
