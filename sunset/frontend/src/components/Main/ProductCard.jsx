import { Link } from "react-router-dom";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../HeaderParts/CartContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { categoryPath } from "../../data/categoryLabels";
import "./ProductCard.css";

export default function ProductCard({ product }) {
  const { addToCart, getItemQuantity, decreaseQuantity } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const [chooseSize, setChooseSize] = useState(false);
  const sizeRowRef = useRef(null);
  const sizeProbeRef = useRef(null);
  const [visibleSizeCount, setVisibleSizeCount] = useState(0);
  const availableSizes = useMemo(() => {
    const bySize = new Map();
    (product?.stock || []).filter((item) => Number(item.quantity) > 0).forEach((item) => {
      if (!bySize.has(item.sizeId)) bySize.set(item.sizeId, item);
    });
    return [...bySize.values()];
  }, [product?.stock]);
  useLayoutEffect(() => {
    const row = sizeRowRef.current;
    const probe = sizeProbeRef.current;
    if (!row || !probe) return undefined;
    let active = true;
    const measure = () => {
      if (!active) return;
      const buttons = [...probe.querySelectorAll("[data-size-probe]")];
      const more = probe.querySelector("[data-more-probe]");
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const width = row.clientWidth;
      const moreWidth = more?.getBoundingClientRect().width || 0;
      let used = 0;
      let count = 0;
      buttons.forEach((button, index) => {
        if (count !== index) return;
        const next = used + (count ? gap : 0) + button.getBoundingClientRect().width;
        const remaining = index < buttons.length - 1;
        if (next + (remaining ? gap + moreWidth : 0) <= width + 0.5) {
          used = next;
          count += 1;
        }
      });
      setVisibleSizeCount(count);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    document.fonts?.ready.then(measure);
    return () => { active = false; observer.disconnect(); };
  }, [availableSizes]);
  if (!product) return null;
  const hiddenSizeCount = Math.max(0, availableSizes.length - visibleSizeCount);
  const selectedStock = availableSizes.find((item) => item.sizeId === selectedSizeId);
  const quantity = selectedStock
    ? getItemQuantity(product.id, selectedStock.colorId, selectedStock.sizeId)
    : getItemQuantity(product.id);
  const image = product.imageUrl || product.image_url;
  const totalStock = (product.stock || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const handleAdd = () => {
    if (!selectedStock) { setChooseSize(true); return; }
    if (quantity >= Number(selectedStock.quantity)) return;
    addToCart({
      ...product,
      selectedColorId: selectedStock.colorId,
      selectedSizeId: selectedStock.sizeId,
      selectedColorName: selectedStock.colorName,
      selectedSizeName: selectedStock.sizeName,
    });
    setChooseSize(false);
  };

  return (
    <article className="product-card">
      <Link to={`/catalog/product/${product.id}`} className="product-image-link" aria-label={product.name}>
        <div className="product-image"><img src={image} alt="" loading="lazy" /></div>
      </Link>
      <button className={`product-favorite ${isFavorite(product.id) ? "active" : ""}`} onClick={() => toggleFavorite(product.id)} aria-label="Избранное">
        {isFavorite(product.id) ? "♥" : "♡"}
      </button>
      <div className="product-card__overlay">
        <div className="product-card__meta"><span>{product.gender === "MEN" ? "Мужчинам" : product.gender === "UNISEX" ? "Унисекс" : "Женщинам"}</span>{categoryPath(product.categories).map((category) => <span key={category}>{category}</span>)}</div>
        <div className="product-card__rating"><span>★ {Number(product.rating || 0).toFixed(1)}</span><small>{product.reviewCount || 0} отзывов</small></div>
        <Link to={`/catalog/product/${product.id}`} className="product-card__title"><h3>{product.name}</h3><strong>{Number(product.price).toLocaleString("ru-RU")} ₽</strong></Link>
        {totalStock > 0 && <>
          <div ref={sizeRowRef} className={`product-card__sizes ${chooseSize ? "is-required" : ""}`} aria-label="Выберите размер">
            {availableSizes.slice(0, visibleSizeCount).map((item) => <button type="button" key={item.sizeId} className={selectedSizeId === item.sizeId ? "selected" : ""} onClick={() => { setSelectedSizeId(item.sizeId); setChooseSize(false); }}>{item.sizeName}</button>)}
            {hiddenSizeCount > 0 && <Link className="product-card__more-sizes" to={`/catalog/product/${product.id}`} aria-label={`Ещё ${hiddenSizeCount} размеров — открыть товар`}>Ещё {hiddenSizeCount} <span aria-hidden="true">↗</span></Link>}
            <div ref={sizeProbeRef} className="product-card__size-probe" aria-hidden="true">
              {availableSizes.map((item) => <span data-size-probe key={item.sizeId}>{item.sizeName}</span>)}
              <span data-more-probe>Ещё {availableSizes.length} ↗</span>
            </div>
          </div>
          {chooseSize && <small className="product-card__size-hint">Выберите размер</small>}
        </>}
        <div className="product-card__buy">
          <button className={`add-to-cart-btn ${selectedStock && quantity ? "in-cart" : ""}`} onClick={handleAdd} disabled={totalStock === 0}>{totalStock === 0 ? "Нет в наличии" : !selectedStock ? "Выбрать размер" : quantity ? `В корзине · ${quantity}` : "В корзину"}</button>
          {selectedStock && quantity > 0 && <button className="product-card__minus" onClick={() => decreaseQuantity(product.id, selectedStock.colorId, selectedStock.sizeId)} aria-label="Уменьшить количество">−</button>}
        </div>
      </div>
    </article>
  );
}
