import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./ContentPages.css";

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  useEffect(() => { fetch("/order/promotions").then((response) => response.ok ? response.json() : []).then(setPromotions).catch(() => {}); }, []);
  return <div className="page-shell container promotions-page"><p className="page-kicker">SUNSET CLUB</p><h1 className="page-title">Акции и привилегии</h1><p className="page-intro">Персональные предложения, промокоды и больше бонусов за вещи, которые вам нравятся.</p><div className="promotion-grid">{promotions.map((promo, index) => <article className={index === 0 ? "promotion-card promotion-card--dark" : "promotion-card"} key={promo.id}><span>{promo.discountPercent > 0 ? `−${promo.discountPercent}%` : `×${promo.bonusMultiplier} бонусов`}</span><p className="page-kicker">ПРОМОКОД {promo.code}</p><h2>{promo.title}</h2><p>{promo.description}</p><small>{Number(promo.minOrder) > 0 ? `При заказе от ${Number(promo.minOrder).toLocaleString("ru-RU")} ₽` : "Без минимальной суммы"}</small><button onClick={() => navigator.clipboard?.writeText(promo.code)}>Скопировать {promo.code}</button></article>)}</div><section className="birthday-promo"><div><p className="page-kicker">ВАШ ОСОБЕННЫЙ ДЕНЬ</p><h2>Дарим скидку 15% и двойные бонусы</h2><p>Добавьте дату рождения в личном кабинете — предложение применится автоматически в этот день.</p></div><Link className="primary-action" to="/profile/settings">Добавить дату рождения</Link></section></div>;
}
