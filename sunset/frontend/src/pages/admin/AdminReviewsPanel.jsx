import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listAdminReviews, moderateAdminReview, saveAdminReviewReply } from "../../api/client";

export default function AdminReviewsPanel() {
  const [reviews, setReviews] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [moderating, setModerating] = useState(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdminReviews(localStorage.getItem("authToken"));
      setReviews(data);
      setDrafts(Object.fromEntries(data.map((item) => [item.id, item.storeReply || ""])));
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Не удалось загрузить отзывы");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const visible = useMemo(() => reviews.filter((item) => filter === "all" || (filter === "hidden" ? item.isHidden : filter === "published" ? !item.isHidden : filter === "unanswered" ? !item.storeReply : Boolean(item.storeReply))), [reviews, filter]);
  const save = async (item, reply) => {
    setSaving(item.id);
    try {
      const updated = await saveAdminReviewReply(localStorage.getItem("authToken"), item.id, { reply });
      setReviews((current) => current.map((review) => review.id === item.id ? updated : review));
      setDrafts((current) => ({ ...current, [item.id]: updated.storeReply || "" }));
      setMessage(reply ? "Ответ магазина сохранён" : "Ответ магазина удалён");
    } catch (error) {
      setMessage(error.message || "Не удалось сохранить ответ");
    } finally {
      setSaving(null);
    }
  };
  const moderate = async (item) => {
    setModerating(item.id);
    try {
      const updated = await moderateAdminReview(localStorage.getItem("authToken"), item.id, { isHidden: !item.isHidden });
      setReviews((current) => current.map((review) => review.id === item.id ? updated : review));
      setMessage(updated.isHidden ? "Отзыв скрыт из магазина и рейтинга" : "Отзыв снова опубликован");
    } catch (error) {
      setMessage(error.message || "Не удалось изменить видимость отзыва");
    } finally {
      setModerating(null);
    }
  };

  return <section className="admin-review-panel">
    <div className="admin-review-panel__head"><div><p className="page-kicker">Обратная связь</p><h2>Отзывы покупателей</h2><small>Последние 200 отзывов</small></div><button type="button" onClick={load} disabled={loading}>Обновить</button></div>
    <div className="admin-review-panel__filters" aria-label="Фильтр отзывов">{[["all", "Все"], ["published", "Опубликованы"], ["hidden", "Скрыты"], ["unanswered", "Без ответа"], ["answered", "С ответом"]].map(([value, label]) => <button type="button" key={value} className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
    {message && <p className="admin-review-panel__message" role="status">{message}</p>}
    {loading ? <p>Загружаем отзывы…</p> : visible.length ? <div className="admin-review-panel__list">{visible.map((item) => <article className="admin-review-card" key={item.id}>
      <div className="admin-review-card__meta"><Link to={`/catalog/product/${item.productId}`}>{item.productName}</Link><span>{item.authorName} · {item.rating} ★{item.verifiedPurchase ? " · покупка подтверждена" : ""}</span><span className={`admin-review-card__status ${item.isHidden ? "is-hidden" : ""}`}>{item.isHidden ? "Скрыт" : "Опубликован"}</span><time>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("ru-RU") : ""}</time></div>
      <p>{item.body}</p>
      {item.storeReply && <blockquote><strong>SUNSET отвечает</strong><span>{item.storeReply}</span></blockquote>}
      <label>Ответ магазина<textarea maxLength={1500} value={drafts[item.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Напишите ответ покупателю" /></label>
      <div className="admin-review-card__actions"><button type="button" disabled={saving === item.id || !(drafts[item.id] || "").trim()} onClick={() => save(item, (drafts[item.id] || "").trim())}>Сохранить ответ</button>{item.storeReply && <button type="button" disabled={saving === item.id} onClick={() => { if (window.confirm("Удалить ответ магазина?")) save(item, ""); }}>Удалить ответ</button>}<button type="button" disabled={moderating === item.id} onClick={() => { if (item.isHidden || window.confirm("Скрыть отзыв из магазина и рейтинга?")) moderate(item); }}>{item.isHidden ? "Опубликовать" : "Скрыть отзыв"}</button></div>
    </article>)}</div> : <div className="admin-review-panel__empty">{reviews.length ? "По этому фильтру отзывов нет." : "Пока нет отзывов покупателей."}</div>}
  </section>;
}
