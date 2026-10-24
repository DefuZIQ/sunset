import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiHttpError, loginCustomer } from "../api/client";
import "./Auth.css";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [missingCustomer, setMissingCustomer] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = (e) => {
    e.preventDefault();

    setError(null);
    setMissingCustomer(null);
    loginCustomer({ email, password })
      .then((data) => {
        if (data.mfaEnrollmentRequired || data.mfaRequired) {
          setPassword("");
          setMissingCustomer("staff");
          return;
        }
        finishLogin(data);
      })
      .catch((err) => {
        if (err instanceof ApiHttpError && err.status === 404) {
          setMissingCustomer("not-found");
          return;
        }
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
            {missingCustomer && (
              <div className="auth-missing" role="status">
                <p className="auth-missing-title">Покупательской учётной записи нет</p>
                <p>Зарегистрируйтесь, чтобы пользоваться личным кабинетом и оформлять заказы.</p>
                {missingCustomer === "staff" && (
                  <p className="auth-missing-hint">Этот email уже используется для входа сотрудников. Пока для нового покупательского аккаунта понадобится другой email.</p>
                )}
                <Link className="auth-missing-link" to="/register" state={missingCustomer === "not-found" ? { email } : { staffEmailInUse: true }}>
                  Зарегистрироваться
                </Link>
              </div>
            )}
            {error && <p className="auth-error" role="alert">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
