import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

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
      const existing = prevItems[product.id];
      return {
        ...prevItems,
        [product.id]: {
          product,
          quantity: existing ? existing.quantity + 1 : 1,
        },
      };
    });
    console.log("Добавлен:", product);
  };

  // Уменьшение количества товара
  const decreaseQuantity = (productId) => {
    setCartItems((prevItems) => {
      const item = prevItems[productId];
      if (!item) return prevItems;

      if (item.quantity <= 1) {
        // Если количество 1, удаляем товар из корзины
        const updated = { ...prevItems };
        delete updated[productId];
        return updated;
      } else {
        // Иначе уменьшаем количество на 1
        return {
          ...prevItems,
          [productId]: {
            ...item,
            quantity: item.quantity - 1,
          },
        };
      }
    });
    console.log("Уменьшено количество товара с ID:", productId);
  };

  // Полное удаление товара из корзины
  const removeFromCart = (productId) => {
    setCartItems((prevItems) => {
      const updated = { ...prevItems };
      delete updated[productId];
      return updated;
    });
    console.log("Удалён ID:", productId);
  };

  // Получение количества по ID товара
  const getItemQuantity = (productId) =>
    cartItems[productId]?.quantity || 0;

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
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
