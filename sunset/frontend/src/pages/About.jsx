import "./ContentPages.css";

export default function About() {
  return <div className="page-shell container">
    <p className="page-kicker">История SUNSET</p><h1 className="page-title">Одежда для жизни<br />в своём ритме</h1>
    <section className="editorial-grid">
      <div className="editorial-photo" role="img" aria-label="Коллекция SUNSET" />
      <div className="editorial-copy"><h2>Простые вещи.<br />Сильный характер.</h2><p>SUNSET появился как идея гардероба, который не спорит с человеком. Мы соединяем чистые линии, спокойную палитру и удобную посадку — чтобы каждая вещь легко становилась вашей.</p><p>Коллекции выпускаются небольшими тиражами. Мы выбираем долговечные материалы и создаём модели, которые остаются актуальными дольше одного сезона.</p></div>
    </section>
    <section className="values-grid"><article className="value-card"><span>01</span><h3>Осознанный выбор</h3><p>Небольшие партии и продуманный ассортимент без лишнего перепроизводства.</p></article><article className="value-card"><span>02</span><h3>Комфорт каждый день</h3><p>Посадка, материалы и детали проверяются на реальных сценариях жизни.</p></article><article className="value-card"><span>03</span><h3>Честный стиль</h3><p>Вещи, которые легко сочетать и носить по-своему.</p></article></section>
  </div>;
}
