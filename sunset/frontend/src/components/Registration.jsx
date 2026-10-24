import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginCustomer, registerCustomer } from "../api/client";
import "./Auth.css";

export default function Registration({ setUser }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const location = useLocation();
  const [email, setEmail] = useState(() => location.state?.email || "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [alreadySignedIn] = useState(() => Boolean(localStorage.getItem("authToken")));

  useEffect(() => {
    if (alreadySignedIn) navigate("/", { replace: true });
  }, [alreadySignedIn, navigate]);

  const handleLogin = async (email, password) => {
    try {
      const data = await loginCustomer({ email, password });
      if (!data.token || !data.uuid) throw new Error("Ответ от сервера некорректен");
      const user = {
        uuid: data.uuid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        birthday: data.birthday,
        avatar: data.avatar,
        role: data.role
      };
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
      setSuccess("Регистрация и вход прошли успешно!");
      navigate("/profile", { replace: true });
      return true;
    } catch (error) {
      setError(error.message || "Ошибка при входе после регистрации");
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);

    const payload = {
      email,
      password,
      firstName,
      lastName,
    };

    try {
      await registerCustomer(payload);

      // После успешной регистрации пробуем сразу войти
      const loginSuccess = await handleLogin(email, password);

      if (loginSuccess) {
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
        setPasswordConfirm("");
      }

    } catch (err) {
      setError(err.message || "Ошибка сети или сервера");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reg_background auth-background">
      <div className="reg container auth-container">
        <div className="reg_inline row">
          <div className="reg_form col-6 auth-card">
            <div className="auth-card__brand" aria-hidden="true"><span>S</span><span>SUNSET</span></div>
            <span className="auth-card__eyebrow">ЛИЧНЫЙ КАБИНЕТ</span>
            <h1>Ваш стиль начинается здесь</h1>
            <p className="auth-card__intro">Создайте аккаунт, чтобы сохранять избранное и следить за заказами.</p>
            <form onSubmit={handleSubmit}>
              <label className="auth-field"><span>Имя</span><input
                type="text"
                placeholder="Имя"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="reg_input"
              /></label>
              <label className="auth-field"><span>Фамилия</span><input
                type="text"
                placeholder="Фамилия"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="reg_input"
              /></label>
              <label className="auth-field"><span>Email</span><input
                type="email"
                placeholder="Email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="reg_input"
              /></label>
              <label className="auth-field"><span>Пароль</span><input
                type="password"
                placeholder="Пароль"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="reg_input"
              /></label>
              <label className="auth-field"><span>Повторите пароль</span><input
                type="password"
                placeholder="Подтверждение пароля"
                autoComplete="new-password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="reg_input"
              /></label>
              <button type="submit" className="reg_btn auth-primary" disabled={loading}>
                {loading ? "Регистрация..." : "Создать аккаунт"} <span aria-hidden="true">↗</span>
              </button>
              {error && <p className="auth-error" role="alert">{error}</p>}
              {success && <p className="auth-notice" role="status">{success}</p>}
            </form>
            <p className="auth-card__switch">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
          </div>
          <div className="reg_info col-6">
            <p>
              Зарегистрируйтесь, чтобы делать заказы, отслеживать их и
              пользоваться всеми преимуществами сайта.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
