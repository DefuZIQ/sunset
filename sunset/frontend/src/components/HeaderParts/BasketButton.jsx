import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../HeaderParts/CartContext";
import "./BasketButton.css";

export default function BasketButton() {
  const {
    cartItems,
    addToCart,
    removeFromCart,
    decreaseQuantity,
    cartItemCount,
  } = useCart();

  const items = Object.values(cartItems);

  const totalPrice = items.reduce(
    (sum, item) => sum + (item.product.price || 0) * item.quantity,
    0
  );

  const increaseQuantity = (product) => {
    addToCart(product);
  };

  return (
    <div className="dropdown">
      <button
        className="basket cart"
        aria-haspopup="true"
        aria-expanded="false"
        aria-label="Корзина"
        type="button"
      >
        <svg
          width="22"
          height="29"
          viewBox="0 0 22 29"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M21.2667 6.59091H17.6V5.93182C17.6 2.65548 14.6454 0 11 0C7.3546 0 4.4 2.65548 4.4 5.93182V6.59091H0.733333C0.328533 6.59091 0 6.88552 0 7.25V27.0227C0 28.1148 0.984867 29 2.2 29H19.8C21.0144 29 22 28.1148 22 27.0227V7.25C22 6.88552 21.6722 6.59091 21.2667 6.59091ZM5.86667 5.93182C5.86667 3.38377 8.16493 1.31818 11 1.31818C13.8351 1.31818 16.1333 3.38377 16.1333 5.93182V6.59091H5.86667V5.93182ZM20.5333 27.0227C20.5333 27.3872 20.2055 27.6818 19.8 27.6818H2.2C1.7952 27.6818 1.46667 27.3872 1.46667 27.0227V7.90909H4.4V9.88636C4.4 10.2508 4.72853 10.5455 5.13333 10.5455C5.53813 10.5455 5.86667 10.2508 5.86667 9.88636V7.90909H16.1333V9.88636C16.1333 10.2508 16.4611 10.5455 16.8667 10.5455C17.2722 10.5455 17.6 10.2508 17.6 9.88636V7.90909H20.5333V27.0227Z"
            fill="#3D3530"
          />
        </svg>
        {cartItemCount > 0 && <div className="cart__num">{cartItemCount}</div>}
      </button>

      <div className="dropdown-basket">
        <div className="dropdown__background_basket">
          <div className="basket__mini basket__mini_scroll">
            {items.length === 0 ? (
              <div className="cart-empty-state"><div className="cart-empty-state__art" aria-hidden="true">🛍️</div><strong>Корзина отдыхает</strong><span>Добавьте пару вещей — они будут ждать вас здесь</span><Link className="cart-empty-state__link" to="/catalog">Перейти в каталог <b>→</b></Link></div>
            ) : (
              items.map(({ product, quantity }) => (
                <div
                  className="cart__item"
                  key={`${product.id}-${product.selectedColorId || "default"}-${product.selectedSizeId || "default"}`}
                >
                  <Link
                    className="cart__item-link"
                    to={`/catalog/product/${product.id}?color=${encodeURIComponent(product.selectedColorId || "")}&size=${encodeURIComponent(product.selectedSizeId || "")}`}
                    aria-label={`Открыть ${product.name || "товар"} с выбранными параметрами`}
                  >
                    <img className="cart__item-image" src={product.imageUrl || product.image_url} alt={product.name || "Товар"} />
                    <span className="cart__item-copy">
                      <strong>{product.name || "Без названия"}</strong>
                      <small>{[product.selectedColorName, product.selectedSizeName].filter(Boolean).join(" · ") || "Выбранный вариант"}</small>
                      <b>{Number(product.price || 0).toLocaleString("ru-RU")} ₽</b>
                    </span>
                  </Link>
                  <div className="cart__item-actions">
                    <button
                      onClick={() => decreaseQuantity(product.id, product.selectedColorId, product.selectedSizeId)}
                      aria-label="Уменьшить количество"
                      style={{
                        cursor: "pointer",
                        padding: "0 8px",
                        fontSize: "1.2rem",
                      }}
                    >
                      −
                    </button>
                    <span>{quantity}</span>
                    <button
                      onClick={() => increaseQuantity(product)}
                      aria-label="Увеличить количество"
                      style={{
                        cursor: "pointer",
                        padding: "0 8px",
                        fontSize: "1.2rem",
                      }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(product.id, product.selectedColorId, product.selectedSizeId)}
                      aria-label="Удалить товар"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#999",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                        marginLeft: "1rem",
                      }}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {cartItemCount > 0 && (
            <>
              <div style={{ padding: "0.5rem 1rem", fontWeight: "bold" }}>
                Сумма: {totalPrice} ₽
              </div>
              <div className="MiniBasket" style={{ padding: "0.5rem 1rem" }}>
                <Link to="/profile/basket">Перейти в корзину</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
