import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Header from "./components/HeaderParts/Header";
import Footer from "./components/FooterParts/Footer";
import Main from "./pages/Main";
import MainCatalog from "./pages/MainCatalog";
import ProductPage from "./pages/ProductPage";
import Login from "./components/Login";
import Registration from "./components/Registration";
import About from "./pages/About";
import NewArrivals from "./pages/NewArrivals";
import Contacts from "./pages/Contacts";
import SearchResults from "./pages/SearchResults";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";
import Promotions from "./pages/Promotions";
import Admin from "./pages/Admin";
import AssistantWidget from "./components/AssistantWidget";
import OrderDetail from "./pages/OrderDetail";
import { ApiHttpError, getProfile } from "./api/client";

import { CartProvider } from "./components/HeaderParts/CartContext";
import { StoreProvider } from "./contexts/StoreContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      let cachedUser;
      try {
        cachedUser = JSON.parse(userData);
      } catch {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setAuthReady(true);
        return;
      }
      setUser(cachedUser);
      getProfile(token)
        .then((profile) => {
          const currentUser = { ...cachedUser, ...profile, uuid: profile.id || cachedUser.uuid };
          localStorage.setItem("user", JSON.stringify(currentUser));
          setUser(currentUser);
        })
        .catch((error) => {
          if (error instanceof ApiHttpError && [401, 403].includes(error.status)) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            setUser(null);
          }
        })
        .finally(() => setAuthReady(true));
    } else {
      setAuthReady(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("cartItems");
    setUser(null);
  };

  return (
    <StoreProvider>
    <FavoritesProvider>
    <CartProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div id="root" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <Header
            isAuthenticated={!!user}
            user={user}
            onLogout={handleLogout}
          />

          <main className="main-content" style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Main />} />
              <Route path="/catalog" element={<MainCatalog />} />
              <Route path="/catalog/product/:id" element={<ProductPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/newproducts" element={<NewArrivals />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/promotions" element={<Promotions />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/favorites" element={<Navigate to="/profile/favorites" replace />} />
              <Route path="/profile/basket" element={<Cart user={user} />} />
              <Route path="/profile" element={<Profile user={user} setUser={setUser} />} />
              <Route path="/profile/orders" element={<Profile user={user} setUser={setUser} section="orders" />} />
              <Route path="/profile/orders/:id" element={<OrderDetail user={user} />} />
              <Route path="/profile/favorites" element={<Profile user={user} setUser={setUser} section="favorites" />} />
              <Route path="/profile/loyalty" element={<Profile user={user} setUser={setUser} section="loyalty" />} />
              <Route path="/profile/settings" element={<Profile user={user} setUser={setUser} section="settings" />} />
              <Route path="/profile/notifications" element={<Profile user={user} setUser={setUser} section="notifications" />} />
              <Route path="/profile/addresses" element={<Profile user={user} setUser={setUser} section="addresses" />} />
              <Route
                path="/login"
                element={user ? <Navigate to="/" replace /> : <Login setUser={setUser} />}
              />
              <Route
                path="/register"
                element={<Registration setUser={setUser} />}
              />
              <Route path="/admin" element={!authReady ? null : user?.role === "ADMIN" ? <Admin /> : <Navigate to="/profile" replace />} />
              <Route path="/admin/products/new" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>

          <Footer />
          <AssistantWidget />
        </div>
      </Router>
    </CartProvider>
    </FavoritesProvider>
    </StoreProvider>
  );
}

export default App;
