import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useCart } from "../HeaderParts/CartContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import "./ProductCard.css";

export default function ProductCard({ product }) {
  const { addToCart, getItemQuantity, decreaseQuantity } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const [chooseSize, setChooseSize] = useState(false);
  const availableSizes = useMemo(() => {
    const bySize = new Map();
    (product?.stock || []).filter((item) => Number(item.quantity) > 0).forEach((item) => {
      if (!bySize.has(item.sizeId)) bySize.set(item.sizeId, item);
    });
    return [...bySize.values()];
  }, [product?.stock]);
  if (!product) return null;
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
        <div className="product-card__meta"><span>{product.gender === "MEN" ? "Мужчинам" : product.gender === "UNISEX" ? "Унисекс" : "Женщинам"}</span>{(product.categories || []).map((category) => <span key={category}>{category}</span>)}</div>
        <div className="product-card__rating"><span>★ {Number(product.rating || 0).toFixed(1)}</span><small>{product.reviewCount || 0} отзывов</small></div>
        <Link to={`/catalog/product/${product.id}`} className="product-card__title"><h3>{product.name}</h3><strong>{Number(product.price).toLocaleString("ru-RU")} ₽</strong></Link>
        {totalStock > 0 && <div className={`product-card__sizes ${chooseSize ? "is-required" : ""}`} aria-label="Выберите размер">
          {availableSizes.map((item) => <button type="button" key={item.sizeId} className={selectedSizeId === item.sizeId ? "selected" : ""} onClick={() => { setSelectedSizeId(item.sizeId); setChooseSize(false); }}>{item.sizeName}</button>)}
          {chooseSize && <small>Выберите размер</small>}
        </div>}
        <div className="product-card__buy">
          <button className={`add-to-cart-btn ${selectedStock && quantity ? "in-cart" : ""}`} onClick={handleAdd} disabled={totalStock === 0}>{totalStock === 0 ? "Нет в наличии" : !selectedStock ? "Выбрать размер" : quantity ? `В корзине · ${quantity}` : "В корзину"}</button>
          {selectedStock && quantity > 0 && <button className="product-card__minus" onClick={() => decreaseQuantity(product.id, selectedStock.colorId, selectedStock.sizeId)} aria-label="Уменьшить количество">−</button>}
        </div>
      </div>
    </article>
  );
}
