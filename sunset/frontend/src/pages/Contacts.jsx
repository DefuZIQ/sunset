import "./ContentPages.css";

export default function Contacts() {
  return (
    <div className="page-shell container">
      <p className="page-kicker">Мы на связи</p>
      <h1 className="page-title">Контакты</h1>
      <p className="page-intro">Поможем подобрать размер, расскажем о составе и статусе заказа. Отвечаем ежедневно с 9:00 до 21:00.</p>

      <section className="contact-grid">
        <article className="contact-card"><h3>Позвонить</h3><p><a href="tel:+79200220122">+7 (920) 022-01-22</a></p><p>Ежедневно, 9:00–21:00</p></article>
        <article className="contact-card"><h3>Написать</h3><p><a href="mailto:hello@t3ch.pro">hello@t3ch.pro</a></p><p>Ответим в течение рабочего дня</p></article>
        <article className="contact-card"><h3>Шоурум</h3><p>Нижний Новгород<br />ул. Большая Покровская, 34</p></article>
      </section>

      <section className="map-card">
        <div className="map-card__map">
          <iframe
            title="Шоурум SUNSET на карте"
            src="https://www.openstreetmap.org/export/embed.html?bbox=43.9848%2C56.3119%2C44.0052%2C56.3225&layer=mapnik&marker=56.317218%2C43.994982"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="map-card__info">
          <p className="page-kicker">SUNSET showroom</p>
          <strong>Большая Покровская, 34</strong>
          <p>Примерка и самовывоз по предварительной записи</p>
          <a href="https://www.openstreetmap.org/search?query=%D0%91%D0%BE%D0%BB%D1%8C%D1%88%D0%B0%D1%8F%20%D0%9F%D0%BE%D0%BA%D1%80%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%2034%2C%20%D0%9D%D0%B8%D0%B6%D0%BD%D0%B8%D0%B9%20%D0%9D%D0%BE%D0%B2%D0%B3%D0%BE%D1%80%D0%BE%D0%B4" target="_blank" rel="noreferrer">Открыть маршрут →</a>
        </div>
      </section>
    </div>
  );
}
