import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiHttpError, cancelMyOrder, createOrderReturn, getMyOrder, updatePendingOrder } from "../api/client";
import "./ContentPages.css";

const statusLabels = { PENDING:"Ожидает подтверждения", CONFIRMED:"Подтверждён", ASSEMBLING:"Собирается", SHIPPED:"Передан в доставку", DELIVERED:"Доставлен", CANCELLED:"Отменён" };
const statusSteps = ["PENDING", "CONFIRMED", "ASSEMBLING", "SHIPPED", "DELIVERED"];

export default function OrderDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({ reason:"SIZE", comment:"" });
  const [returnState, setReturnState] = useState({ loading:false, error:"", message:"" });
  const [editForm, setEditForm] = useState({ customerName:"", customerEmail:"", customerPhone:"", deliveryMethod:"courier", address:"" });
  const load = useCallback(() => {
    setError("");
    return getMyOrder(localStorage.getItem("authToken"), id)
      .then(setOrder)
      .catch((e) => setError(e instanceof ApiHttpError && e.status === 404 ? "Заказ не найден" : e.message))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { if (user) load(); else navigate("/login"); }, [user, load, navigate]);
  useEffect(() => { if (order) setEditForm({ customerName:order.customerName || "", customerEmail:order.customerEmail || "", customerPhone:order.customerPhone || "", deliveryMethod:order.delivery?.deliveryMethod || "courier", address:order.delivery?.address || "" }); }, [order]);
  const cancel = async () => {
    if (!window.confirm("Отменить заказ? Начисленные бонусы будут компенсированы.")) return;
    setActionError("");
    try { await cancelMyOrder(localStorage.getItem("authToken"), id); await load(); }
    catch (e) { setActionError(e.message || "Не удалось отменить заказ"); }
  };
  const saveChanges = async () => {
    setActionError("");
    try { setOrder(await updatePendingOrder(localStorage.getItem("authToken"), id, editForm)); setEditMode(null); }
    catch (e) { setActionError(e.message || "Не удалось сохранить изменения"); }
  };
  const createReturn = async () => {
    setReturnState({loading:true,error:"",message:""});
    try {
      await createOrderReturn(localStorage.getItem("authToken"), id, returnForm);
      setReturnState({loading:false,error:"",message:"Заявка принята. Мы сообщим о следующем шаге."});
      setReturnOpen(false); await load();
    } catch (e) { setReturnState({loading:false,error:e.message || "Не удалось создать заявку",message:""}); }
  };
  if (loading) return <div className="page-shell container"><div className="order-loading">Загружаем детали заказа…</div></div>;
  if (error || !order) return <div className="page-shell container"><div className="empty-state"><h2>{error || "Заказ не найден"}</h2><Link className="text-link" to="/profile/orders">Вернуться к заказам</Link></div></div>;
  const currentStep = statusSteps.indexOf(order.status);
  return <div className="page-shell container order-detail">
    <Link className="text-link order-detail__back" to="/profile/orders">← Все заказы</Link>
    {actionError && <p className="checkout-error" role="alert">{actionError}</p>}
    <header className="order-detail__hero"><div><p className="page-kicker">Заказ от {new Date(order.createdAt).toLocaleDateString("ru-RU")}</p><h1>{order.orderNumber}</h1><span className={`order-detail__status order-detail__status--${order.status.toLowerCase()}`}>{statusLabels[order.status] || order.status}</span></div><div className="order-detail__hero-total"><span>Сумма заказа</span><strong>{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</strong></div></header>
    {order.status !== "CANCELLED" && <div className="order-timeline">{statusSteps.map((step, index) => <div className={index <= currentStep ? "active" : ""} key={step}><i>{index < currentStep ? "✓" : index + 1}</i><span>{statusLabels[step]}</span></div>)}</div>}
    {order.status === "CANCELLED" && <div className="order-cancelled-note"><strong>Заказ отменён</strong><span>Начисленные бонусы списаны компенсационной операцией, использованные — возвращены.</span></div>}
    <div className="order-detail__grid"><section className="order-detail__card order-detail__products"><div className="order-detail__section-head"><span>01</span><h2>Состав заказа</h2></div>{order.items?.length ? order.items.map((item) => <article className="order-detail__item" key={`${item.productId}-${item.sizeId}-${item.colorId}`}><div className="order-detail__image">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>S</span>}</div><div className="order-detail__item-copy"><strong>{item.name}</strong><span>{[item.sizeName && `Размер ${item.sizeName}`, item.colorName].filter(Boolean).join(" · ") || "Стандартная комплектация"}</span><small>Количество: {item.quantity}</small></div><div className="order-detail__item-price"><span>{Number(item.price).toLocaleString("ru-RU")} ₽</span><strong>{(Number(item.price) * item.quantity).toLocaleString("ru-RU")} ₽</strong></div></article>) : <p className="muted">Состав заказа не найден.</p>}</section>
      <aside className="order-detail__card order-detail__summary"><div className="order-detail__section-head"><span>02</span><h2>Оплата</h2></div><div><span>Товары</span><strong>{Number(order.subtotal).toLocaleString("ru-RU")} ₽</strong></div><div><span>Скидка</span><strong>−{Number(order.discountAmount || 0).toLocaleString("ru-RU")} ₽</strong></div><div><span>Списано бонусов</span><strong>−{order.bonusesUsed || 0} ₽</strong></div>{Number(order.delivery?.cost)>0&&<div><span>Доставка</span><strong>{Number(order.delivery.cost).toLocaleString("ru-RU")} ₽</strong></div>}{order.promoCode && <div><span>Промокод</span><strong>{order.promoCode}</strong></div>}<hr /><div className="order-detail__grand-total"><strong>Итого</strong><strong>{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</strong></div><div className={`payment-state payment-state--${String(order.payment?.status||"pending").toLowerCase()}`}><span>{order.payment?.method === "SBP" ? "СБП" : order.payment?.method === "ON_RECEIPT" ? "При получении" : "Банковская карта"}</span><strong>{({PAID:"Оплачено",PENDING:"Ожидает оплаты",REFUNDED:"Возвращено"})[order.payment?.status]||order.payment?.status||"Уточняется"}</strong><small>{order.payment?.provider === "STUB" ? "Тестовый платёж" : order.payment?.provider}</small></div><p className="order-detail__bonus">+{order.bonusesEarned || 0} бонусов за заказ</p></aside>
    </div>
    {editMode ? <div className="order-edit-panel"><div className="order-detail__section-head"><span>{editMode === "delivery" ? "03" : "04"}</span><h2>{editMode === "delivery" ? "Изменение получения" : "Изменение получателя"}</h2></div>{editMode === "delivery" && <><div className="order-edit-switch"><button className={editForm.deliveryMethod === "courier" ? "active" : ""} onClick={() => setEditForm({...editForm,deliveryMethod:"courier",address:""})}>Доставка</button><button className={editForm.deliveryMethod === "pickup" ? "active" : ""} onClick={() => setEditForm({...editForm,deliveryMethod:"pickup",address:"SUNSET Нижний Новгород, Большая Покровская, 34"})}>Самовывоз</button></div>{editForm.deliveryMethod === "pickup" ? <label><span>Магазин</span><select value={editForm.address} onChange={(e) => setEditForm({...editForm,address:e.target.value})}><option value="SUNSET Нижний Новгород, Большая Покровская, 34">SUNSET Нижний Новгород — Большая Покровская, 34</option><option value="SUNSET в ТРЦ НЕБО, Большая Покровская, 82">SUNSET в ТРЦ НЕБО — Большая Покровская, 82</option></select></label> : <label><span>Адрес доставки</span><input value={editForm.address} onChange={(e) => setEditForm({...editForm,address:e.target.value})} placeholder="Город, улица, дом, квартира" /></label>}</>} {editMode === "recipient" && <div className="order-edit-grid"><label><span>Получатель</span><input value={editForm.customerName} onChange={(e) => setEditForm({...editForm,customerName:e.target.value})} /></label><label><span>Телефон</span><input value={editForm.customerPhone} onChange={(e) => setEditForm({...editForm,customerPhone:e.target.value})} /></label><label><span>E-mail</span><input type="email" value={editForm.customerEmail} onChange={(e) => setEditForm({...editForm,customerEmail:e.target.value})} /></label></div>}<div className="order-edit-actions"><button className="link-button" onClick={() => setEditMode(null)}>Отмена</button><button className="primary-action" onClick={saveChanges}>Сохранить изменения</button></div></div> : <div className="order-detail__grid order-detail__grid--bottom"><section className="order-detail__card"><div className="order-detail__section-head"><span>03</span><h2>Получение</h2>{order.status === "PENDING" && <button className="order-edit-pencil" onClick={() => setEditMode("delivery")} aria-label="Изменить получение">✎</button>}</div><p className="order-detail__address">{order.delivery?.address || "Адрес уточняется"}</p><small>{order.delivery?.deliveryMethod === "pickup" ? "Самовывоз" : "Доставка курьером"}</small></section><section className="order-detail__card"><div className="order-detail__section-head"><span>04</span><h2>Получатель</h2>{order.status === "PENDING" && <button className="order-edit-pencil" onClick={() => setEditMode("recipient")} aria-label="Изменить получателя">✎</button>}</div><p><strong>{order.customerName}</strong></p><p>{order.customerPhone}<br />{order.customerEmail}</p></section></div>}
    
    {!!order.events?.length && <section className="order-history"><div className="order-detail__section-head"><span>05</span><h2>История заказа</h2></div>{order.events.map((event,index)=><div className="order-history__event" key={`${event.createdAt}-${index}`}><i/><div><strong>{event.title}</strong><span>{event.details}</span></div><time>{new Date(event.createdAt).toLocaleString("ru-RU")}</time></div>)}</section>}
    {!!order.delivery?.trackingNumber && <div className="tracking-card"><span>Трек-номер</span><strong>{order.delivery.trackingNumber}</strong><small>Статус: {order.delivery.deliveryStatus}</small></div>}
    {!!order.returns?.length && <section className="return-status"><h3>Возвраты</h3>{order.returns.map((item)=><div key={item.id}><span>{item.reason}</span><strong>{({REQUESTED:"Заявка принята",APPROVED:"Одобрено",REJECTED:"Отклонено",RECEIVED:"Товар получен",REFUNDED:"Деньги возвращены"})[item.status]||item.status}</strong></div>)}</section>}
    {returnOpen && <section className="return-form"><div><p className="page-kicker">Возврат</p><h3>Создать заявку</h3><p>После проверки администратор подтвердит способ передачи товара и возврат оплаты.</p></div><label><span>Причина</span><select value={returnForm.reason} onChange={(e)=>setReturnForm({...returnForm,reason:e.target.value})}><option value="SIZE">Не подошёл размер</option><option value="QUALITY">Проблема с качеством</option><option value="WRONG_ITEM">Получен другой товар</option><option value="OTHER">Другая причина</option></select></label><label><span>Комментарий</span><textarea value={returnForm.comment} onChange={(e)=>setReturnForm({...returnForm,comment:e.target.value})} placeholder="Опишите ситуацию" /></label>{returnState.error&&<p className="checkout-error">{returnState.error}</p>}<div><button className="link-button" onClick={()=>setReturnOpen(false)}>Отмена</button><button className="primary-action" onClick={createReturn} disabled={returnState.loading}>{returnState.loading?"Отправляем…":"Отправить заявку"}</button></div></section>}
    {returnState.message&&<p className="checkout-success">{returnState.message}</p>}
    <div className="order-detail__actions">{order.status !== "CANCELLED" && !["SHIPPED","DELIVERED"].includes(order.status) && <><button className="link-button order-cancel" onClick={cancel}>Отменить заказ</button><span>Отменить можно до передачи заказа в доставку.</span></>}{order.status === "DELIVERED" && !order.returns?.some((item)=>!["REJECTED","REFUNDED"].includes(item.status)) && <button className="link-button" onClick={()=>setReturnOpen(true)}>Оформить возврат</button>}</div>
  </div>;
}
