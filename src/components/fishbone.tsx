"use client";
import { dimensions, labels, Row } from "@/lib/domain";
export function Fishbone({
  analysis,
  causes,
  hypotheses,
  onCause,
  onDimension,
}: {
  analysis: Row;
  causes: Row[];
  hypotheses: Row[];
  onCause: (c: Row) => void;
  onDimension: (d: string) => void;
}) {
  return (
    <>
      <div className="diagram-scroll">
        <svg
          viewBox="0 0 1080 410"
          className="fishbone"
          aria-label={`Ishikawa: ${analysis.titulo}. ${dimensions.map((d) => `${labels[d]}: ${causes.filter((c) => c.dimensao === d).length} causas`).join("; ")}`}
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          <path className="spine" d="M30 205 H910" markerEnd="url(#arrow)" />
          {dimensions.map((d, i) => {
            const top = i % 2 === 0,
              x = 145 + Math.floor(i / 2) * 210 + (top ? 0 : 90),
              y = top ? 65 : 345,
              cs = causes.filter((c) => c.dimensao === d && !c.parent_id);
            return (
              <g key={d}>
                <path
                  className={`bone ${cs.length ? "" : "unexplored"}`}
                  d={`M${x} ${y} L${x + 85} 205`}
                />
                <foreignObject
                  x={x - 65}
                  y={top ? 14 : 350}
                  width="200"
                  height="40"
                >
                  <button
                    className="dimension-button"
                    onClick={() => onDimension(d)}
                  >
                    {labels[d]}{" "}
                    <span>{causes.filter((c) => c.dimensao === d).length}</span>
                  </button>
                </foreignObject>
                {cs.slice(0, 2).map((c, j) => {
                  const cy = top ? 105 + j * 51 : 300 - j * 51,
                    cx = x + (top ? cy - y : y - cy) * 0.61,
                    h = hypotheses
                      .filter((h) => h.causa_id === c.id)
                      .sort((a, b) => b.score - a.score)[0],
                    symbol =
                      h?.estado === "validada"
                        ? "●"
                        : h?.estado === "refutada"
                          ? "×"
                          : h?.estado === "em_teste"
                            ? "◐"
                            : "○",
                    children = causes.filter((s) => s.parent_id === c.id);
                  return (
                    <g key={c.id}>
                      <path className="twig" d={`M${cx} ${cy} h-62`} />
                      <foreignObject
                        x={cx - 140}
                        y={cy - 31}
                        width="205"
                        height="49"
                      >
                        <button
                          title={c.causa}
                          className="cause-button"
                          onClick={() => onCause(c)}
                        >
                          <span>{symbol}</span>
                          {c.causa.length > 36
                            ? c.causa.slice(0, 35) + "…"
                            : c.causa}
                          {children.length ? ` (+${children.length})` : ""}
                        </button>
                      </foreignObject>
                      {children.length ? (
                        <path
                          className="twig"
                          d={`M${cx - 40} ${cy} l-15 ${top ? 18 : -18}`}
                        />
                      ) : null}
                    </g>
                  );
                })}
              </g>
            );
          })}
          <rect
            className="effect-box"
            x="925"
            y="145"
            width="145"
            height="120"
            rx="12"
          />
          <foreignObject x="937" y="159" width="120" height="100">
            <div className="effect-label">
              <small>EFEITO OBSERVADO</small>
              <strong>{analysis.indicador}</strong>
              <span>
                {analysis.baseline_valor}
                {analysis.unidade} → meta {analysis.meta_valor}
                {analysis.unidade}
              </span>
            </div>
          </foreignObject>
        </svg>
      </div>
      <p className="diagram-legend">
        ○ Hipótese <span>◐ Em teste</span>
        <span>● Validada</span>
        <span>× Refutada</span>
        <span>Tracejado: dimensão ainda não investigada</span>
      </p>
      <details className="cause-list">
        <summary>
          Ver todas as causas em lista acessível ({causes.length})
        </summary>
        {dimensions.map((d) => (
          <section key={d}>
            <h4>{labels[d]}</h4>
            {causes
              .filter((c) => c.dimensao === d)
              .map((c) => (
                <button
                  className="list-cause"
                  onClick={() => onCause(c)}
                  key={c.id}
                >
                  {c.parent_id ? "↳ " : ""}
                  {c.causa}
                </button>
              ))}
            {!causes.some((c) => c.dimensao === d) ? (
              <p className="muted">Nenhuma causa registrada.</p>
            ) : null}
          </section>
        ))}
      </details>
    </>
  );
}
