import { Link } from "react-router-dom";
import { useCart } from "../HeaderParts/CartContext";
import "./ProductCard.css";

export default function ProductCard({ product }) {
  const { addToCart, getItemQuantity, decreaseQuantity } = useCart();

  if (!product) {
    // Если продукт отсутствует, рендерим null (ничего)
    return null;
  }

  const quantity = getItemQuantity(product.id);
  const isInCart = quantity > 0;

  return (
    <div className="product-card" data-bg={product.imageUrl}>
      <Link to={`/catalog/product/${product.id}`} className="product-image-link">
        <div
          className="product-image"
          style={{
            backgroundImage: `url(${product.imageUrl})`,
          }}
        ></div>
      </Link>
      <div className="product-card__content">
        <Link to={`/catalog/product/${product.id}`}>
          <p className="product-card__name">{product.name}</p>
        </Link>
        <p className="product-card__price">{product.price}₽</p>

        <div className="cart-controls-wrapper">
          <button
            className={`add-to-cart-btn ${isInCart ? "in-cart" : ""}`}
            onClick={() => addToCart(product)}
            type="button"
          >
            {isInCart ? `В корзине (${quantity})` : "В корзину"}
          </button>

          {isInCart && (
            <div className="quantity-controls">
              <button
                className="quantity-btn"
                onClick={() => decreaseQuantity(product.id)}
                type="button"
                aria-label="Уменьшить количество"
              >
                −
              </button>
              <button
                className="quantity-btn"
                onClick={() => addToCart(product)}
                type="button"
                aria-label="Увеличить количество"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
