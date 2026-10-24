import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiHttpError, loginCustomer } from "../api/client";
import "./Auth.css";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [missingCustomer, setMissingCustomer] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = (e) => {
    e.preventDefault();

    setError(null);
    setMissingCustomer(null);
    setLoading(true);
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
      })
      .finally(() => setLoading(false));
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
    <div className="login_background auth-background">
      <div className="login container auth-container">
        <div className="login_inline row">
          <div className="login_form col-5 auth-card">
            <div className="auth-card__brand" aria-hidden="true"><span>S</span><span>SUNSET</span></div>
            <span className="auth-card__eyebrow">ЛИЧНЫЙ КАБИНЕТ</span>
            {location.state?.notice && <p className="auth-notice" role="status">{location.state.notice}</p>}
            {missingCustomer ? (
              <div className="auth-missing" role="status">
                <div className="auth-missing__icon" aria-hidden="true">✦</div>
                <h1>Аккаунт не найден</h1>
                <p>Покупательской учётной записи для <strong>{email}</strong> пока нет.</p>
                {missingCustomer === "staff" && (
                  <p className="auth-missing-hint">Этот email используется для входа сотрудников. Для регистрации покупателя пока нужен другой адрес.</p>
                )}
                <Link className="auth-primary" to="/register" state={missingCustomer === "not-found" ? { email } : { staffEmailInUse: true }}>
                  Создать аккаунт <span aria-hidden="true">↗</span>
                </Link>
                <button className="auth-text-button" type="button" onClick={() => { setMissingCustomer(null); setPassword(""); }}>
                  Войти с другим email
                </button>
              </div>
            ) : (
              <>
                <h1>С возвращением</h1>
                <p className="auth-card__intro">Войдите, чтобы продолжить покупки и посмотреть свои заказы.</p>
                <form onSubmit={handleSubmit}>
                  <label className="auth-field">
                    <span>Email</span>
                    <input type="email" placeholder="Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="login_input" />
                  </label>
                  <label className="auth-field">
                    <span>Пароль</span>
                    <input type="password" placeholder="Пароль" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="login_input" />
                  </label>
                  {error && <p className="auth-error" role="alert">{error}</p>}
                  <button type="submit" className="login_btn auth-primary" disabled={loading}>
                    {loading ? "Входим…" : "Войти"} <span aria-hidden="true">↗</span>
                  </button>
                </form>
                <p className="auth-card__switch">Впервые в SUNSET? <Link to="/register">Создать аккаунт</Link></p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
