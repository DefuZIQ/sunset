import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCart } from "../components/HeaderParts/CartContext";
import "../App.css"; // Для .container
import "../components/Main/ProductCard.css"; // Переиспользуем стили
import "./ProductPage.css"; // Подключаем стили для страницы товара

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToCart, getItemQuantity, decreaseQuantity } = useCart();

  // Состояния для выбранных опций
  const [selectedColorId, setSelectedColorId] = useState(null);
  const [selectedSizeId, setSelectedSizeId] = useState(null);
  const [availableQuantity, setAvailableQuantity] = useState(0);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    fetch("http://localhost:8080/products/by-uuid", {
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

        // Инициализация выбора: если есть цвета и размеры — выбрать первые из них
        if (data.colors.length > 0) {
          setSelectedColorId(data.colors[0].id);
        }
        if (data.stock.length > 0) {
          setSelectedSizeId(data.stock[0].sizeId);
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

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
    </div>
  );
}
