import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Header from "./components/HeaderParts/Header";
import Footer from "./components/FooterParts/Footer";
import Main from "./pages/Main";
import MainCatalog from "./pages/MainCatalog";
import ProductPage from "./pages/ProductPage";
import Login from "./components/Login";
import Registration from "./components/Registration";

import { CartProvider } from "./components/HeaderParts/CartContext";
import AdminProductForm from "./components/Admin/AdminProductForm";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("cartItems");
    setUser(null);
  };

  return (
    <CartProvider>
      <Router>
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
              <Route
                path="/login"
                element={user ? <Navigate to="/" replace /> : <Login setUser={setUser} />}
              />
              <Route
                path="/register"
                element={user ? <Navigate to="/" replace /> : <Registration setUser={setUser} />}
              />
              <Route
                path="/admin/products/new"
                element={user ? <AdminProductForm /> : <Navigate to="/login" replace />}
              />
            </Routes>
          </main>

          <Footer />
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
