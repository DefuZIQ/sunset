import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SearchButton from "./SearchButton";
import LikesButton from "./LikesButton";
import BasketButton from "./BasketButton";
import AvatarMenu from "./AvatarMenu";
import BrandLogo from "../BrandLogo";
import { countUnreadNotifications } from "../../api/client";
import "./Header.css";

export default function Header({ isAuthenticated, user, onLogout, isPopupOpen }) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();

  const popupSearch = () => {
    setIsSearchActive(true);
    document.body.style.overflow = "hidden";
  };

  const popupSearchClose = () => {
    setIsSearchActive(false);
    document.body.style.overflow = "";
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!user) { setUnreadNotifications(0); return; }
    countUnreadNotifications(localStorage.getItem("authToken"))
      .then((data) => setUnreadNotifications(data.count || 0)).catch(() => {});
  }, [user]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    popupSearchClose();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    }
  };

  return (
    <>
      <nav className="nav__background">
        <div className="container header-container">
          {/* Логотип */}
          <div className="header-left">
            <a href="/" className="navbar__logo" onClick={handleLogoClick}>
              <BrandLogo compact />
            </a>
          </div>

          {/* Бургер-кнопка */}
          <button className="burger" onClick={toggleMobileMenu}>
            ☰
          </button>

          {/* Центр меню */}
          <ul className={`nav-menu ${isMobileMenuOpen ? "active" : ""}`}>
            <li>
              <Link to="/about" onClick={() => setIsMobileMenuOpen(false)}>О НАС</Link>
            </li>
            <li>
              <Link to="/catalog" onClick={() => setIsMobileMenuOpen(false)}>КАТАЛОГ</Link>
            </li>
            <li>
              <Link to="/newproducts" onClick={() => setIsMobileMenuOpen(false)}>НОВИНКИ</Link>
            </li>
            <li>
              <Link to="/promotions" onClick={() => setIsMobileMenuOpen(false)}>АКЦИИ</Link>
            </li>
            <li>
              <Link to="/contacts" onClick={() => setIsMobileMenuOpen(false)}>КОНТАКТЫ</Link>
            </li>
          </ul>

          {/* Правая часть */}
          <div className="header-right">
            <SearchButton onClick={popupSearch} />
            <LikesButton />
            {/* Передача cartItemCount НЕ нужна, BasketButton возьмёт из контекста */}
            <BasketButton />
            <AvatarMenu
              isAuthenticated={isAuthenticated}
              user={user}
              onLogout={onLogout}
              isPopupOpen={isPopupOpen}
            />
          </div>
        </div>
      </nav>

      {/* Поисковый попап */}
      {isSearchActive && (
        <div className="popup_search" onClick={popupSearchClose}>
          <form className="search-form" onSubmit={submitSearch} onClick={(e) => e.stopPropagation()}>
          <span className="search-label">ПОИСК ПО КАТАЛОГУ</span>
          <input
            className="input-search"
            type="text"
            placeholder="Что ищем?"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="btn-search" type="submit">Найти</button>
          {isAuthenticated && <Link className="search-notifications-link" to="/profile/notifications" onClick={popupSearchClose}>Уведомления {unreadNotifications > 0 && <b>{unreadNotifications}</b>} <span>→</span></Link>}
          </form>
        </div>
      )}
    </>
  );
}
