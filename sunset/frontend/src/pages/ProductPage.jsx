import { Link, useParams, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "../components/HeaderParts/CartContext";
import "../App.css"; // Для .container
import "../components/Main/ProductCard.css"; // Переиспользуем стили
import "./ProductPage.css"; // Подключаем стили для страницы товара
import { ApiHttpError, createReviewComment, deleteOwnProductReview, deleteReviewComment, getProductById, listProductReviews, listReviewComments, voteProductReview, saveProductReview, uploadProductReviewPhoto } from "../api/client";
import { defaultReviewFilter, reviewSummary, selectReviews } from "./reviewFilters";
import { categoryPath } from "../data/categoryLabels";

const ratingCaptions = ["", "Не понравилось", "Ниже ожиданий", "Нормально", "Хорошо", "Отлично"];
const MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;

async function prepareReviewPhoto(file) {
  if (!file || file.size === 0 || file.size > 25 * 1024 * 1024) throw new Error("Выберите фотографию размером до 25 МБ.");
  const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  if (!isImage) throw new Error("Выберите фотографию в формате JPEG, PNG, WebP или HEIC.");
  if ((file.type === "image/jpeg" || file.type === "image/png" || /\.(jpe?g|png)$/i.test(file.name) && !file.type) && file.size <= MAX_REVIEW_PHOTO_BYTES) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Браузер не открыл это фото. Сохраните его как JPEG или PNG и выберите снова."));
      element.src = objectUrl;
    });
    const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.86, 0.7, 0.55]) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_REVIEW_PHOTO_BYTES) return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
    }
    throw new Error("Не удалось уменьшить фото до 5 МБ. Выберите другое изображение.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function currentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.id || user.uuid || null;
  } catch { return null; }
}

function StarRatingInput({ label, name, value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return <fieldset className="review-rating-field">
    <legend>{label}</legend>
    <div className="review-star-list" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((rating) => <label key={rating} onMouseEnter={() => setHovered(rating)}>
        <input type="radio" name={name} value={rating} checked={value === rating} onChange={() => onChange(rating)} onKeyDown={() => setHovered(0)} aria-label={`${rating} из 5`} />
        <span className={rating <= (hovered || value) ? "is-active" : ""} aria-hidden="true">★</span>
      </label>)}
    </div>
    <small>{value} из 5 · {ratingCaptions[value]}</small>
  </fieldset>;
}

function ReviewReactions({ item, busy, error, onVote }) {
  const signedIn = Boolean(localStorage.getItem("authToken"));
  const reactions = [{ vote: "LIKE", label: "Лайк", count: item.likeCount ?? item.helpfulCount ?? 0 }, { vote: "DISLIKE", label: "Дизлайк", count: item.dislikeCount ?? 0 }];
  return <div className="review-card__actions" aria-label={`Оценить отзыв ${item.authorName}`}>
    {reactions.map(({ vote, label, count }) => signedIn ? <button key={vote} type="button" className={item.myVote === vote ? "is-active" : ""} onClick={() => onVote(item.id, vote)} disabled={busy} aria-pressed={item.myVote === vote} aria-label={`${label} отзыву ${item.authorName}: ${count}`} title={item.myVote === vote ? `Убрать ${label.toLowerCase()}` : label}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className={vote === "DISLIKE" ? "is-dislike" : ""}><path d="M7 10.5 10.8 3.8a2 2 0 0 1 1.7-1h1.1c.9 0 1.5.8 1.3 1.6L14 8h5.2a2.3 2.3 0 0 1 2.2 2.9l-2.1 7.4a2.2 2.2 0 0 1-2.1 1.6H7m0-9.4v9.4H3.6a1.6 1.6 0 0 1-1.6-1.6v-6.2a1.6 1.6 0 0 1 1.6-1.6H7Z" /></svg>
      <span>{count}</span>
    </button> : <Link key={vote} to="/login" className="review-reaction-link" aria-label={`Войти, чтобы поставить ${label.toLowerCase()} отзыву ${item.authorName}`} title={`Войти и поставить ${label.toLowerCase()}`}><svg viewBox="0 0 24 24" aria-hidden="true" className={vote === "DISLIKE" ? "is-dislike" : ""}><path d="M7 10.5 10.8 3.8a2 2 0 0 1 1.7-1h1.1c.9 0 1.5.8 1.3 1.6L14 8h5.2a2.3 2.3 0 0 1 2.2 2.9l-2.1 7.4a2.2 2.2 0 0 1-2.1 1.6H7m0-9.4v9.4H3.6a1.6 1.6 0 0 1-1.6-1.6v-6.2a1.6 1.6 0 0 1 1.6-1.6H7Z" /></svg><span>{count}</span></Link>)}
    {error && <span role="alert">{error}</span>}
  </div>;
}

