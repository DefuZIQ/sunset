import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AvatarMenu.css";

export default function AvatarMenu({ isAuthenticated, user, onLogout, isPopupOpen }) {
  const navigate = useNavigate();

  const handleLogoutClick = (e) => {
    e.preventDefault();
    onLogout();
    navigate("/");
  };
  const displayName = [user?.firstName || user?.name, user?.lastName || user?.surname].filter(Boolean).join(" ") || "Клиент SUNSET";
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="dropdown dropdown--account">
      <button
        className="avatar"
        aria-haspopup="true"
        aria-expanded="false"
        aria-label="Профиль"
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M20.5 6.5C20.5 9.06709 18.0224 11.5 14.5 11.5C10.9776 11.5 8.5 9.06709 8.5 6.5C8.5 3.93291 10.9776 1.5 14.5 1.5C18.0224 1.5 20.5 3.93291 20.5 6.5ZM22 6.5C22 10.0899 18.6421 13 14.5 13C10.3579 13 7 10.0899 7 6.5C7 2.91015 10.3579 0 14.5 0C18.6421 0 22 2.91015 22 6.5ZM26.5 27.9459L26.4999 28H27.9999L28 27.9459C28 20.1841 21.732 16 14 16C6.26801 16 0 20.1841 0 27.9459L0.000101359 28H1.50011L1.5 27.9459C1.5 24.5135 2.86531 21.9623 5.03457 20.236C7.24215 18.4791 10.387 17.5 14 17.5C17.613 17.5 20.7578 18.4791 22.9654 20.236C25.1347 21.9623 26.5 24.5135 26.5 27.9459Z" fill="#3D3530"/>
        </svg>
      </button>

      {isAuthenticated ? (
        <div className="dropdown-profile profile-popup--signed" role="menu" aria-label="Аккаунт">
          <div className="profile-popup__head">
            <Link to="/profile" className="profile-popup__avatar" role="menuitem">
              {user?.avatar ? <img src={user.avatar} alt="" /> : initials}
            </Link>
            <div><span>SUNSET ID</span><strong>{displayName}</strong><small>{user?.email || "Ваш профиль"}</small></div>
          </div>
          <div className="dropdown__background_profile">
            <Link className="profile-popup__signed-primary" to="/profile" role="menuitem">Личный кабинет <span aria-hidden="true">→</span></Link>
            <div className="profile-popup__signed-links">
              <Link to="/profile/orders" role="menuitem">Мои заказы <span aria-hidden="true">↗</span></Link>
              <Link to="/profile/notifications" role="menuitem">Уведомления <span aria-hidden="true">↗</span></Link>
              <Link to="/profile/settings#password" role="menuitem">Изменить пароль <span aria-hidden="true">↗</span></Link>
              {user?.role === "ADMIN" && <Link to="/admin" role="menuitem">Управление магазином <span aria-hidden="true">↗</span></Link>}
            </div>
          </div>
          <div className="profile-popup__signed-foot">
            <button onClick={handleLogoutClick} className="logout" aria-label="Выйти">Выйти <span aria-hidden="true">↗</span></button>
          </div>
        </div>
      ) : (
        !isPopupOpen && (
          <div className="dropdown-content profile-popup--guest" role="menu" aria-label="Аккаунт">
            <div className="profile-popup__guest-head">
              <span className="profile-popup__guest-avatar" aria-hidden="true">S</span>
              <div>
                <span className="profile-popup__guest-kicker">SUNSET ID</span>
                <strong>Добро пожаловать</strong>
                <small>Ваш личный стиль начинается здесь</small>
              </div>
            </div>
            <div className="profile-popup__guest-body">
              <p>Войдите, чтобы сохранять избранное, следить за заказами и получать бонусы.</p>
              <Link className="profile-popup__guest-primary" to="/login" role="menuitem">
                Войти <span aria-hidden="true">→</span>
              </Link>
              <Link className="profile-popup__guest-secondary" to="/register" role="menuitem">
                Создать аккаунт <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="profile-popup__guest-foot">Избранное · Заказы · Бонусы</div>
          </div>
        )
      )}
    </div>
  );
}
