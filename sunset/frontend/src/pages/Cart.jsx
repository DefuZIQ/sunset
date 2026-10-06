import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../components/HeaderParts/CartContext";
import { createOrder, getLoyaltyAccount, quoteDelivery, validatePromoCode } from "../api/client";
import "./ContentPages.css";

const stores = [
  {
    id: "nn-center",
    name: "SUNSET Нижний Новгород",
    address: "Большая Покровская, 34",
    hours: "Ежедневно, 10:00–21:00",
    lat: 56.3269,
    lon: 44.0059,
  },
  {
    id: "nn-mall",
    name: "SUNSET в ТРЦ НЕБО",
    address: "Большая Покровская, 82",
    hours: "Ежедневно, 10:00–22:00",
    lat: 56.313,
    lon: 43.997,
  },
];

export default function Cart({ user }) {
  const { cartItems, addToCart, decreaseQuantity, removeFromCart, clearCart } =
    useCart();
  const navigate = useNavigate();
  const items = Object.values(cartItems);
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  const accountId = user?.uuid || user?.id || "guest";
  const [loyalty, setLoyalty] = useState(null);
  const [deliveryMode, setDeliveryMode] = useState("delivery");
  const [addresses, setAddresses] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(`sunsetAddresses:${accountId}`)) || []
      );
    } catch {
      return [];
    }
  });
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [selectedStore, setSelectedStore] = useState(stores[0].id);
  const [addressDraft, setAddressDraft] = useState({
    label: "Дом",
    city: "",
    street: "",
    house: "",
    building: "",
    entrance: "",
    floor: "",
    apartment: "",
    intercom: "",
    postalCode: "",
    lat: 55.75,
    lon: 37.62,
  });
  const [form, setForm] = useState({
    phone: user?.phone || "",
    promoCode: "",
    bonusesToUse: 0,
    paymentMethod: "CARD",
  });
  const [deliveryQuote, setDeliveryQuote] = useState({ cost: 0, estimatedDays: 3 });
  const [checkoutKey, setCheckoutKey] = useState(() =>
    window.crypto?.randomUUID?.() || `checkout-${Date.now()}-${Math.random()}`,
  );
  const [phoneEditable, setPhoneEditable] = useState(false);
  const [promo, setPromo] = useState(null);
  const [state, setState] = useState({ loading: false, error: "" });
  const [mapConfirmed, setMapConfirmed] = useState(false);

  useEffect(() => {
    if (!user) return;
    getLoyaltyAccount(localStorage.getItem("authToken"))
      .then(setLoyalty)
      .catch(() => {});
  }, [user]);
  useEffect(() => {
    setForm((current) => ({ ...current, phone: user?.phone || "" }));
    setPhoneEditable(!user?.phone);
  }, [user?.phone]);
  useEffect(() => {
    if (!user) return;
    quoteDelivery(localStorage.getItem("authToken"), { method: deliveryMode === "pickup" ? "pickup" : "courier", subtotal })
      .then(setDeliveryQuote)
      .catch(() => setDeliveryQuote({ cost: deliveryMode === "pickup" || subtotal >= 7000 ? 0 : 390, estimatedDays: deliveryMode === "pickup" ? 1 : 3 }));
  }, [deliveryMode, subtotal, user]);
  const selectedAddress = addresses.find(
    (address) => address.id === selectedAddressId,
  );
  const formattedAddress = useMemo(
    () =>
      selectedAddress
        ? [
            selectedAddress.city,
            selectedAddress.street && `ул. ${selectedAddress.street}`,
            selectedAddress.house && `д. ${selectedAddress.house}`,
            selectedAddress.building && `корп. ${selectedAddress.building}`,
            selectedAddress.entrance && `подъезд ${selectedAddress.entrance}`,
            selectedAddress.floor && `этаж ${selectedAddress.floor}`,
            selectedAddress.apartment && `кв. ${selectedAddress.apartment}`,
          ]
            .filter(Boolean)
            .join(", ")
        : "",
    [selectedAddress],
  );
  const saveAddress = () => {
    if (
      !addressDraft.city.trim() ||
      !addressDraft.street.trim() ||
      !addressDraft.house.trim()
    ) {
      setState({ loading: false, error: "Заполните город, улицу и дом" });
      return;
    }
    if (!mapConfirmed) {
      setState({ loading: false, error: "Проверьте точку адреса на карте" });
      return;
    }
    const entry = { ...addressDraft, id: editingAddressId || `${Date.now()}` };
    const next = editingAddressId
      ? addresses.map((item) => (item.id === editingAddressId ? entry : item))
      : [...addresses, entry];
    setAddresses(next);
    setSelectedAddressId(entry.id);
    setEditingAddressId(null);
    setShowAddressForm(false);
    setMapConfirmed(false);
    setState({ loading: false, error: "" });
    localStorage.setItem(`sunsetAddresses:${accountId}`, JSON.stringify(next));
  };
  const editAddress = (address) => {
    setAddressDraft({ ...address });
    setEditingAddressId(address.id);
    setMapConfirmed(true);
    setShowAddressForm(true);
    setState({ loading: false, error: "" });
  };
  const deleteAddress = (id) => {
    const next = addresses.filter((item) => item.id !== id);
    setAddresses(next);
    if (selectedAddressId === id) setSelectedAddressId(next[0]?.id || "");
    localStorage.setItem(`sunsetAddresses:${accountId}`, JSON.stringify(next));
  };
  const useLocation = () =>
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        setAddressDraft((current) => ({
          ...current,
          lat: coords.latitude,
          lon: coords.longitude,
        }));
        setMapConfirmed(true);
      },
      () =>
        setState({ loading: false, error: "Не удалось определить геопозицию" }),
    );
  const validatePromo = async () => {
    setState({ loading: true, error: "" });
    try {
      const data = await validatePromoCode(localStorage.getItem("authToken"), { code: form.promoCode, subtotal });
      setPromo(data);
      setState({ loading: false, error: "" });
    } catch (error) {
      setPromo(null);
      setState({ loading: false, error: error.message });
    }
  };
  const checkout = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    const store =
      stores.find((entry) => entry.id === selectedStore) || stores[0];
    const address =
      deliveryMode === "pickup"
        ? `${store.name}, ${store.address}`
        : formattedAddress;
    const phoneValid = /^\+?[0-9 ()-]{10,18}$/.test(form.phone.trim());
    if (!phoneValid || (deliveryMode === "delivery" && !formattedAddress)) {
      setState({
        loading: false,
        error: !phoneValid
          ? "Укажите корректный номер телефона"
          : "Выберите сохранённый адрес или заполните новый",
      });
      return;
    }
    setState({ loading: true, error: "" });
    try {
      const data = await createOrder(localStorage.getItem("authToken"), {
          customerName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          customerEmail: user.email,
          customerPhone: form.phone,
          address,
          deliveryMethod: deliveryMode === "pickup" ? "pickup" : "courier",
          paymentMethod: form.paymentMethod,
          idempotencyKey: checkoutKey,
          promoCode: form.promoCode || null,
          bonusesToUse: Number(form.bonusesToUse) || 0,
          items: items.map(({ product, quantity }) => ({
            productId: product.id,
            colorId: product.selectedColorId || null,
            sizeId: product.selectedSizeId || null,
            quantity,
          })),
      });
      setCheckoutKey(window.crypto?.randomUUID?.() || `checkout-${Date.now()}-${Math.random()}`);
      clearCart();
      navigate("/profile/orders", { state: { orderNumber: data.orderNumber } });
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  };
  if (!items.length)
    return (
      <div className="page-shell container">
        <p className="page-kicker">Ваш заказ</p>
        <h1 className="page-title">Корзина</h1>
        <div className="empty-state">
          <h2>Корзина пока пуста</h2>
          <p>Добавьте то, что вам понравилось.</p>
          <Link className="text-link" to="/catalog">
            Перейти в каталог
          </Link>
        </div>
      </div>
    );
  const discount = promo
    ? (subtotal *
        Number(promo.discount_percent || promo.discountPercent || 0)) /
      100
    : 0;
  const bonusUse = Math.min(
    Number(form.bonusesToUse) || 0,
    loyalty?.balance || 0,
    Math.floor((subtotal - discount) * 0.3),
  );
  const deliveryCost = Number(deliveryQuote?.cost || 0);
  const total = Math.max(0, subtotal - discount - bonusUse + deliveryCost);
  const mapLat = selectedAddress?.lat || addressDraft.lat;
  const mapLon = selectedAddress?.lon || addressDraft.lon;
  return (
    <div className="page-shell container">
      <p className="page-kicker">Ваш заказ</p>
      <h1 className="page-title">Корзина</h1>
      <div className="cart-layout">
        <section>
          {items.map(({ product, quantity }) => (
            <article
              className="cart-line"
              key={`${product.id}-${product.selectedColorId || "default"}-${product.selectedSizeId || "default"}`}
            >
              <Link
                className="cart-line__image-link"
                to={`/catalog/product/${product.id}?color=${encodeURIComponent(product.selectedColorId || "")}&size=${encodeURIComponent(product.selectedSizeId || "")}`}
                aria-label={`Открыть ${product.name}`}
              >
                <img
                  src={product.imageUrl || product.image_url}
                  alt={product.name}
                />
              </Link>
              <div>
                <h3>
                  <Link
                    className="cart-line__product-link"
                    to={`/catalog/product/${product.id}?color=${encodeURIComponent(product.selectedColorId || "")}&size=${encodeURIComponent(product.selectedSizeId || "")}`}
                  >
                    {product.name}
                  </Link>
                </h3>
                {product.selectedSizeName && (
                  <p>
                    Размер: <strong>{product.selectedSizeName}</strong>
                    {product.selectedColorName
                      ? ` · ${product.selectedColorName}`
                      : ""}
                  </p>
                )}
                <p>{Number(product.price).toLocaleString("ru-RU")} ₽</p>
                <button
                  className="link-button"
                  onClick={() =>
                    removeFromCart(
                      product.id,
                      product.selectedColorId,
                      product.selectedSizeId,
                    )
                  }
                >
                  Удалить
                </button>
              </div>
              <div className="cart-line__actions">
                <button
                  onClick={() =>
                    decreaseQuantity(
                      product.id,
                      product.selectedColorId,
                      product.selectedSizeId,
                    )
                  }
                >
                  −
                </button>
                <span>{quantity}</span>
                <button onClick={() => addToCart(product)}>+</button>
              </div>
            </article>
          ))}
        </section>
        <aside className="cart-summary">
          <h2>Оформление</h2>
          {!user && (
            <p className="checkout-note">
              Для оформления потребуется войти в аккаунт.
            </p>
          )}
          <label
            className={`checkout-field checkout-phone ${phoneEditable ? "is-editing" : "is-locked"}`}
          >
            <span>Телефон</span>
            <div className="checkout-phone__control">
              <input
                className={
                  !form.phone.trim() ||
                  !/^\+?[0-9 ()-]{10,18}$/.test(form.phone.trim())
                    ? "field-invalid"
                    : ""
                }
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+7 999 000-00-00"
                readOnly={!phoneEditable}
              />
              <button
                type="button"
                className="checkout-phone__edit"
                onClick={() => setPhoneEditable((value) => !value)}
                aria-label={
                  phoneEditable
                    ? "Завершить редактирование телефона"
                    : "Изменить телефон"
                }
                title={
                  phoneEditable
                    ? "Завершить редактирование"
                    : "Изменить телефон"
                }
              >
                ✎
              </button>
            </div>
          </label>
          <div className="delivery-switch">
            <button
              type="button"
              className={deliveryMode === "delivery" ? "active" : ""}
              onClick={() => setDeliveryMode("delivery")}
            >
              Доставка
            </button>
            <button
              type="button"
              className={deliveryMode === "pickup" ? "active" : ""}
              onClick={() => setDeliveryMode("pickup")}
            >
              Самовывоз
            </button>
          </div>
          {deliveryMode === "pickup" ? (
            <div className="pickup-list">
              {stores.map((store) => (
                <button
                  type="button"
                  key={store.id}
                  className={`pickup-card ${selectedStore === store.id ? "active" : ""}`}
                  onClick={() => setSelectedStore(store.id)}
                >
                  <strong>{store.name}</strong>
                  <span>{store.address}</span>
                  <small>{store.hours}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="address-box">
              <div className="saved-addresses">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={`saved-address-row ${selectedAddressId === address.id ? "active" : ""}`}
                  >
                    <button
                      className="saved-address-select"
                      onClick={() => setSelectedAddressId(address.id)}
                    >
                      <strong>{address.label || "Адрес"}</strong>
                      <span>
                        {[address.city, address.street, address.house]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </button>
                    <button
                      className="address-action"
                      onClick={() => editAddress(address)}
                    >
                      Изменить
                    </button>
                    <button
                      className="address-action address-action--danger"
                      onClick={() => deleteAddress(address.id)}
                    >
                      Удалить
                    </button>
                  </div>
                ))}
                <button
                  className="add-address"
                  onClick={() => {
                    setEditingAddressId(null);
                    setAddressDraft({
                      label: "Дом",
                      city: "",
                      street: "",
                      house: "",
                      building: "",
                      entrance: "",
                      floor: "",
                      apartment: "",
                      intercom: "",
                      postalCode: "",
                      lat: 55.75,
                      lon: 37.62,
                    });
                    setShowAddressForm(true);
                  }}
                >
                  + Новый адрес
                </button>
              </div>
              {showAddressForm && (
                <div className="address-modal" role="dialog" aria-modal="true">
                  <div className="address-modal__panel">
                    <div className="address-modal__head">
                      <div>
                        <p className="page-kicker">Адрес доставки</p>
                        <h3>
                          {editingAddressId ? "Изменить адрес" : "Новый адрес"}
                        </h3>
                        <p>
                          Подсказки рядом с полями помогут заполнить адрес без
                          ошибок.
                        </p>
                      </div>
                      <button
                        className="address-modal__close"
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddressId(null);
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <label className="address-label-field">
                      <span>Название адреса</span>
                      <input
                        title="Например: Дом, Работа или Родители"
                        value={addressDraft.label}
                        onChange={(e) =>
                          setAddressDraft({
                            ...addressDraft,
                            label: e.target.value,
                          })
                        }
                        placeholder="Дом"
                      />
                    </label>
                    <div className="address-grid">
                      {[
                        ["city", "Город", "Например: Нижний Новгород"],
                        ["street", "Улица", "Только название улицы"],
                        ["house", "Дом", "Номер дома"],
                        ["building", "Корпус", "Если есть"],
                        ["entrance", "Подъезд", "Номер подъезда"],
                        ["floor", "Этаж", "Этаж доставки"],
                        ["apartment", "Квартира", "Номер квартиры"],
                        ["intercom", "Домофон", "Код домофона"],
                        ["postalCode", "Индекс", "6 цифр"],
                      ].map(([key, label, hint]) => (
                        <label key={key}>
                          <span>
                            {label} <small>{hint}</small>
                          </span>
                          <input
                            title={hint}
                            list={
                              key === "city"
                                ? "city-suggestions"
                                : key === "street"
                                  ? "street-suggestions"
                                  : undefined
                            }
                            value={addressDraft[key]}
                            onChange={(e) => {
                              setAddressDraft({
                                ...addressDraft,
                                [key]: e.target.value,
                              });
                              if (["city", "street", "house"].includes(key)) {
                                setMapConfirmed(false);
                              }
                            }}
                            placeholder={hint}
                          />
                        </label>
                      ))}
                    </div>
                    <datalist id="city-suggestions">
                      <option value="Нижний Новгород" />
                      <option value="Нижний Тагил" />
                      <option value="Москва" />
                      <option value="Санкт-Петербург" />
                      <option value="Казань" />
                      <option value="Екатеринбург" />
                    </datalist>
                    <datalist id="street-suggestions">
                      <option value="Большая Покровская" />
                      <option value="Варварская" />
                      <option value="Рождественская" />
                      <option value="Ильинская" />
                      <option value="Минина" />
                    </datalist>
                    <div className="map-preview">
                      <iframe
                        title="Проверка точки адреса на карте"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapLon - 0.02}%2C${mapLat - 0.01}%2C${mapLon + 0.02}%2C${mapLat + 0.01}&layer=mapnik&marker=${mapLat}%2C${mapLon}`}
                      />
                      <button type="button" onClick={useLocation}>
                        Определить точку по моей геопозиции
                      </button>
                      <label className="map-confirm">
                        <input
                          type="checkbox"
                          checked={mapConfirmed}
                          onChange={(e) => setMapConfirmed(e.target.checked)}
                        />{" "}
                        Точка на карте соответствует адресу
                      </label>
                    </div>
                    {state.error && (
                      <p className="checkout-error">{state.error}</p>
                    )}
                    <div className="address-modal__actions">
                      <button
                        className="link-button"
                        onClick={() => setShowAddressForm(false)}
                      >
                        Отмена
                      </button>
                      <button className="primary-action" onClick={saveAddress}>
                        Сохранить адрес
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="payment-methods">
            <span className="payment-methods__title">Способ оплаты</span>
            {[
              ["CARD", "Картой онлайн", "Тестовая оплата без ввода реквизитов"],
              ["SBP", "СБП", "Тестовый платёж по СБП"],
              ["ON_RECEIPT", "При получении", "Оплата в магазине или курьеру"],
            ].map(([value, title, hint]) => (
              <button type="button" key={value} className={form.paymentMethod === value ? "active" : ""} onClick={() => setForm({ ...form, paymentMethod: value })}>
                <i>{form.paymentMethod === value ? "✓" : ""}</i><span><strong>{title}</strong><small>{hint}</small></span>
              </button>
            ))}
          </div>
          <div className="promo-field">
            <input
              value={form.promoCode}
              onChange={(e) => {
                setForm({ ...form, promoCode: e.target.value.toUpperCase() });
                setPromo(null);
              }}
              placeholder="Промокод"
            />
            <button
              onClick={validatePromo}
              disabled={!form.promoCode || state.loading}
            >
              Применить
            </button>
          </div>
          {promo && (
            <p className="checkout-success">Промокод применён: {promo.title}</p>
          )}
          {loyalty && (
            <label className="checkout-field">
              <span>Списать бонусы (доступно {loyalty.balance})</span>
              <input
                type="number"
                min="0"
                max={Math.min(
                  loyalty.balance,
                  Math.floor((subtotal - discount) * 0.3),
                )}
                value={form.bonusesToUse}
                onChange={(e) =>
                  setForm({ ...form, bonusesToUse: e.target.value })
                }
              />
            </label>
          )}
          <div className="cart-summary__row">
            <span>Товары</span>
            <span>{subtotal.toLocaleString("ru-RU")} ₽</span>
          </div>
          {discount > 0 && (
            <div className="cart-summary__row checkout-discount">
              <span>Скидка</span>
              <span>−{discount.toLocaleString("ru-RU")} ₽</span>
            </div>
          )}
          {bonusUse > 0 && (
            <div className="cart-summary__row checkout-discount">
              <span>Бонусы</span>
              <span>−{bonusUse.toLocaleString("ru-RU")} ₽</span>
            </div>
          )}
          <div className="cart-summary__row">
            <span>{deliveryMode === "pickup" ? "Самовывоз" : "Доставка"}</span>
            <span>{deliveryCost ? `${deliveryCost.toLocaleString("ru-RU")} ₽` : "Бесплатно"}</span>
          </div>
          <p className="checkout-delivery-hint">Ориентировочно: {deliveryQuote?.estimatedDays || 3} {Number(deliveryQuote?.estimatedDays) === 1 ? "день" : "дня"}</p>
          <hr />
          <div className="cart-summary__row">
            <strong>К оплате</strong>
            <strong>{total.toLocaleString("ru-RU")} ₽</strong>
          </div>
          {state.error && <p className="checkout-error">{state.error}</p>}
          <button
            className="primary-action"
            onClick={checkout}
            disabled={state.loading}
          >
            {state.loading ? "Оформляем…" : "Оформить заказ"}
          </button>
          <button className="link-button" onClick={clearCart}>
            Очистить корзину
          </button>
        </aside>
      </div>
    </div>
  );
}
