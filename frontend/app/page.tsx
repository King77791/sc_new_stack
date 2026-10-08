export default function Home() {
  return (
    <main className="page">
      <p className="eyebrow">Стартовый каркас</p>
      <h1>SSR-приложение</h1>
      <p className="description">
        Next.js формирует эту страницу на сервере, а PHP предоставляет JSON API.
      </p>
      <section className="status" aria-live="polite">
        <span className="indicator offline" />
        <div>
          <strong>Backend</strong>
          <p>Пока заглушка</p>
        </div>
      </section>
    </main>
  );
}
