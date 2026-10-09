import { Link, useParams, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCart } from "../components/HeaderParts/CartContext";
import "../App.css"; // Для .container
import "../components/Main/ProductCard.css"; // Переиспользуем стили
import "./ProductPage.css"; // Подключаем стили для страницы товара
import { ApiHttpError, getProductById, listProductReviews, markProductReviewHelpful, saveProductReview, uploadProductReviewPhoto } from "../api/client";
import { defaultReviewFilter, reviewSummary, selectReviews } from "./reviewFilters";

export default function ProductPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const requestedColorId = searchParams.get("color");
  const requestedSizeId = searchParams.get("size");
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewFilter, setReviewFilter] = useState(defaultReviewFilter);
  const [helpfulReviewIds, setHelpfulReviewIds] = useState(() => new Set());
  const [helpfulError, setHelpfulError] = useState(null);
  const [review, setReview] = useState({ rating: 5, qualityRating: 5, fit: "AS_EXPECTED", photoUrl: "", body: "" });
  const [reviewFile, setReviewFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const reviewFileInput = useRef(null);
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

    getProductById(id)
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
        setError(err instanceof ApiHttpError && err.status === 404 ? "Товар не найден" : "Ошибка загрузки товара");
        setLoading(false);
      });
  }, [id, requestedColorId, requestedSizeId]);

  const loadReviews = useCallback(() => listProductReviews(id).then(setReviews).catch(() => setReviews([])), [id]);
  useEffect(() => { if (id) loadReviews(); }, [id, loadReviews]);
  useEffect(() => {
    if (!reviewFile) { setPhotoPreview(""); return; }
    const preview = URL.createObjectURL(reviewFile);
    setPhotoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [reviewFile]);

  const selectReviewPhoto = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setReviewFile(null);
      event.target.value = "";
      setReviewMessage("Выберите JPEG или PNG размером до 5 МБ");
      return;
    }
    setReviewFile(file);
    setReviewMessage("");
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setSavingReview(true);
    try {
      const token = localStorage.getItem("authToken");
      const uploaded = reviewFile ? await uploadProductReviewPhoto(token, id, reviewFile) : null;
      const saved = await saveProductReview(token, id, { ...review, photoUrl: uploaded?.photoUrl || "" });
      setReview({ rating: 5, qualityRating: 5, fit: "AS_EXPECTED", photoUrl: "", body: "" });
      setReviewFile(null);
      if (reviewFileInput.current) reviewFileInput.current.value = "";
      setReviewMessage(saved.isHidden ? "Отзыв сохранён, но скрыт модератором." : "Спасибо! Отзыв опубликован.");
      loadReviews();
    } catch (error) {
      setReviewMessage(error instanceof ApiHttpError && error.status === 401 ? "Сначала войдите в аккаунт" : error.message || "Не удалось сохранить отзыв");
    } finally {
      setSavingReview(false);
    }
  };

  const markHelpful = async (reviewId) => {
    try {
      setHelpfulError(null);
      const result = await markProductReviewHelpful(localStorage.getItem("authToken"), reviewId);
      setReviews((current) => current.map((item) => item.id === reviewId ? { ...item, helpfulCount: result.helpfulCount } : item));
      setHelpfulReviewIds((current) => new Set(current).add(reviewId));
    } catch (error) {
      setHelpfulError({ reviewId, message: error.message || "Не удалось отметить отзыв" });
    }
  };

  const summary = reviewSummary(reviews);
  const visibleReviews = selectReviews(reviews, reviewFilter);

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
        <div className="reviews-head"><div><p className="page-kicker">Мнения покупателей</p><h2>Отзывы</h2></div><div className="reviews-summary"><strong>{(summary.count ? summary.average : Number(product.rating || 0)).toFixed(1)}</strong><span>★★★★★</span><small>{reviews.length} отзывов</small></div></div>
        {reviews.length > 0 && <div className="reviews-filters" aria-label="Фильтры отзывов">
          <div className="reviews-filters__ratings" aria-label="Оценка">
            <button type="button" className={reviewFilter.rating === 0 ? "selected" : ""} aria-pressed={reviewFilter.rating === 0} onClick={() => setReviewFilter((current) => ({ ...current, rating: 0 }))}>Все · {reviews.length}</button>
            {[5, 4, 3, 2, 1].map((rating) => <button type="button" key={rating} className={reviewFilter.rating === rating ? "selected" : ""} aria-pressed={reviewFilter.rating === rating} onClick={() => setReviewFilter((current) => ({ ...current, rating }))} disabled={!summary.counts[rating]}>{rating} ★ <small>{summary.counts[rating]}</small></button>)}
          </div>
          <div className="reviews-filters__options">
            <label><input type="checkbox" checked={reviewFilter.verified} onChange={(event) => setReviewFilter((current) => ({ ...current, verified: event.target.checked }))} />Подтверждённые покупки</label>
            <label><input type="checkbox" checked={reviewFilter.withPhoto} onChange={(event) => setReviewFilter((current) => ({ ...current, withPhoto: event.target.checked }))} />С фото</label>
            <label className="reviews-filters__sort">Сортировка <select value={reviewFilter.sort} onChange={(event) => setReviewFilter((current) => ({ ...current, sort: event.target.value }))} aria-label="Сортировка отзывов"><option value="recommended">Сначала подтверждённые</option><option value="newest">Сначала новые</option><option value="rating-high">Высокие оценки</option><option value="rating-low">Низкие оценки</option></select></label>
          </div>
        </div>}
        <div className="reviews-layout">
          <div className="reviews-list">{visibleReviews.length ? visibleReviews.map((item) => <article className="review-card" key={item.id}><div><strong>{item.authorName}{item.verifiedPurchase&&<em>Покупка подтверждена</em>}</strong><span>{"★".repeat(item.rating)}{"☆".repeat(5-item.rating)}</span></div><p>{item.body}</p>{item.storeReply&&<blockquote className="review-card__reply"><strong>SUNSET отвечает</strong><p>{item.storeReply}</p>{item.storeRepliedAt&&<time>{new Date(item.storeRepliedAt).toLocaleDateString("ru-RU")}</time>}</blockquote>}{item.photoUrl&&<img className="review-photo" src={item.photoUrl} alt="Фотография покупателя" loading="lazy"/>}<small>Качество: {item.qualityRating||item.rating}/5 · Посадка: {({SMALL:"маломерит",AS_EXPECTED:"соответствует размеру",LARGE:"большемерит"})[item.fit]||"не указана"}</small><time>{new Date(item.createdAt).toLocaleDateString("ru-RU")}</time><div className="review-card__actions">{localStorage.getItem("authToken") ? <button type="button" onClick={() => markHelpful(item.id)} disabled={helpfulReviewIds.has(item.id)} aria-label={`Отметить отзыв ${item.authorName} полезным`}>{helpfulReviewIds.has(item.id) ? "✓ Спасибо" : "Полезно"} · {item.helpfulCount || 0}</button> : <Link to="/login">Полезно · {item.helpfulCount || 0}</Link>}{helpfulError?.reviewId === item.id && <span role="alert">{helpfulError.message}</span>}</div></article>) : <div className="reviews-empty">{reviews.length ? <><p>По этим параметрам отзывов нет.</p><button type="button" onClick={() => setReviewFilter(defaultReviewFilter)}>Показать все отзывы</button></> : "Пока нет отзывов — станьте первым."}</div>}</div>
          {localStorage.getItem("authToken") ? <form className="review-form" onSubmit={submitReview}>
            <h3>Оставить отзыв</h3>
            <label>Общая оценка<select value={review.rating} onChange={(event) => setReview({ ...review, rating: Number(event.target.value) })}>{[5,4,3,2,1].map((value) => <option value={value} key={value}>{"★".repeat(value)} · {value}</option>)}</select></label>
            <label>Качество<select value={review.qualityRating} onChange={(event)=>setReview({...review,qualityRating:Number(event.target.value)})}>{[5,4,3,2,1].map((value)=><option value={value} key={value}>{value} из 5</option>)}</select></label>
            <label>Как подошёл размер<select value={review.fit} onChange={(event)=>setReview({...review,fit:event.target.value})}><option value="SMALL">Маломерит</option><option value="AS_EXPECTED">Соответствует</option><option value="LARGE">Большемерит</option></select></label>
            <label className="review-photo-picker">Фото товара (необязательно)<input ref={reviewFileInput} type="file" accept="image/jpeg,image/png" onChange={selectReviewPhoto} /><small>JPEG или PNG, до 5 МБ</small></label>
            {photoPreview && <div className="review-photo-preview"><img src={photoPreview} alt="Предпросмотр фотографии отзыва" /><button type="button" onClick={() => { setReviewFile(null); if (reviewFileInput.current) reviewFileInput.current.value = ""; }}>Убрать фото</button></div>}
            <label>Комментарий<textarea required minLength="3" maxLength="1500" value={review.body} onChange={(event) => setReview({ ...review, body: event.target.value })} placeholder="Расскажите о посадке, ткани и впечатлениях" /></label>
            <button className="primary-action" disabled={savingReview}>{savingReview ? "Сохраняем…" : "Опубликовать"}</button>
            {reviewMessage && <p role="status">{reviewMessage}</p>}
          </form> : <div className="review-login"><h3>Поделитесь впечатлением</h3><p>Чтобы оставить отзыв, войдите в личный кабинет.</p><Link className="primary-action" to="/login">Войти</Link></div>}
        </div>
      </section>
    </div>
  );
}
