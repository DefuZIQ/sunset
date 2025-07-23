import React, { useState, useEffect } from "react";
import ProductCard from "../components/Main/ProductCard";
import "./MainCatalog.css"; // создадим CSS для раскладки

export default function MainCatalog() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filter, setFilter] = useState({
    priceMin: "",
    priceMax: "",
    search: ""
  });

  useEffect(() => {
    fetch("http://localhost:8080/products/all")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setFilteredProducts(data);
      });
  }, []);

  // Фильтрация при изменении фильтров
  useEffect(() => {
    let filtered = products;

    if (filter.search) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(filter.search.toLowerCase())
      );
    }

    if (filter.priceMin) {
      filtered = filtered.filter((p) => p.price >= parseFloat(filter.priceMin));
    }

    if (filter.priceMax) {
      filtered = filtered.filter((p) => p.price <= parseFloat(filter.priceMax));
    }

    setFilteredProducts(filtered);
  }, [filter, products]);

  const handleInputChange = (e) => {
    setFilter({
      ...filter,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="catalog-container container">
      <aside className="filter-sidebar">
        <h3>Фильтры</h3>
        <div className="filter-group">
          <label>Поиск по имени</label>
          <input
            type="text"
            name="search"
            value={filter.search}
            onChange={handleInputChange}
            placeholder="Введите название"
          />
        </div>

        <div className="filter-group">
          <label>Цена от</label>
          <input
            type="number"
            name="priceMin"
            value={filter.priceMin}
            onChange={handleInputChange}
            placeholder="Мин"
            min="0"
          />
        </div>

        <div className="filter-group">
          <label>Цена до</label>
          <input
            type="number"
            name="priceMax"
            value={filter.priceMax}
            onChange={handleInputChange}
            placeholder="Макс"
            min="0"
          />
        </div>
      </aside>

      <main className="products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <p>Продукты не найдены.</p>
        )}
      </main>
    </div>
  );
}
