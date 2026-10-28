import { NavLink, useLocation } from "react-router-dom";
import { useCart } from "./HeaderParts/CartContext";
import { useFavorites } from "../contexts/FavoritesContext";
import "./MobileTabBar.css";

const icons = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/></>,
  catalog: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  favorites: <path d="M20.8 8.2c0 4.3-8.8 10.9-8.8 10.9S3.2 12.5 3.2 8.2a4.5 4.5 0 0 1 8.8-1.3 4.5 4.5 0 0 1 8.8 1.3Z"/>,
  cart: <><path d="M4 8h16l-1 13H5L4 8Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></>,
  profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
};

export default function MobileTabBar({ isAuthenticated }) {
  const location = useLocation();
  const { cartItemCount } = useCart();
  const { favoriteCount } = useFavorites();
  const tabs = [
    { to: "/", label: "Главная", icon: "home", end: true },
    { to: "/catalog", label: "Каталог", icon: "catalog" },
    { to: "/profile/favorites", label: "Избранное", icon: "favorites", count: favoriteCount },
    { to: "/profile/basket", label: "Корзина", icon: "cart", count: cartItemCount },
    { to: isAuthenticated ? "/profile" : "/login", label: "Профиль", icon: "profile" },
  ];

  return <nav className="mobile-tabs" aria-label="Основная навигация">
    {tabs.map(({ to, label, icon, count, end }) => <NavLink
      key={label}
      to={to}
      end={end || label === "Профиль"}
      className={({ isActive }) => `mobile-tabs__link${isActive || (label === "Профиль" && location.pathname.startsWith("/profile/") && !["/profile/favorites", "/profile/basket"].includes(location.pathname)) ? " is-active" : ""}`}
    >
      <span className="mobile-tabs__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[icon]}</svg>{count > 0 && <span className="mobile-tabs__count">{count > 99 ? "99+" : count}</span>}</span>
      <span className="mobile-tabs__label">{label}</span>
    </NavLink>)}
  </nav>;
}
