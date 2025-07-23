import { Link } from "react-router-dom";
import "./CategoryCard.css";

export default function CategoryCard({ category }) {
  return (
    <Link
      to={`/catalog?category%5B%5D=${encodeURIComponent(category.name)}`}
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
