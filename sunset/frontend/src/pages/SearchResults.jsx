import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/Main/ProductCard";
import { useStore } from "../contexts/StoreContext";
import { productSearchScore } from "./productSearch";
import "./ContentPages.css";

export default function SearchResults() {
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() || "";
  const { products } = useStore();
  const ranked = products.map((product) => ({ product, score: productSearchScore(product, query) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || Number(b.product.rating || 0) - Number(a.product.rating || 0));
  const found = ranked.map((item) => item.product);
  const suggestions = products.slice().sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 4);
  return <div className="page-shell container"><p className="page-kicker">Умный поиск</p><h1 className="page-title">{query ? `«${query}»` : "Поиск"}</h1>{found.length ? <><p className="page-intro">Найдено товаров: {found.length}. Поиск учитывает опечатки, синонимы, категории, цвета и описание.</p><div className="product-list-grid">{found.map((product) => <ProductCard key={product.id} product={product} />)}</div></> : <><div className="empty-state"><h2>Точного совпадения нет</h2><p>Проверьте запрос или посмотрите товары, которые особенно нравятся покупателям.</p><Link className="text-link" to="/catalog">Перейти в каталог</Link></div><h2 className="search-suggestions-title">Возможно, вам понравится</h2><div className="product-list-grid">{suggestions.map((product) => <ProductCard key={product.id} product={product} />)}</div></>}</div>;
}
