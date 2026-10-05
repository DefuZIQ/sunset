import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { products as fallbackProducts } from "../data/products";
import { listProducts } from "../api/client";

const StoreContext = createContext(null);

const normalizeProduct = (product, index) => ({
  ...product,
  id: String(product.id),
  imageUrl: product.imageUrl || product.image_url || `/images/products/${(index % 10) + 1}.png`,
  gender: product.gender || "WOMEN",
  categories: product.categories?.length ? product.categories : [product.category || "Одежда"],
  colors: product.colors?.length ? product.colors : [
    { id: `black-${product.id}`, name: "Чёрный", hexCode: "#272421" },
  ],
  stock: product.stock?.length ? product.stock : ["XS", "S", "M", "L"].map((size) => ({
    sizeId: `${size}-${product.id}`,
    sizeName: size,
    colorId: `black-${product.id}`,
    colorName: "Чёрный",
    quantity: 8,
  })),
});

export function StoreProvider({ children }) {
  const [products, setProducts] = useState(fallbackProducts.map(normalizeProduct));
  const [categoryTree, setCategoryTree] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    listProducts(controller.signal)
      .then((data) => {
        if (Array.isArray(data) && data.length) setProducts(data.map(normalizeProduct));
      })
      .catch((error) => {
        if (error.name !== "AbortError") console.warn(error.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    fetch("/products/categories/tree")
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setCategoryTree(Array.isArray(data) ? data : []))
      .catch(() => setCategoryTree([]));
  }, []);

  const value = useMemo(() => ({ products, loading, categoryTree }), [products, loading, categoryTree]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
