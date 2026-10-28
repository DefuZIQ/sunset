import React from "react";
import { Link } from "react-router-dom";
import { useFavorites } from "../../contexts/FavoritesContext";
import "./LikesButton.css"; // путь к твоему CSS

export default function LikesButton() {
  const { favoriteCount } = useFavorites();

  return (
    <Link
      to="/profile/favorites"
      className={`likes-button ${favoriteCount ? "active" : ""}`}
      aria-label="Избранное"
    >
      <svg
        width="30"
        height="29"
        viewBox="0 0 30 29"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M28.5227 12.1345C31.1896 4.56158 22.122 -3.01141 15.1876 6.52493C7.45362 -3.29189 -1.89223 4.77084 1.85276 12.6955L3.45306 14.6589L14.9209 27C14.9209 27 27.9389 13.7922 28.5227 12.1345Z"
          strokeWidth="1.5"
          className="like-path"
        />
      </svg>
      {favoriteCount > 0 && <span className="icon-count">{favoriteCount}</span>}
    </Link>
  );
}
