import Link from "next/link";
export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="panel">
        <h1>Página não encontrada</h1>
        <Link href="/">Voltar às análises</Link>
      </section>
    </main>
  );
}
