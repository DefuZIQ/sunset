import { Link } from "react-router-dom";
import "./CategoryCard.css";

export default function CategoryCard({ category }) {
  const categories = category.catalogCategories?.length ? category.catalogCategories : [category.name];
  const query = new URLSearchParams();
  categories.forEach((name) => query.append("category[]", name));
  return (
    <Link
      to={`/catalog?${query.toString()}`}
      className="category-card"
      data-bg={category.image_url} // для использования в useEffect с псевдоэлементом ::before
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${category.image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
      }}
    >
      <p>{category.name}</p>
    </Link>
  );
}
