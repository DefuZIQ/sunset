import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Ошибка при входе");
        }
        return res.json();
      })
      .then((data) => {
        const { uuid, email, firstName, lastName, phone, birthday, avatar, role, token } = data;

        if (!token || !uuid || !email) {
          throw new Error("Ответ от сервера некорректен");
        }

        const user = {
          uuid,
          email,
          firstName,
          lastName,
          phone,
          birthday,
          avatar,
          role
        };

        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
        navigate("/");
      })
      .catch((err) => {
        console.error("Ошибка авторизации:", err);
        setError(err.message);
      });
  };

  return (
    <div className="login_background">
      <div className="login container">
        <div className="login_inline row">
          <div className="login_form col-5">
            <h1>Вход</h1>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login_input"
              />
              <input
                type="password"
                placeholder="Пароль"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login_input"
              />
              <button type="submit" className="login_btn">
                Войти
              </button>
            </form>
            {error && <p style={{ color: "red" }}>{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
