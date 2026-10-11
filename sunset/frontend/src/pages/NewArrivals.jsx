import ProductCard from "../components/Main/ProductCard";
import ProductCardSkeleton from "../components/Main/ProductCardSkeleton";
import { useStore } from "../contexts/StoreContext";
import "./ContentPages.css";

export default function NewArrivals() {
  const { products, loading, catalogError } = useStore();
  return <div className="page-shell container"><p className="page-kicker">Свежая подборка</p><h1 className="page-title">Новинки</h1><p className="page-intro">Новые силуэты, фактуры и базовые оттенки сезона. Первые восемь позиций каталога — последние поступления SUNSET.</p>{catalogError && !products.length && <p role="alert">Не удалось загрузить товары. Попробуйте обновить страницу.</p>}<div className="product-list-grid">{loading ? <ProductCardSkeleton count={8} /> : products.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} />)}</div></div>;
}
