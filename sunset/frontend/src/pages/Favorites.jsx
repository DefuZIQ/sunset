import { Link } from "react-router-dom";
import ProductCard from "../components/Main/ProductCard";
import { useStore } from "../contexts/StoreContext";
import { useFavorites } from "../contexts/FavoritesContext";
import "./ContentPages.css";
export default function Favorites() { const { products } = useStore(); const { favoriteIds } = useFavorites(); const items = products.filter((p) => favoriteIds.includes(String(p.id))); return <div className="page-shell container"><p className="page-kicker">Ваша подборка</p><h1 className="page-title">Избранное</h1>{items.length ? <div className="product-list-grid">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <div className="empty-state"><h2>Здесь пока пусто</h2><p>Нажмите на сердце в карточке товара, чтобы сохранить его.</p><Link className="text-link" to="/catalog">Выбрать вещи</Link></div>}</div>; }
