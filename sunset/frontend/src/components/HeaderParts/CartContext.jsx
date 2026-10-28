import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

const cartKey = (productId, colorId, sizeId) =>
  [productId, colorId || "default", sizeId || "default"].join("::");

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem("cartItems");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("cartItems", JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  // Добавление товара (увеличение количества)
  const addToCart = (product) => {
    setCartItems((prevItems) => {
      const key = cartKey(product.id, product.selectedColorId, product.selectedSizeId);
      const existing = prevItems[key];
      return {
        ...prevItems,
        [key]: {
          product,
          quantity: existing ? existing.quantity + 1 : 1,
        },
      };
    });
  };

  // Уменьшение количества товара
  const decreaseQuantity = (productId, colorId, sizeId) => {
    setCartItems((prevItems) => {
      const key = cartKey(productId, colorId, sizeId);
      const legacyKey = prevItems[key] ? key : productId;
      const item = prevItems[legacyKey];
      if (!item) return prevItems;

      if (item.quantity <= 1) {
        // Если количество 1, удаляем товар из корзины
        const updated = { ...prevItems };
        delete updated[legacyKey];
        return updated;
      } else {
        // Иначе уменьшаем количество на 1
        return {
          ...prevItems,
          [legacyKey]: {
            ...item,
            quantity: item.quantity - 1,
          },
        };
      }
    });
  };

  // Полное удаление товара из корзины
  const removeFromCart = (productId, colorId, sizeId) => {
    setCartItems((prevItems) => {
      const updated = { ...prevItems };
      const key = cartKey(productId, colorId, sizeId);
      delete updated[prevItems[key] ? key : productId];
      return updated;
    });
  };

  const clearCart = () => setCartItems({});

  // Получение количества по ID товара
  const getItemQuantity = (productId, colorId, sizeId) => {
    if (colorId || sizeId) return cartItems[cartKey(productId, colorId, sizeId)]?.quantity || 0;
    return Object.values(cartItems)
      .filter((item) => item.product.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Общее количество товаров в корзине
  const cartItemCount = Object.values(cartItems).reduce(
    (total, item) => total + item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        decreaseQuantity,
        removeFromCart,
        getItemQuantity,
        cartItemCount,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
