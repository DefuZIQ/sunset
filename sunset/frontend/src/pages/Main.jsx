import React, { useState, useEffect } from "react";
import MainBanner from "../components/Main/MainBanner";
import NewProducts from "../components/Main/NewProducts";
import Categories from "../components/Main/Categories";

import { categories as categoryData } from "../data/categories";
import { products as productData } from "../data/products";

import "./Main.css";

export default function Main() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    setProducts(productData);
    setCategories(categoryData);
  }, []);

  return (
    <main style={{ minHeight: "45.2rem" }}>
      <MainBanner />
      <NewProducts products={products} />
      <Categories categories={categories} />
    </main>
  );
}
