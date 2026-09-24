import { Link, useParams, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useCart } from "../components/HeaderParts/CartContext";
import "../App.css"; // Для .container
import "../components/Main/ProductCard.css"; // Переиспользуем стили
import "./ProductPage.css"; // Подключаем стили для страницы товара

export default function ProductPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const requestedColorId = searchParams.get("color");
  const requestedSizeId = searchParams.get("size");
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [review, setReview] = useState({ rating: 5, body: "" });
  const [reviewMessage, setReviewMessage] = useState("");
  const { addToCart, getItemQuantity, decreaseQuantity } = useCart();

  // Состояния для выбранных опций
  const [selectedColorId, setSelectedColorId] = useState(null);
  const [selectedSizeId, setSelectedSizeId] = useState(null);
  const [availableQuantity, setAvailableQuantity] = useState(0);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    fetch("/products/by-uuid", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Товар не найден");
          throw new Error("Ошибка загрузки товара");
        }
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setLoading(false);

        const requestedStock = data.stock.find((item) =>
          String(item.colorId) === String(requestedColorId) &&
          String(item.sizeId) === String(requestedSizeId)
        );
        if (requestedStock) {
          setSelectedColorId(requestedStock.colorId);
          setSelectedSizeId(requestedStock.sizeId);
        } else {
          if (data.colors.length > 0) setSelectedColorId(data.colors[0].id);
          if (data.stock.length > 0) setSelectedSizeId(data.stock[0].sizeId);
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, requestedColorId, requestedSizeId]);

  const loadReviews = useCallback(() => fetch(`/products/reviews/${id}`).then((response) => response.ok ? response.json() : []).then(setReviews).catch(() => setReviews([])), [id]);
  useEffect(() => { if (id) loadReviews(); }, [id, loadReviews]);

  const submitReview = async (event) => {
    event.preventDefault();
    const response = await fetch(`/products/review/${id}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("authToken")}` }, body: JSON.stringify(review) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setReviewMessage(response.status === 401 ? "Сначала войдите в аккаунт" : data.message || "Не удалось сохранить отзыв"); return; }
    setReview({ rating: 5, body: "" }); setReviewMessage("Спасибо! Отзыв опубликован."); loadReviews();
  };

  // Обновляем доступное количество при изменении выбора цвета или размера
  useEffect(() => {
    if (!product || !selectedColorId || !selectedSizeId) {
      setAvailableQuantity(0);
      return;
    }

    // Найдём запись в stock по выбранному цвету и размеру
    const stockItem = product.stock.find(
      (item) => item.colorId === selectedColorId && item.sizeId === selectedSizeId
    );
    setAvailableQuantity(stockItem ? stockItem.quantity : 0);
  }, [product, selectedColorId, selectedSizeId]);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p>Ошибка: {error}</p>;
  if (!product) return <p>Товар не найден</p>;

  // Кол-во товара в корзине с текущими параметрами (цвет+размер)
  const quantityInCart = getItemQuantity(product.id, selectedColorId, selectedSizeId);

  // Проверка, можно ли добавить в корзину (не больше остатка)
  const canAddToCart = quantityInCart < availableQuantity && availableQuantity > 0;

  const handleAddToCart = () => {
    if (!canAddToCart) return;
    addToCart({
      ...product,
      selectedColorId,
      selectedSizeId,
      selectedColorName: product.colors.find(c => c.id === selectedColorId)?.name,
      selectedSizeName: product.stock.find(s => s.sizeId === selectedSizeId)?.sizeName,
    });
  };

  return (
    <div className="container product-page">
      <div className="product-detail-wrapper">
        <div className="product-detail-image">
          <img src={product.imageUrl} alt={product.name} />
        </div>

        <div className="product-detail-info">
          <div className="product-category-path"><span>{product.gender === "MEN" ? "Для мужчин" : product.gender === "UNISEX" ? "Унисекс" : "Для женщин"}</span>{(product.categories || []).map((category) => <span key={category}>{category}</span>)}</div>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <p className="product-detail-price">{product.price} ₽</p>

          {/* Выбор цвета */}
          <div className="product-option">
            <p><b>Цвет:</b></p>
            <div className="colors-list">
              {product.colors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className={`color-btn ${selectedColorId === color.id ? "selected" : ""}`}
                  style={{ backgroundColor: color.hexCode }}
                  onClick={() => setSelectedColorId(color.id)}
                  aria-label={color.name}
                />
              ))}
            </div>
          </div>

          {/* Выбор размера */}
          <div className="product-option">
            <p><b>Размер:</b></p>
            <div className="sizes-list">
              {Array.from(new Set(product.stock.map((s) => s.sizeId))) // уникальные размеры из stock
                .map((sizeId) => {
                  const sizeName = product.stock.find((s) => s.sizeId === sizeId)?.sizeName;
                  // Проверяем доступность выбранного цвета для этого размера
                  const stockEntry = product.stock.find(
                    (s) => s.sizeId === sizeId && s.colorId === selectedColorId
                  );
                  const isDisabled = !stockEntry || stockEntry.quantity === 0;

                  return (
                    <button
                      key={sizeId}
                      type="button"
                      className={`size-btn ${selectedSizeId === sizeId ? "selected" : ""}`}
                      disabled={isDisabled}
                      onClick={() => setSelectedSizeId(sizeId)}
                    >
                      {sizeName}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Информация о наличии */}
          <p>
            Наличие:{" "}
            {availableQuantity > 0
              ? `${availableQuantity} шт.`
              : "Нет в наличии для выбранной комплектации"}
          </p>

          <div className="cart-controls-wrapper">
            <button
              className={`add-to-cart-btn ${quantityInCart > 0 ? "in-cart" : ""}`}
              onClick={handleAddToCart}
              type="button"
              disabled={!canAddToCart}
              title={!canAddToCart ? "Недостаточно товара на складе" : ""}
            >
              {quantityInCart > 0
                ? `В корзине (${quantityInCart})`
                : "В корзину"}
            </button>

            {quantityInCart > 0 && (
              <div className="quantity-controls">
                <button
                  className="quantity-btn"
                  onClick={() =>
                    decreaseQuantity(product.id, selectedColorId, selectedSizeId)
                  }
                  type="button"
                  aria-label="Уменьшить количество"
                >
                  −
                </button>
                <button
                  className="quantity-btn"
                  onClick={handleAddToCart}
                  type="button"
                  aria-label="Увеличить количество"
                  disabled={!canAddToCart}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <section className="reviews-section">
        <div className="reviews-head"><div><p className="page-kicker">Мнения покупателей</p><h2>Отзывы</h2></div><div className="reviews-summary"><strong>{Number(product.rating || 0).toFixed(1)}</strong><span>★★★★★</span><small>{reviews.length} отзывов</small></div></div>
        <div className="reviews-layout">
          <div className="reviews-list">{reviews.length ? reviews.map((item) => <article className="review-card" key={item.id}><div><strong>{item.authorName}</strong><span>{"★".repeat(item.rating)}{"☆".repeat(5-item.rating)}</span></div><p>{item.body}</p><time>{new Date(item.createdAt).toLocaleDateString("ru-RU")}</time></article>) : <div className="reviews-empty">Пока нет отзывов — станьте первым.</div>}</div>
          {localStorage.getItem("authToken") ? <form className="review-form" onSubmit={submitReview}><h3>Оставить отзыв</h3><label>Ваша оценка<select value={review.rating} onChange={(event) => setReview({ ...review, rating: Number(event.target.value) })}>{[5,4,3,2,1].map((value) => <option value={value} key={value}>{"★".repeat(value)} · {value}</option>)}</select></label><label>Комментарий<textarea required minLength="3" maxLength="1500" value={review.body} onChange={(event) => setReview({ ...review, body: event.target.value })} placeholder="Расскажите о посадке, ткани и впечатлениях" /></label><button className="primary-action">Опубликовать</button>{reviewMessage && <p>{reviewMessage}</p>}</form> : <div className="review-login"><h3>Поделитесь впечатлением</h3><p>Чтобы оставить отзыв, войдите в личный кабинет.</p><Link className="primary-action" to="/login">Войти</Link></div>}
        </div>
      </section>
    </div>
  );
}
