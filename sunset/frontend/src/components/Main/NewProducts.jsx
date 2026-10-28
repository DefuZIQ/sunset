import React from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../contexts/StoreContext";
import ProductCard from "../Main/ProductCard"; // проверь путь
import ProductCardSkeleton from "./ProductCardSkeleton";
import "./NewProducts.css";

export default function NewProducts() {
  const { products, loading } = useStore();
  return (
    <section className="container">
      <div className="new__card_title">
        <hr />
        <h2>НОВИНКИ</h2>
        <hr />
      </div>

      <div className="new__card products">
        {loading ? <ProductCardSkeleton count={4} /> : products.slice(0, 4).map((product) => (
          <div key={product.id} className="products__card_body">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      <div className="catalog__view d-flex justify-content-center">
        <Link to="/catalog">СМОТРЕТЬ КАТАЛОГ</Link>
      </div>
    </section>
  );
}
