import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginCustomer, verifyMfaLogin } from "../api/client";
import "./Auth.css";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [challengeToken, setChallengeToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = (e) => {
    e.preventDefault();

    setError(null);
    loginCustomer({ email, password })
      .then((data) => {
        if (data.mfaRequired && data.challengeToken) {
          setChallengeToken(data.challengeToken);
          setPassword("");
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

  const handleMfaSubmit = (e) => {
    e.preventDefault();
    setError(null);
    verifyMfaLogin(challengeToken, mfaCode.trim())
      .then(finishLogin)
      .catch((err) => {
        setError(err.message || "Ошибка при входе");
      });
  };

  return (
    <div className="login_background">
      <div className="login container">
        <div className="login_inline row">
          <div className="login_form col-5">
            <h1>Вход</h1>
            {location.state?.notice && <p className="auth-notice" role="status">{location.state.notice}</p>}
            {challengeToken ? <form onSubmit={handleMfaSubmit}>
              <p>Введите код из приложения-аутентификатора или резервный код.</p>
              <input className="login_input" autoComplete="one-time-code" inputMode="numeric" required value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} placeholder="Одноразовый код" />
              <button type="submit" className="login_btn">Подтвердить вход</button>
              <button type="button" onClick={() => { setChallengeToken(""); setMfaCode(""); }} className="login_btn">Назад</button>
            </form> : <form onSubmit={handleSubmit}>
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
            </form>}
            {error && <p style={{ color: "red" }}>{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
