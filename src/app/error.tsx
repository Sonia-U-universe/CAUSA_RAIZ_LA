"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="auth-page">
      <section className="panel">
        <h1>Não foi possível abrir esta página</h1>
        <p>
          Seus registros salvos continuam no banco. Tente carregar novamente.
        </p>
        <button className="primary" onClick={reset}>
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