const sizeTypeLabels = {
  women_clothing: "Женская одежда",
  men_clothing: "Мужская одежда",
  women_dress: "Платья",
  men_trousers: "Мужские брюки",
  women_trousers: "Женские брюки",
  jeans: "Джинсы",
  accessory: "Аксессуары",
};

function ReviewComments({ reviewId, initialCount = 0, viewerId }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(Number(initialCount) || 0);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async (offset = 0) => {
    setLoading(true);
    setError("");
    try {
      const page = await listReviewComments(reviewId, offset);
      setComments((current) => offset === 0 ? page.items : [
        ...current,
        ...page.items.filter((item) => !current.some((existing) => existing.id === item.id)),
      ]);
      setTotal(page.total);
      setLoaded(true);
    } catch (requestError) {
      setError(requestError.message || "Не удалось загрузить комментарии");
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    setOpen((current) => !current);
    if (!open && !loaded) load();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (draft.trim().length < 2 || busy) return;
    setBusy(true);
    setError("");
    try {
      await createReviewComment(localStorage.getItem("authToken"), reviewId, draft.trim());
      setDraft("");
      await load(0);
    } catch (requestError) {
      setError(requestError instanceof ApiHttpError && requestError.status === 401 ? "Войдите в аккаунт ещё раз" : requestError.message || "Не удалось отправить комментарий");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (commentId) => {
    setBusy(true);
    setError("");
    try {
      await deleteReviewComment(localStorage.getItem("authToken"), commentId);
      setDeleteTarget(null);
      await load(0);
    } catch (requestError) {
      setError(requestError.message || "Не удалось удалить комментарий");
    } finally {
      setBusy(false);
    }
  };

  return <section className="review-comments" aria-label="Комментарии к отзыву">
    <button type="button" className="review-comments__toggle" onClick={toggle} aria-expanded={open} aria-controls={`review-comments-${reviewId}`}>
      <span aria-hidden="true">↳</span> Комментарии <span className="review-comments__count">{total}</span><span aria-hidden="true">{open ? "−" : "+"}</span>
    </button>
    {open && <div id={`review-comments-${reviewId}`} className="review-comments__panel">
      {comments.length > 0 ? <div className="review-comments__list">{comments.map((comment) => <article className="review-comment" key={comment.id}>
        <div className="review-comment__avatar" aria-hidden="true">{(comment.authorName || "К").trim().slice(0, 1).toUpperCase()}</div>
        <div className="review-comment__content"><div className="review-comment__meta"><strong>{comment.authorName || "Покупатель"}</strong><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString("ru-RU")}</time></div><p>{comment.body}</p>
          {viewerId && String(comment.userId) === String(viewerId) && (deleteTarget === comment.id ? <div className="review-comment__delete-confirm"><span>Удалить комментарий?</span><button type="button" onClick={() => remove(comment.id)} disabled={busy}>Да, удалить</button><button type="button" onClick={() => setDeleteTarget(null)} disabled={busy}>Отмена</button></div> : <button type="button" className="review-comment__delete" onClick={() => setDeleteTarget(comment.id)}>Удалить</button>)}
        </div>
      </article>)}</div> : !loading && !error && <p className="review-comments__empty">Пока нет комментариев. Начните обсуждение.</p>}
      {comments.length < total && <button type="button" className="review-comments__more" onClick={() => load(comments.length)} disabled={loading}>Показать ещё</button>}
      {loading && <p className="review-comments__status" role="status">Загружаем комментарии…</p>}
      {error && <p className="review-comments__error" role="alert">{error} <button type="button" onClick={() => load(0)}>Повторить</button></p>}
      {viewerId ? <form className="review-comments__form" onSubmit={submit}><label htmlFor={`review-comment-${reviewId}`}>Написать комментарий</label><textarea id={`review-comment-${reviewId}`} value={draft} onChange={(event) => setDraft(event.target.value)} minLength={2} maxLength={1000} required placeholder="Задайте вопрос или поделитесь мнением" /><div><small>{draft.length} / 1000</small><button type="submit" disabled={busy || draft.trim().length < 2}>{busy ? "Отправляем…" : "Отправить ↗"}</button></div></form> : <p className="review-comments__login"><Link to="/login">Войдите в аккаунт</Link>, чтобы оставить комментарий.</p>}
    </div>}
  </section>;
}

function ReviewCard({ item, viewerId, busy, error, onVote, onEdit, onDelete, onOpenPhoto }) {
  const initials = (item.authorName || "К").trim().slice(0, 1).toUpperCase();
  return <article className="review-card">
    <header className="review-card__header">
      <div className="review-card__person"><span className="review-card__avatar" aria-hidden="true">{initials}</span><div><strong>{item.authorName || "Покупатель"}</strong><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</time></div></div>
      <div className="review-card__rating" aria-label={`Оценка ${item.rating} из 5`}><span aria-hidden="true">{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</span><small>{item.rating}/5</small></div>
    </header>
    {item.verifiedPurchase && <span className="review-card__verified">✓ Покупка подтверждена</span>}
    <p className="review-card__body">{item.body}</p>
    {item.photoUrl && <button type="button" className="review-card__photo-button" onClick={(event) => onOpenPhoto(item, event.currentTarget)} aria-label={`Открыть фото из отзыва ${item.authorName} на весь экран`}><img className="review-photo" src={item.photoUrl} alt={`Фото товара от ${item.authorName}`} loading="lazy" /><span>Смотреть фото <span aria-hidden="true">↗</span></span></button>}
    <div className="review-card__details"><span>Качество <strong>{item.qualityRating || item.rating}/5</strong></span><span>Посадка <strong>{({ SMALL: "маломерит", AS_EXPECTED: "по размеру", LARGE: "большемерит" })[item.fit] || "не указана"}</strong></span></div>
    {item.storeReply && <blockquote className="review-card__reply"><strong>SUNSET отвечает</strong><p>{item.storeReply}</p>{item.storeRepliedAt && <time dateTime={item.storeRepliedAt}>{new Date(item.storeRepliedAt).toLocaleDateString("ru-RU")}</time>}</blockquote>}
    <footer className="review-card__footer">{viewerId && String(item.userId) === String(viewerId) && <div className="review-card__owner-actions"><button type="button" className="review-card__edit" onClick={() => onEdit(item)}>Изменить отзыв и фото</button><button type="button" className="review-card__delete" onClick={() => onDelete(item)}>Удалить отзыв</button></div>}<ReviewReactions item={item} busy={busy} error={error} onVote={onVote} /></footer>
    <ReviewComments reviewId={item.id} initialCount={item.commentCount} viewerId={viewerId} />
  </article>;
}

function ReviewPhotoViewer({ review, onClose }) {
  return createPortal(<div className="product-overlay review-photo-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="review-photo-viewer" role="dialog" aria-modal="true" aria-label={`Фото и отзыв ${review.authorName}`}>
      <div className="review-photo-viewer__stage"><img src={review.photoUrl} alt={`Фото товара из отзыва ${review.authorName}`} />
        <div className="review-photo-viewer__caption"><span className="review-photo-viewer__stars" aria-label={`Оценка ${review.rating} из 5`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><p>{review.body}</p><div><strong>{review.authorName || "Покупатель"}</strong><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString("ru-RU")}</time></div></div>
      </div>
      <div className="review-photo-viewer__top"><span>ОТЗЫВ ПОКУПАТЕЛЯ</span><button type="button" data-overlay-close onClick={onClose} aria-label="Закрыть фото">×</button></div>
    </div>
  </div>, document.body);
}

function ReviewPhotoCarousel({ reviews, onOpenPhoto }) {
  const trackRef = useRef(null);
  const [position, setPosition] = useState({ first: true, last: false });

  const updatePosition = () => {
    const track = trackRef.current;
    if (!track) return;
    setPosition({ first: track.scrollLeft <= 2, last: track.scrollLeft + track.clientWidth >= track.scrollWidth - 2 });
  };

  useEffect(() => {
    updatePosition();
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(updatePosition);
    observer.observe(track);
    return () => observer.disconnect();
  }, [reviews]);

  if (!reviews.length) return null;

  const move = (direction) => {
    const track = trackRef.current;
    const card = track?.querySelector(".review-gallery__item");
    if (!track || !card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
  };

  return <section className="review-gallery" aria-labelledby="review-gallery-title">
    <div className="review-gallery__head"><h3 id="review-gallery-title">Фото с отзывами <span aria-hidden="true">· {reviews.length}</span></h3>
      {reviews.length > 1 && <div className="review-gallery__controls"><button type="button" onClick={() => move(-1)} disabled={position.first} aria-label="Предыдущие фотоотзывы">←</button><button type="button" onClick={() => move(1)} disabled={position.last} aria-label="Следующие фотоотзывы">→</button></div>}
    </div>
    <div className="review-gallery__track" ref={trackRef} onScroll={updatePosition} aria-label="Фотографии покупателей">
      {reviews.map((item) => <button type="button" className="review-gallery__item" key={item.id} onClick={() => onOpenPhoto(item)} aria-label={`Открыть фото и отзыв ${item.authorName || "покупателя"}`}>
        <span className="review-gallery__image"><img src={item.photoUrl} alt={`Фото товара от ${item.authorName || "покупателя"}`} loading="lazy" /></span>
        <span className="review-gallery__content"><span className="review-gallery__stars" aria-label={`Оценка ${item.rating} из 5`}>{item.rating} ★</span><span className="review-gallery__author">{item.authorName || "Покупатель"}</span></span>
      </button>)}
    </div>
  </section>;
}

function SizeGuide({ product, rows, selectedColorId, selectedSizeId, onSelect, onClose }) {
  const color = product.colors.find((item) => item.id === selectedColorId);
  const sizeType = rows[0]?.sizeType;
  return createPortal(<div className="product-overlay size-guide-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="size-guide" role="dialog" aria-modal="true" aria-labelledby="size-guide-title">
      <header className="size-guide__header"><div><span className="page-kicker">SUNSET / ПОДБОР РАЗМЕРА</span><h2 id="size-guide-title">Размерная таблица</h2><p>{sizeTypeLabels[sizeType] || "Размеры товара"} · {product.gender === "MEN" ? "мужской" : product.gender === "WOMEN" ? "женский" : "унисекс"} раздел</p></div><button type="button" data-overlay-close onClick={onClose} aria-label="Закрыть таблицу размеров">×</button></header>
      <p className="size-guide__intro">Размеры и ориентиры из каталога для «{product.name}». Наличие показано для цвета {color?.name || "товара"}.</p>
      <div className="size-guide__table-wrap"><table><thead><tr><th scope="col">Размер</th><th scope="col">Замеры / ориентир</th><th scope="col">Наличие</th></tr></thead><tbody>{rows.map((row) => { const stock = product.stock.find((entry) => entry.sizeId === row.sizeId && entry.colorId === selectedColorId); const available = (stock?.quantity || 0) > 0; return <tr key={row.sizeId} className={selectedSizeId === row.sizeId ? "is-selected" : ""}><th scope="row">{row.sizeName}</th><td>{row.sizeDescription || "Замеры не указаны"}</td><td>{available ? <button type="button" onClick={() => { onSelect(row.sizeId); onClose(); }}>Выбрать <span aria-hidden="true">↗</span></button> : <span className="size-guide__unavailable">Нет в этом цвете</span>}</td></tr>; })}</tbody></table></div>
      <p className="size-guide__note">Размеры могут немного отличаться в зависимости от модели. При выборе ориентируйтесь на замеры и описание товара.</p>
    </div>
  </div>, document.body);
}

function DeleteReviewDialog({ review, busy, error, onConfirm, onClose }) {
  return createPortal(<div className="product-overlay review-delete-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="review-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="review-delete-title" aria-describedby="review-delete-description">
      <button type="button" className="review-delete-dialog__close" data-overlay-close onClick={onClose} disabled={busy} aria-label="Закрыть подтверждение">×</button>
      <span className="page-kicker">ВАШ ОТЗЫВ</span>
      <h2 id="review-delete-title">Удалить отзыв?</h2>
      <p id="review-delete-description">Отзыв, оценки и прикреплённое фото исчезнут со страницы товара. Это действие нельзя отменить.</p>
      <blockquote>{review.body}</blockquote>
      {error && <p className="review-delete-dialog__error" role="alert">{error}</p>}
      <div className="review-delete-dialog__actions"><button type="button" onClick={onClose} disabled={busy}>Оставить отзыв</button><button type="button" onClick={onConfirm} disabled={busy}>{busy ? "Удаляем…" : "Удалить навсегда"}</button></div>
    </div>
  </div>, document.body);
}

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
  const [votingReviewId, setVotingReviewId] = useState(null);
  const [voteError, setVoteError] = useState(null);
  const [review, setReview] = useState({ rating: 5, qualityRating: 5, fit: "AS_EXPECTED", photoUrl: "", body: "" });
  const [reviewFile, setReviewFile] = useState(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const photoRequestId = useRef(0);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const reviewFileInput = useRef(null);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewMessageType, setReviewMessageType] = useState("success");
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingReview, setDeletingReview] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteNotice, setDeleteNotice] = useState("");
  const { addToCart, getItemQuantity, decreaseQuantity } = useCart();

  // Состояния для выбранных опций
  const [selectedColorId, setSelectedColorId] = useState(null);
  const [selectedSizeId, setSelectedSizeId] = useState(null);
  const [availableQuantity, setAvailableQuantity] = useState(0);
  const [activePhotoReview, setActivePhotoReview] = useState(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  useEffect(() => {
    if (!activePhotoReview && !sizeGuideOpen && !deleteTarget) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setActivePhotoReview(null);
        setSizeGuideOpen(false);
        if (!deletingReview) setDeleteTarget(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    const frame = requestAnimationFrame(() => document.querySelector(".product-overlay [data-overlay-close]")?.focus());
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [activePhotoReview, sizeGuideOpen, deleteTarget, deletingReview]);

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

  const loadReviews = useCallback(() => listProductReviews(id, localStorage.getItem("authToken")).then(setReviews).catch(() => setReviews([])), [id]);
  useEffect(() => { if (id) loadReviews(); }, [id, loadReviews]);
  useEffect(() => {
    if (!reviewFile) { setPhotoPreview(""); return; }
    const preview = URL.createObjectURL(reviewFile);
    setPhotoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [reviewFile]);

  const clearSelectedReviewPhoto = () => {
    photoRequestId.current += 1;
    setReviewFile(null);
    setUploadedPhotoUrl("");
    setUploadingPhoto(false);
    setPhotoUploadError("");
    if (reviewFileInput.current) reviewFileInput.current.value = "";
  };

  const uploadSelectedReviewPhoto = async (file, requestId) => {
    setUploadingPhoto(true);
    setUploadedPhotoUrl("");
    setPhotoUploadError("");
    try {
      const result = await uploadProductReviewPhoto(localStorage.getItem("authToken"), id, file);
      if (!result?.photoUrl) throw new Error("Сервер не подтвердил загрузку фото. Попробуйте ещё раз.");
      if (requestId === photoRequestId.current) setUploadedPhotoUrl(result.photoUrl);
    } catch (error) {
      if (requestId === photoRequestId.current) setPhotoUploadError(error instanceof ApiHttpError && error.status === 413 ? "Фото слишком большое для загрузки. Выберите другое изображение." : error.message || "Не удалось загрузить фото. Попробуйте ещё раз.");
    } finally {
      if (requestId === photoRequestId.current) setUploadingPhoto(false);
    }
  };

  const selectReviewPhoto = async (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    const requestId = ++photoRequestId.current;
    setReviewFile(null);
    setUploadedPhotoUrl("");
    setPhotoUploadError("");
    setUploadingPhoto(true);
    setReviewMessage("");
    try {
      const prepared = await prepareReviewPhoto(file);
      if (requestId !== photoRequestId.current) return;
      setReviewFile(prepared);
      await uploadSelectedReviewPhoto(prepared, requestId);
    } catch (error) {
      if (requestId === photoRequestId.current) {
        setPhotoUploadError(error.message || "Не удалось подготовить фото.");
        setUploadingPhoto(false);
      }
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (uploadingPhoto || photoUploadError || reviewFile && !uploadedPhotoUrl) {
      setReviewMessage("Дождитесь загрузки фото или уберите выбранный файл.");
      setReviewMessageType("error");
      return;
    }
    setSavingReview(true);
    try {
      const token = localStorage.getItem("authToken");
      const { photoUrl: _existingPhoto, ...reviewDetails } = review;
      const saved = await saveProductReview(token, id, { ...reviewDetails, ...(uploadedPhotoUrl ? { photoUrl: uploadedPhotoUrl } : removeExistingPhoto ? { photoUrl: "" } : {}) });
      if (uploadedPhotoUrl && saved.photoUrl !== uploadedPhotoUrl) throw new Error("Отзыв сохранён, но фото не прикрепилось. Попробуйте добавить его ещё раз.");
      setReview({ rating: 5, qualityRating: 5, fit: "AS_EXPECTED", photoUrl: "", body: "" });
      setEditingReviewId(null);
      clearSelectedReviewPhoto();
      setRemoveExistingPhoto(false);
      setReviewMessage(saved.isHidden ? "Отзыв сохранён, но скрыт модератором." : uploadedPhotoUrl ? "Спасибо! Отзыв и фото опубликованы." : "Спасибо! Отзыв опубликован.");
      setReviewMessageType("success");
      setReviewFormOpen(false);
      setReviews((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      loadReviews();
    } catch (error) {
      setReviewMessage(error instanceof ApiHttpError && error.status === 413 ? "Фото слишком большое для загрузки. Выберите JPEG или PNG до 5 МБ." : error instanceof ApiHttpError && error.status === 401 ? "Сначала войдите в аккаунт" : error.message || "Не удалось сохранить отзыв");
      setReviewMessageType("error");
    } finally {
      setSavingReview(false);
    }
  };

  const editReview = (item) => {
    setReviewFormOpen(true);
    setEditingReviewId(item.id);
    setReview({ rating: item.rating, qualityRating: item.qualityRating || item.rating, fit: item.fit || "AS_EXPECTED", photoUrl: item.photoUrl || "", body: item.body });
    clearSelectedReviewPhoto();
    setRemoveExistingPhoto(false);
    setReviewMessage("");
    requestAnimationFrame(() => document.getElementById("review-form")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const confirmDeleteReview = async () => {
    if (!deleteTarget || deletingReview) return;
    const reviewId = deleteTarget.id;
    setDeletingReview(true);
    setDeleteError("");
    try {
      await deleteOwnProductReview(localStorage.getItem("authToken"), reviewId);
      setReviews((current) => current.filter((item) => item.id !== reviewId));
      getProductById(id).then(setProduct).catch(() => {});
      if (editingReviewId === reviewId) {
        setReview({ rating: 5, qualityRating: 5, fit: "AS_EXPECTED", photoUrl: "", body: "" });
        clearSelectedReviewPhoto();
        setRemoveExistingPhoto(false);
        setEditingReviewId(null);
        setReviewMessage("");
      }
      setDeleteTarget(null);
      setDeleteNotice("Ваш отзыв удалён.");
    } catch (error) {
      setDeleteError(error instanceof ApiHttpError && error.status === 401 ? "Войдите в аккаунт ещё раз, чтобы удалить отзыв." : error.message || "Не удалось удалить отзыв. Попробуйте ещё раз.");
    } finally {
      setDeletingReview(false);
    }
  };

  const voteReview = async (reviewId, vote) => {
    try {
      setVotingReviewId(reviewId);
      setVoteError(null);
      const result = await voteProductReview(localStorage.getItem("authToken"), reviewId, vote);
      setReviews((current) => current.map((item) => item.id === reviewId ? { ...item, likeCount: result.likeCount, dislikeCount: result.dislikeCount, myVote: result.myVote } : item));
    } catch (error) {
      setVoteError({ reviewId, message: error.message || "Не удалось оценить отзыв" });
    } finally {
      setVotingReviewId(null);
    }
  };

  const summary = reviewSummary(reviews);
  const visibleReviews = selectReviews(reviews, reviewFilter);
  const photoReviews = reviews.filter((item) => Boolean(item.photoUrl));
  const viewerId = currentUserId();

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
  const sizeRows = [...new Map(product.stock.map((row) => [row.sizeId, row])).values()]
    .sort((left, right) => String(left.sizeName).localeCompare(String(right.sizeName), "ru", { numeric: true }));
  const selectedColor = product.colors.find((color) => color.id === selectedColorId);

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
          <div className="product-detail-image__label"><span>SUNSET EDIT</span><span>{product.gender === "MEN" ? "MEN" : product.gender === "WOMEN" ? "WOMEN" : "UNISEX"}</span></div>
        </div>

        <div className="product-detail-info">
          <div className="product-category-path"><span>{product.gender === "MEN" ? "Для мужчин" : product.gender === "UNISEX" ? "Унисекс" : "Для женщин"}</span>{categoryPath(product.categories).map((category) => <span key={category}>{category}</span>)}</div>
          <h1>{product.name}</h1>
          <button type="button" className="product-detail-rating" onClick={() => document.getElementById("product-reviews")?.scrollIntoView({ behavior: "smooth" })} aria-label={`Перейти к отзывам: ${reviews.length}`}><span aria-hidden="true">★</span> {(summary.count ? summary.average : Number(product.rating || 0)).toFixed(1)} <small>· {reviews.length} отзывов</small><span aria-hidden="true">↗</span></button>
          {product.description && <p className="product-detail-description">{product.description}</p>}
          <p className="product-detail-price">{product.price} ₽</p>

          <div className="product-option product-option--color">
            <div className="product-option__heading"><b>Цвет</b><span>{selectedColor?.name || "Выберите цвет"}</span></div>
            <div className="colors-list">
              {product.colors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className={`color-btn ${selectedColorId === color.id ? "selected" : ""}`}
                  style={{ backgroundColor: color.hexCode }}
                  onClick={() => setSelectedColorId(color.id)}
                  aria-label={color.name}
                  aria-pressed={selectedColorId === color.id}
                />
              ))}
            </div>
          </div>

          <div className="product-option product-option--size">
            <div className="product-option__heading"><b>Размер</b><button type="button" className="size-guide-trigger" onClick={() => setSizeGuideOpen(true)}>Таблица размеров <span aria-hidden="true">↗</span></button></div>
            <div className="sizes-list">
              {sizeRows.map(({ sizeId, sizeName }) => {
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

          <p className={`product-detail-availability ${availableQuantity > 0 ? "is-available" : ""}`}>
            <span aria-hidden="true" />
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
      <section className="reviews-section" id="product-reviews">
        <div className="reviews-head"><div><p className="page-kicker">Мнения покупателей</p><h2>Отзывы</h2></div><div className="reviews-summary"><strong>{(summary.count ? summary.average : Number(product.rating || 0)).toFixed(1)}</strong><span>★★★★★</span><small>{reviews.length} отзывов</small></div></div>
        {deleteNotice && <p className="review-delete-notice" role="status">{deleteNotice}</p>}
        {reviews.length > 0 && <div className="reviews-toolbar">
          <ReviewPhotoCarousel reviews={photoReviews} onOpenPhoto={setActivePhotoReview} />
          <div className="reviews-filters" aria-label="Фильтры отзывов">
          <div className="reviews-filters__ratings" aria-label="Оценка">
            <button type="button" className={reviewFilter.rating === 0 ? "selected" : ""} aria-pressed={reviewFilter.rating === 0} onClick={() => setReviewFilter((current) => ({ ...current, rating: 0 }))}>Все · {reviews.length}</button>
            {[5, 4, 3, 2, 1].map((rating) => <button type="button" key={rating} className={reviewFilter.rating === rating ? "selected" : ""} aria-pressed={reviewFilter.rating === rating} onClick={() => setReviewFilter((current) => ({ ...current, rating }))} disabled={!summary.counts[rating]}>{rating} ★ <small>{summary.counts[rating]}</small></button>)}
          </div>
          <div className="reviews-filters__options">
            <label><input type="checkbox" checked={reviewFilter.verified} onChange={(event) => setReviewFilter((current) => ({ ...current, verified: event.target.checked }))} />Подтверждённые покупки</label>
            <label><input type="checkbox" checked={reviewFilter.withPhoto} onChange={(event) => setReviewFilter((current) => ({ ...current, withPhoto: event.target.checked }))} />С фото</label>
            <label className="reviews-filters__sort">Сортировка <select value={reviewFilter.sort} onChange={(event) => setReviewFilter((current) => ({ ...current, sort: event.target.value }))} aria-label="Сортировка отзывов"><option value="recommended">Сначала подтверждённые</option><option value="newest">Сначала новые</option><option value="rating-high">Высокие оценки</option><option value="rating-low">Низкие оценки</option></select></label>
          </div>
          </div>
        </div>}
        <div className="reviews-layout">
          <div className="reviews-list">{visibleReviews.length ? visibleReviews.map((item) => <ReviewCard key={item.id} item={item} viewerId={viewerId} busy={votingReviewId === item.id} error={voteError?.reviewId === item.id ? voteError.message : null} onVote={voteReview} onEdit={editReview} onDelete={(target) => { setDeleteNotice(""); setDeleteError(""); setDeleteTarget(target); }} onOpenPhoto={setActivePhotoReview} />) : <div className="reviews-empty">{reviews.length ? <><p>По этим параметрам отзывов нет.</p><button type="button" onClick={() => setReviewFilter(defaultReviewFilter)}>Показать все отзывы</button></> : "Пока нет отзывов — станьте первым."}</div>}</div>
          <div className="review-compose">
            <button type="button" className="review-compose__toggle" aria-expanded={reviewFormOpen} aria-controls={localStorage.getItem("authToken") ? "review-form" : "review-login"} onClick={() => setReviewFormOpen((open) => !open)}><span aria-hidden="true">✎</span>{reviewFormOpen ? "Свернуть форму" : "Написать отзыв"}<span aria-hidden="true">{reviewFormOpen ? "−" : "+"}</span></button>
            {reviewMessage && reviewMessageType === "success" && !reviewFormOpen && <p className="review-compose__notice" role="status">{reviewMessage}</p>}
          {localStorage.getItem("authToken") ? <form id="review-form" className={`review-form ${reviewFormOpen ? "is-open" : ""}`} onSubmit={submitReview}>
            <div className="review-form__head"><span>ВАШЕ МНЕНИЕ</span><h3>Оставить отзыв</h3><p>Поделитесь впечатлением о покупке — это поможет другим выбрать своё.</p></div>
            <StarRatingInput label="Общая оценка" name="rating" value={review.rating} onChange={(rating) => setReview((current) => ({ ...current, rating }))} />
            <StarRatingInput label="Качество" name="qualityRating" value={review.qualityRating} onChange={(qualityRating) => setReview((current) => ({ ...current, qualityRating }))} />
            <div className="review-form__field"><label htmlFor="review-fit">Как подошёл размер</label><div className="review-form__select"><select id="review-fit" value={review.fit} onChange={(event) => setReview((current) => ({ ...current, fit: event.target.value }))}><option value="SMALL">Маломерит</option><option value="AS_EXPECTED">Подошёл по размеру</option><option value="LARGE">Большемерит</option></select></div></div>
            <div className="review-form__field"><span className="review-form__label">Фото товара <small>необязательно</small></span><div className="review-upload"><input ref={reviewFileInput} id="review-photo-upload" type="file" accept="image/*,.heic,.heif" onChange={selectReviewPhoto} aria-label="Фото товара (необязательно)" /><label className="review-upload__trigger" htmlFor="review-photo-upload"><span className="review-upload__icon" aria-hidden="true">＋</span><span><strong>{uploadingPhoto ? "Загружаем фото…" : reviewFile ? reviewFile.name : "Добавить фото"}</strong><small>Из галереи · до 25 МБ, размер будет уменьшен автоматически</small></span></label></div></div>
            {photoPreview && <div className="review-photo-preview"><img src={photoPreview} alt="Предпросмотр фотографии отзыва" /><span role="status">{uploadingPhoto ? "Загружаем на сервер…" : uploadedPhotoUrl ? "Фото загружено. Теперь опубликуйте отзыв." : "Фото пока не загружено."}</span>{photoUploadError && <button type="button" onClick={() => uploadSelectedReviewPhoto(reviewFile, ++photoRequestId.current)}>Повторить загрузку</button>}<button type="button" onClick={clearSelectedReviewPhoto}>Убрать фото</button></div>}
            {photoUploadError && <div className="review-photo-error" role="alert"><span>{photoUploadError}</span><button type="button" onClick={clearSelectedReviewPhoto}>Продолжить без фото</button></div>}
            {!photoPreview && review.photoUrl && !removeExistingPhoto && <div className="review-photo-preview"><img src={review.photoUrl} alt="Текущее фото отзыва" /><span>Фото уже прикреплено к отзыву.</span><button type="button" onClick={() => setRemoveExistingPhoto(true)}>Удалить фото</button></div>}
            <label className="review-form__comment">Комментарий<textarea required minLength="3" maxLength="1500" value={review.body} onChange={(event) => setReview((current) => ({ ...current, body: event.target.value }))} placeholder="Расскажите о посадке, ткани и впечатлениях" /><small>{review.body.length} / 1500</small></label>
            <button className="primary-action review-form__submit" disabled={savingReview || uploadingPhoto || Boolean(photoUploadError) || Boolean(reviewFile && !uploadedPhotoUrl)}>{savingReview ? "Сохраняем…" : uploadingPhoto ? "Загружаем фото…" : "Опубликовать"}<span aria-hidden="true">↗</span></button>
            {reviewMessage && (reviewMessageType === "error" || reviewFormOpen) && <p className={`review-form__message ${reviewMessageType === "error" ? "is-error" : ""}`} role={reviewMessageType === "error" ? "alert" : "status"}>{reviewMessage}</p>}
          </form> : <div id="review-login" className={`review-login ${reviewFormOpen ? "is-open" : ""}`}><h3>Поделитесь впечатлением</h3><p>Чтобы оставить отзыв, войдите в личный кабинет.</p><Link className="primary-action" to="/login">Войти</Link></div>}
          </div>
        </div>
      </section>
      {activePhotoReview && <ReviewPhotoViewer review={activePhotoReview} onClose={() => setActivePhotoReview(null)} />}
      {sizeGuideOpen && <SizeGuide product={product} rows={sizeRows} selectedColorId={selectedColorId} selectedSizeId={selectedSizeId} onSelect={setSelectedSizeId} onClose={() => setSizeGuideOpen(false)} />}
      {deleteTarget && <DeleteReviewDialog review={deleteTarget} busy={deletingReview} error={deleteError} onConfirm={confirmDeleteReview} onClose={() => setDeleteTarget(null)} />}
    </div>
  );
}
