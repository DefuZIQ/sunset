import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCategoryTree, listProducts } from "../api/client";
import { readCatalogCache, writeCatalogCache } from "./catalogCache";

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
  const [cachedProducts] = useState(readCatalogCache);
  const [products, setProducts] = useState(() => cachedProducts?.map(normalizeProduct) ?? []);
  const [categoryTree, setCategoryTree] = useState([]);
  const [loading, setLoading] = useState(cachedProducts === null);
  const [catalogError, setCatalogError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    listProducts(controller.signal)
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Invalid catalog response");
        setProducts(data.map(normalizeProduct));
        writeCatalogCache(data);
        setCatalogError(false);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.warn(error.message);
          setCatalogError(true);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getCategoryTree(controller.signal)
      .then((data) => setCategoryTree(Array.isArray(data) ? data : []))
      .catch((error) => { if (error.name !== "AbortError") setCategoryTree([]); });
    return () => controller.abort();
  }, []);

  const value = useMemo(() => ({ products, loading, catalogError, categoryTree }), [products, loading, catalogError, categoryTree]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
