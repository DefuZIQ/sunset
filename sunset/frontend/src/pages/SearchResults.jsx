import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/Main/ProductCard";
import { useStore } from "../contexts/StoreContext";
import "./ContentPages.css";

const normalize = (value) => String(value || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/gi, " ").trim();
const distance = (left, right) => {
  const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let column = 0; column <= right.length; column += 1) rows[0][column] = column;
  for (let row = 1; row <= left.length; row += 1) for (let column = 1; column <= right.length; column += 1) {
    rows[row][column] = Math.min(rows[row - 1][column] + 1, rows[row][column - 1] + 1, rows[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1));
  }
  return rows[left.length][right.length];
};
const productScore = (product, query) => {
  const text = normalize([product.name, product.description, product.gender, ...(product.categories || []), ...(product.colors || []).map((color) => color.name)].join(" "));
  const words = text.split(" ");
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (!tokens.length) return 0;
  return tokens.reduce((score, token) => {
    if (text.includes(token)) return score + 20;
    const close = words.some((word) => word.length > 3 && distance(word, token) <= (token.length > 7 ? 2 : 1));
    return score + (close ? 8 : -30);
  }, text.startsWith(normalize(query)) ? 40 : 0);
};

export default function SearchResults() {
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() || "";
  const { products } = useStore();
  const ranked = products.map((product) => ({ product, score: productScore(product, query) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || Number(b.product.rating || 0) - Number(a.product.rating || 0));
  const found = ranked.map((item) => item.product);
  const suggestions = products.slice().sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 4);
  return <div className="page-shell container"><p className="page-kicker">Умный поиск</p><h1 className="page-title">{query ? `«${query}»` : "Поиск"}</h1>{found.length ? <><p className="page-intro">Найдено товаров: {found.length}. Поиск учитывает опечатки, категории, цвета и описание.</p><div className="product-list-grid">{found.map((product) => <ProductCard key={product.id} product={product} />)}</div></> : <><div className="empty-state"><h2>Точного совпадения нет</h2><p>Проверьте запрос или посмотрите товары, которые особенно нравятся покупателям.</p><Link className="text-link" to="/catalog">Перейти в каталог</Link></div><h2 className="search-suggestions-title">Возможно, вам понравится</h2><div className="product-list-grid">{suggestions.map((product) => <ProductCard key={product.id} product={product} />)}</div></>}</div>;
}
