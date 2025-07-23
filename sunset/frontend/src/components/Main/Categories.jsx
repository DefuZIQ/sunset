import React, { useEffect } from "react";
import CategoryCard from "./CategoryCard";
import "./Categories.css";

const Categories = ({ categories = [] }) => {
  useEffect(() => {
    document.querySelectorAll(".category-card").forEach((card) => {
      const bg = card.dataset.bg;
      if (bg) {
        card.style.setProperty("--category-bg", `url(${bg})`);
        card.style.setProperty(
          "--category-before",
          `linear-gradient(0deg, rgba(0, 0, 0, 0.3), rgba(255, 253, 251, 0.1)), url(${bg})`
        );
      }
    });
  }, [categories]);

  if (!Array.isArray(categories) || categories.length === 0) {
    return <p>Категории не найдены.</p>;
  }

  return (
    <section className="main__categories container">
      <div className="category__title">
        <hr />
        <h2>КАТЕГОРИИ ТОВАРОВ</h2>
        <hr />
      </div>
      <div className="category__card categories">
        {categories.map((category) => (
          // Добавляем data-bg для работы эффекта из useEffect
          <CategoryCard
            key={category.id}
            category={category}
            data-bg={category.image_url} 
          />
        ))}
      </div>
    </section>
  );
};

export default Categories;
