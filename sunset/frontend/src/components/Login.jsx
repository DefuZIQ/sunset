import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginCustomer } from "../api/client";
import { adminUrl } from "../admin/adminUrls";
import "./Auth.css";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [adminRequired, setAdminRequired] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = (e) => {
    e.preventDefault();

    setError(null);
    setAdminRequired(false);
    loginCustomer({ email, password })
      .then((data) => {
        if (data.mfaEnrollmentRequired) {
          setPassword("");
          setAdminRequired(true);
          return;
        }
        if (data.mfaRequired && data.challengeToken) {
          setPassword("");
          setAdminRequired(true);
          return;
        }
        finishLogin(data);
      })
      .catch((err) => {
        setError(err.message || "Ошибка при входе");
      });
  };

  const finishLogin = (data) => {
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
  };

  return (
    <div className="login_background">
      <div className="login container">
        <div className="login_inline row">
          <div className="login_form col-5">
            <h1>Вход</h1>
            {location.state?.notice && <p className="auth-notice" role="status">{location.state.notice}</p>}
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
            {adminRequired && <p role="status">Вход сотрудников защищён двухфакторной проверкой. <a href={adminUrl()}>Продолжить в админке</a></p>}
          </div>
        </div>
      </div>
    </div>
  );
}
