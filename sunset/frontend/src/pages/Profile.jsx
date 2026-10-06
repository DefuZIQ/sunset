import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../components/HeaderParts/CartContext";
import ProductCard from "../components/Main/ProductCard";
import { useFavorites } from "../contexts/FavoritesContext";
import { useStore } from "../contexts/StoreContext";
import { getLoyaltyAccount, getSubscriptionStatus, listNotifications, markNotificationRead as markNotificationReadRequest, unsubscribeNewsletter } from "../api/client";
import "./ContentPages.css";
import "./Profile.css";

export default function Profile({ user, setUser, section = "overview" }) {
  const { cartItemCount } = useCart();
  const { products } = useStore();
  const { favoriteCount, favoriteIds } = useFavorites();
  const [orders, setOrders] = useState([]);
  const [loyalty, setLoyalty] = useState(null);
  const [saveState, setSaveState] = useState({ loading: false, message: "", error: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordState, setPasswordState] = useState({ loading: false, message: "", error: "" });
  const [notifications, setNotifications] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [form, setForm] = useState({
    firstName: user?.firstName || user?.name || "",
    lastName: user?.lastName || user?.surname || "",
    email: user?.email || "",
    phone: user?.phone || "",
    birthday: user?.birthday || "",
    avatar: user?.avatar || "",
  });

  useEffect(() => {
    setForm({
      firstName: user?.firstName || user?.name || "",
      lastName: user?.lastName || user?.surname || "",
      email: user?.email || "",
      phone: user?.phone || "",
      birthday: user?.birthday || "",
      avatar: user?.avatar || "",
    });
  }, [user?.firstName, user?.lastName, user?.email, user?.phone, user?.birthday, user?.avatar, user?.name, user?.surname]);

  useEffect(() => {
    if (!user) return;
    const headers = { Authorization: `Bearer ${localStorage.getItem("authToken")}` };
    fetch("/order/my", { headers })
      .then((response) => response.ok ? response.json() : [])
      .then(setOrders).catch(() => {});
    getLoyaltyAccount(localStorage.getItem("authToken"))
      .then(setLoyalty).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    listNotifications(localStorage.getItem("authToken"), 50)
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]));
  }, [user, section]);
  useEffect(() => { if (!user) return; const key = user.uuid || user.id; try { setSavedAddresses(JSON.parse(localStorage.getItem(`sunsetAddresses:${key}`)) || []); setPaymentMethods(JSON.parse(localStorage.getItem(`sunsetPayments:${key}`)) || []); } catch { setSavedAddresses([]); setPaymentMethods([]); } }, [user, section]);
  useEffect(() => { if (!user) return; getSubscriptionStatus(localStorage.getItem("authToken")).then(setSubscription).catch(()=>{}); },[user,section]);
  const removeSavedAddress = (id) => { const next = savedAddresses.filter((item) => item.id !== id); setSavedAddresses(next); localStorage.setItem(`sunsetAddresses:${user.uuid || user.id}`, JSON.stringify(next)); };
  const removePayment = (id) => { const next = paymentMethods.filter((item) => item.id !== id); setPaymentMethods(next); localStorage.setItem(`sunsetPayments:${user.uuid || user.id}`, JSON.stringify(next)); };
  const unsubscribe = async () => { setSubscriptionError(""); try { setSubscription(await unsubscribeNewsletter(localStorage.getItem("authToken"))); } catch (error) { setSubscriptionError(error.message || "Не удалось отписаться"); } };

  if (!user) return (
    <div className="page-shell container">
      <p className="page-kicker">SUNSET ID</p><h1 className="page-title">Личный кабинет</h1>
      <div className="empty-state"><h2>Войдите в аккаунт</h2><p>Чтобы видеть заказы, адреса и персональные данные.</p><Link className="primary-action" to="/login">Войти</Link> <Link className="text-link" to="/register">Регистрация</Link></div>
    </div>
  );

  const name = [user.firstName || user.name, user.lastName || user.surname].filter(Boolean).join(" ") || "Клиент SUNSET";
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const unreadNotifications = notifications.filter((item) => !item.read).length;
  const visibleNotifications = notifications.filter((item) => notificationFilter === "all" || (notificationFilter === "unread" ? !item.read : String(item.type || "").toLowerCase() === notificationFilter));
  const markNotificationRead = async (item) => {
    if (item.read) return;
    try {
      await markNotificationReadRequest(localStorage.getItem("authToken"), item.id);
      setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
    } catch { /* Keep unread when saving failed. */ }
  };
  const favoriteProducts = products.filter((product) => favoriteIds.includes(String(product.id)));
  const updateField = (key, value) => { setSaveState({ loading: false, message: "", error: "" }); setForm((current) => ({ ...current, [key]: value })); };
  const chooseAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setSaveState({ loading:false,message:"",error:"Выберите изображение" }); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const source = new Image();
      source.onload = () => {
        const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
        const context = canvas.getContext("2d"); const side = Math.min(source.width,source.height); const x=(source.width-side)/2; const y=(source.height-side)/2;
        context.drawImage(source,x,y,side,side,0,0,512,512); updateField("avatar",canvas.toDataURL("image/jpeg",.82));
      };
      source.src = reader.result;
    };
    reader.readAsDataURL(file);
  };
  const saveProfile = async (event) => {
    event.preventDefault();
    setSaveState({ loading: true, message: "", error: "" });
    try {
      const response = await fetch("/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Не удалось сохранить изменения");
      const updatedUser = { ...user, ...data, uuid: data.id || user.uuid };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setSaveState({ loading: false, message: "Изменения сохранены", error: "" });
    } catch (error) {
      setSaveState({ loading: false, message: "", error: error.message });
    }
  };
  const updatePasswordField = (key, value) => {
    setPasswordState({ loading: false, message: "", error: "" });
    setPasswordForm((current) => ({ ...current, [key]: value }));
  };
  const changePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      setPasswordState({ loading: false, message: "", error: "Новый пароль должен содержать не менее 8 символов" });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordState({ loading: false, message: "", error: "Новые пароли не совпадают" });
      return;
    }
    setPasswordState({ loading: true, message: "", error: "" });
    try {
      const response = await fetch("/auth/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.errorMessage || data.message || "Не удалось изменить пароль");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordState({ loading: false, message: data.message || "Пароль успешно изменён", error: "" });
    } catch (error) {
      setPasswordState({ loading: false, message: "", error: error.message });
    }
  };

  return (
    <div className="account-page page-shell container">
      <section className="account-hero">
        <div className={`account-avatar ${form.avatar ? "has-image" : ""}`}>{form.avatar ? <img src={form.avatar} alt={name} /> : initials}</div>
        <div className="account-hero__copy"><p className="page-kicker">SUNSET ID · участник</p><h1>Здравствуйте, {name}</h1><p>{user.email}</p></div>
        <Link className="account-hero__shop" to="/catalog">Перейти к покупкам <span>→</span></Link>
      </section>

      <div className="account-layout">
        <nav className="account-nav" aria-label="Разделы личного кабинета">
          <Link className={section === "overview" ? "active" : ""} to="/profile"><span>01</span>Обзор</Link>
          <Link className={section === "orders" ? "active" : ""} to="/profile/orders"><span>02</span>Мои заказы</Link>
          <Link className={section === "favorites" ? "active" : ""} to="/profile/favorites"><span>03</span>Избранное<em>{favoriteCount}</em></Link>
          <Link className={section === "loyalty" ? "active" : ""} to="/profile/loyalty"><span>04</span>Бонусы<em>{loyalty?.balance || 0}</em></Link>
          <Link to="/profile/basket"><span>05</span>Корзина<em>{cartItemCount}</em></Link>
          <Link className={section === "settings" ? "active" : ""} to="/profile/settings"><span>06</span>Настройки</Link>
          <Link className={section === "notifications" ? "active" : ""} to="/profile/notifications"><span>07</span>Уведомления<em>{unreadNotifications}</em></Link>
          <Link className={section === "addresses" ? "active" : ""} to="/profile/addresses"><span>08</span>Адреса и оплата</Link>
          {user.role === "ADMIN" && <Link to="/admin"><span>09</span>Управление</Link>}
        </nav>

        <main className="account-content">
          {section === "overview" && <>
            <div className="account-section-head"><div><p className="page-kicker">Главное</p><h2>Ваш кабинет</h2></div><p>Здесь собраны покупки, сохранённые вещи и данные профиля.</p></div>
            <div className="account-stats">
              <Link to="/profile/orders"><span>Заказы</span><strong>{orders.length}</strong><small>История покупок →</small></Link>
              <Link to="/profile/favorites"><span>Избранное</span><strong>{favoriteCount}</strong><small>Сохранённые вещи →</small></Link>
              <Link to="/profile/basket"><span>В корзине</span><strong>{cartItemCount}</strong><small>Перейти к оформлению →</small></Link>
            </div>
            <div className="account-feature-grid">
              <article className="account-feature account-feature--dark"><span>SUNSET CLUB</span><h3>Ваш стиль — ваши преимущества</h3><p>Сохраняйте любимые вещи и первыми узнавайте о новых коллекциях.</p><Link to="/newproducts">Смотреть новинки</Link></article>
              <article className="account-feature"><span>ПРОФИЛЬ</span><h3>Добавьте контактные данные</h3><p>Они пригодятся для быстрого оформления будущих заказов.</p><Link to="/profile/settings">Заполнить профиль</Link></article>
            </div>
          </>}

          {section === "orders" && <>
            <div className="account-section-head"><div><p className="page-kicker">Покупки</p><h2>Мои заказы</h2></div><p>Отслеживайте статус и возвращайтесь к любимым вещам.</p></div>
            {orders.length ? <div className="order-list">{orders.map((order) => <Link className="order-card" key={order.id} to={`/profile/orders/${order.id}`}><div><span>{order.orderNumber}</span><h3>{new Date(order.createdAt).toLocaleDateString("ru-RU")}</h3></div><div><span>Статус</span><strong className={`order-status order-status--${order.status?.toLowerCase()}`}>{({PENDING:"Ожидает подтверждения",CONFIRMED:"Подтверждён",ASSEMBLING:"Собирается",SHIPPED:"Передан в доставку",DELIVERED:"Доставлен",CANCELLED:"Отменён"})[order.status] || order.status}</strong></div><div><span>Сумма</span><strong>{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</strong><small>+{order.bonusesEarned} бонусов</small></div></Link>)}</div> : <div className="account-empty"><span>0 заказов</span><h3>Здесь появится история покупок</h3><p>После оформления заказа вы сможете следить за его статусом в этом разделе.</p><Link className="primary-action" to="/catalog">Открыть каталог</Link></div>}
          </>}

          {section === "loyalty" && <>
            <div className="account-section-head"><div><p className="page-kicker">SUNSET CLUB</p><h2>Бонусы и привилегии</h2></div><p>1 бонус = 1 ₽. Бонусами можно оплатить до 30% заказа.</p></div>
            <div className="loyalty-balance"><div><span>Ваш баланс</span><strong>{loyalty?.balance || 0}</strong><small>бонусов</small></div><div><span>Уровень</span><strong>{loyalty?.tier || "SUNRISE"}</strong><p>5% бонусами с каждой покупки</p></div><div><span>День рождения</span><strong>−15%</strong><p>{loyalty?.birthdayBenefit || "Скидка и двойные бонусы в день рождения"}</p></div></div>
            <div className="loyalty-actions"><Link className="primary-action" to="/promotions">Смотреть акции</Link><Link className="text-link" to="/catalog">Потратить бонусы</Link></div>
            {!!loyalty?.transactions?.length && <div className="loyalty-history"><h3>История бонусов</h3>{loyalty.transactions.map((transaction, index) => <div key={`${transaction.createdAt}-${index}`}><span>{transaction.description}</span><time>{new Date(transaction.createdAt).toLocaleDateString("ru-RU")}</time><strong className={transaction.amount > 0 ? "positive" : ""}>{transaction.amount > 0 ? "+" : ""}{transaction.amount}</strong></div>)}</div>}
          </>}

          {section === "favorites" && <>
            <div className="account-section-head"><div><p className="page-kicker">Ваша подборка</p><h2>Избранное</h2></div><p>Все сохранённые вещи теперь находятся прямо в личном кабинете.</p></div>
            {favoriteProducts.length ? <div className="account-favorites-grid">{favoriteProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="account-empty"><span>0 товаров</span><h3>Здесь пока пусто</h3><p>Нажмите на сердце в карточке товара, чтобы сохранить вещь в этом разделе.</p><Link className="primary-action" to="/catalog">Открыть каталог</Link></div>}
          </>}

          {section === "notifications" && <>
            <div className="account-section-head"><div><p className="page-kicker">Центр внимания</p><h2>Уведомления</h2></div><p>Новости заказов, персональные предложения и важные сообщения SUNSET.</p></div>
            <div className="notification-filters" role="tablist">{[["all","Все"],["unread","Непрочитанные"],["order","Заказы"],["promo","Акции"],["system","Система"]].map(([value,label]) => <button key={value} className={notificationFilter === value ? "active" : ""} onClick={() => setNotificationFilter(value)}>{label}{value === "unread" && unreadNotifications ? ` · ${unreadNotifications}` : ""}</button>)}</div>
            {visibleNotifications.length ? <div className="notification-list">{visibleNotifications.map((item) => <button className={`notification-card ${item.read ? "is-read" : ""}`} key={item.id} onClick={() => markNotificationRead(item)}><span className="notification-card__mark">{item.type === "ORDER" ? "↗" : item.type === "PROMO" ? "%" : "✦"}</span><span><strong>{item.title}</strong><small>{item.message}</small><time>{new Date(item.createdAt).toLocaleString("ru-RU")}</time></span>{!item.read && <i />}</button>)}</div> : <div className="account-empty"><span>Тишина</span><h3>Новых сообщений нет</h3><p>Когда появятся новости о заказах или акции, они будут здесь.</p></div>}
          </>}

          {section === "addresses" && <>
            <div className="account-section-head"><div><p className="page-kicker">Оформление</p><h2>Адреса и оплата</h2></div><p>Сохранённые адреса и привязанные способы оплаты для быстрого заказа.</p></div>
            <div className="saved-profile-grid"><section className="saved-profile-card"><h3>Мои адреса</h3>{savedAddresses.length ? savedAddresses.map((address) => <div className="saved-profile-row" key={address.id}><div><strong>{address.label || "Адрес"}</strong><span>{[address.city,address.street,address.house,address.apartment && `кв. ${address.apartment}`].filter(Boolean).join(", ")}</span></div><button onClick={() => removeSavedAddress(address.id)}>Удалить</button></div>) : <p className="muted">Адресов пока нет. Добавьте первый при оформлении заказа.</p>}<Link className="text-link" to="/profile/basket">Добавить адрес в оформлении →</Link></section><section className="saved-profile-card"><h3>Способы оплаты</h3>{paymentMethods.length ? paymentMethods.map((method) => <div className="saved-profile-row" key={method.id}><div><strong>{method.brand || "Банковская карта"}</strong><span>•••• {method.last4}</span></div><button onClick={() => removePayment(method.id)}>Удалить</button></div>) : <p className="muted">Привязанных карт пока нет. Способ оплаты можно добавить во время оплаты заказа.</p>}<button className="text-link" onClick={() => alert("Добавление карты подключается на шаге оплаты заказа")}>Добавить способ оплаты →</button></section><section className="saved-profile-card saved-profile-card--subscription"><h3>Рассылка SUNSET</h3>{subscription?.active ? <><p className="subscription-active">Подписка активна</p><p className="muted">Новости и персональная скидка отправляются на {subscription.email || user.email}.</p><button className="subscription-cancel" onClick={unsubscribe}>Отписаться от рассылки</button></> : <><p className="muted">Вы не подписаны на новости и специальные предложения.</p><a className="text-link" href="#subscribe-form">Подписаться →</a></>}{subscriptionError && <p className="account-form__error" role="alert">{subscriptionError}</p>}</section></div>
          </>}

          {section === "settings" && <>
            <div className="account-section-head"><div><p className="page-kicker">Данные</p><h2>Настройки профиля</h2></div><p>Контактные данные для связи и будущих заказов.</p></div>
            <form className="account-form" onSubmit={saveProfile}>
              <div className="avatar-editor"><div className={`account-avatar ${form.avatar ? "has-image" : ""}`}>{form.avatar ? <img src={form.avatar} alt="Предпросмотр аватара" /> : initials}</div><div><strong>Фотография профиля</strong><p>JPG, PNG или WEBP. Изображение автоматически обрежется по центру.</p><label className="avatar-upload">Выбрать фотографию<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} /></label>{form.avatar && <button type="button" className="avatar-remove" onClick={() => updateField("avatar","")}>Удалить</button>}</div></div>
              <label><span>Имя</span><input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} placeholder="Ваше имя" /></label>
              <label><span>Фамилия</span><input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} placeholder="Ваша фамилия" /></label>
              <label><span>E-mail</span><input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} /></label>
              <label><span>Телефон</span><input type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+7 999 000-00-00" /></label>
              <label><span>Дата рождения</span><input type="date" value={form.birthday} max={new Date().toISOString().slice(0,10)} onChange={(event) => updateField("birthday", event.target.value)} /></label>
              <div className="account-form__footer"><button className="primary-action" type="submit" disabled={saveState.loading}>{saveState.loading ? "Сохраняем…" : "Сохранить изменения"}</button>{saveState.message && <span>{saveState.message}</span>}{saveState.error && <span className="account-form__error">{saveState.error}</span>}</div>
            </form>
            <section className="password-section">
              <div className="password-section__intro"><p className="page-kicker">Безопасность</p><h3>Изменить пароль</h3><p>Используйте уникальный пароль длиной не менее 8 символов.</p></div>
              <form className="password-form" onSubmit={changePassword}>
                <label><span>Текущий пароль</span><input type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => updatePasswordField("currentPassword", event.target.value)} required /></label>
                <label><span>Новый пароль</span><input type="password" autoComplete="new-password" minLength="8" maxLength="72" value={passwordForm.newPassword} onChange={(event) => updatePasswordField("newPassword", event.target.value)} required /></label>
                <label><span>Повторите новый пароль</span><input type="password" autoComplete="new-password" minLength="8" maxLength="72" value={passwordForm.confirmPassword} onChange={(event) => updatePasswordField("confirmPassword", event.target.value)} required /></label>
                <div className="account-form__footer"><button className="primary-action" type="submit" disabled={passwordState.loading}>{passwordState.loading ? "Изменяем…" : "Изменить пароль"}</button>{passwordState.message && <span>{passwordState.message}</span>}{passwordState.error && <span className="account-form__error">{passwordState.error}</span>}</div>
              </form>
            </section>
          </>}
        </main>
      </div>
    </div>
  );
}
