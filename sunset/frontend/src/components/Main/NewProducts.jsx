import React, { useEffect, useState } from "react";
import ProductCard from "../Main/ProductCard"; // проверь путь
import "./NewProducts.css";

export default function NewProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:8080/products/all");
        if (!res.ok) throw new Error("Ошибка загрузки продуктов");
        const data = await res.json();
        setProducts(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: "red" }}>Ошибка: {error}</p>;

  return (
    <section className="container">
      <div className="new__card_title">
        <hr />
        <h2>НОВИНКИ</h2>
        <hr />
      </div>

      <div className="new__card products">
        {products.slice(0, 4).map((product) => (
          <div key={product.id} className="products__card_body">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      <div className="catalog__view d-flex justify-content-center">
        <a href="/catalog">СМОТРЕТЬ КАТАЛОГ</a>
      </div>
    </section>
  );
}
