"use client";
import {
  useEffect,
  useRef,
  useState,
  ReactNode,
  ButtonHTMLAttributes,
} from "react";
import { X, LoaderCircle, CheckCircle2, AlertCircle } from "lucide-react";
export function Button({
  children,
  busy = false,
  tone = "neutral",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  tone?: string;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || busy}
      aria-busy={busy}
      className={`button ${tone} ${props.className ?? ""}`}
    >
      {busy ? <LoaderCircle className="spin" size={17} /> : null}
      <span
        className="button-content"
        style={{ visibility: busy ? "hidden" : undefined }}
      >
        {children}
      </span>
    </button>
  );
}
export function Badge({ value }: { value: string }) {
  const positive = ["validada", "concluida"].includes(value),
    warning = ["reaberta", "em_teste", "medindo", "materializado"].includes(
      value,
    );
  return (
    <span
      className={`badge ${positive ? "positive" : warning ? "warning" : ""}`}
    >
      {value === "validada"
        ? "● "
        : value === "refutada"
          ? "× "
          : value === "em_teste"
            ? "◐ "
            : ""}
      {value}
    </span>
  );
}
export function Notice({
  text,
  error = false,
  onClose,
}: {
  text: string;
  error?: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
      <span>{text}</span>
      <Button aria-label="Fechar mensagem" onClick={onClose}>
        <X size={16} />
      </Button>
    </div>
  );
}
export type FieldSpec = {
  key: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  hint?: string;
  wide?: boolean;
};
export function Field({
  spec,
  value,
  error,
  onChange,
}: {
  spec: FieldSpec;
  value: unknown;
  error?: string;
  onChange: (v: string) => void;
}) {
  const id = "field-" + spec.key;
  const dateInput = spec.type === "date";
  const raw = String(value ?? "");
  const common = {
    id,
    name: spec.key,
    value:
      dateInput && /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? raw.split("-").reverse().join("/")
        : raw,
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const v = e.target.value;
      onChange(
        dateInput && /^\d{2}\/\d{2}\/\d{4}$/.test(v)
          ? v.split("/").reverse().join("-")
          : v,
      );
    },
    "aria-invalid": Boolean(error),
    "aria-describedby": spec.hint || error ? id + "-help" : undefined,
  };
  return (
    <div className={`field ${spec.wide ? "wide" : ""}`}>
      <label htmlFor={id}>{spec.label}</label>
      {spec.options ? (
        <select {...common}>
          <option value="">Selecione…</option>
          {spec.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : spec.type === "textarea" ? (
        <textarea
          {...common}
          rows={4}
          className="resize-none"
          style={{ resize: "none" }}
        />
      ) : (
        <input
          {...common}
          type={dateInput ? "text" : (spec.type ?? "text")}
          placeholder={dateInput ? "DD/MM/AAAA" : undefined}
          inputMode={dateInput ? "numeric" : undefined}
          step={spec.type === "number" ? "any" : undefined}
        />
      )}
      <small id={id + "-help"} className={error ? "field-error" : ""}>
        {error || spec.hint || "\u00a0"}
      </small>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  dirty = false,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  dirty?: boolean;
  busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    previous = useRef<HTMLElement | null>(null);
  const [discard, setDiscard] = useState(false);
  const requestClose = () => {
    if (busy) return;
    if (dirty) setDiscard(true);
    else onClose();
  };
  useEffect(() => {
    previous.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      previous.current?.focus();
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
    >
      <div className="modal-top">
        <h2 id="modal-title">{title}</h2>
        <Button
          onClick={requestClose}
          disabled={busy}
          aria-label="Fechar formulário"
        >
          <X size={20} />
        </Button>
      </div>
      {discard ? (
        <div className="discard">
          <h3>Descartar as alterações?</h3>
          <p>As alterações deste formulário ainda não foram salvas.</p>
          <div className="actions">
            <Button autoFocus onClick={() => setDiscard(false)}>
              Continuar editando
            </Button>
            <Button tone="warning" onClick={onClose}>
              Descartar alterações
            </Button>
          </div>
        </div>
      ) : (
        children
      )}
    </dialog>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">⌁</div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
