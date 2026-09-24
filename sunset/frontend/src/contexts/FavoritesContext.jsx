import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("favoriteIds")) || []; } catch { return []; }
  });

  useEffect(() => localStorage.setItem("favoriteIds", JSON.stringify(favoriteIds)), [favoriteIds]);

  const toggleFavorite = (id) => setFavoriteIds((items) =>
    items.includes(String(id)) ? items.filter((item) => item !== String(id)) : [...items, String(id)]
  );

  const value = useMemo(() => ({
    favoriteIds,
    favoriteCount: favoriteIds.length,
    isFavorite: (id) => favoriteIds.includes(String(id)),
    toggleFavorite,
  }), [favoriteIds]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() { return useContext(FavoritesContext); }
