import React, { useState } from "react";

export default function Registration() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (email, password) => {
    try {
      const response = await fetch("http://localhost:8080/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Ошибка при входе после регистрации");
        return false;
      }

      // Успешный вход
      setSuccess("Регистрация и вход прошли успешно!");
      return true;
    } catch {
      setError("Ошибка сети при входе после регистрации");
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
      const response = await fetch("http://localhost:8080/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const contentType = response.headers.get("Content-Type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setError(data.message || "Ошибка при регистрации");
        } else {
          const text = await response.text();
          setError("Ошибка сервера: " + text);
        }
        setLoading(false);
        return;
      }

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
      setError("Ошибка сети или сервера");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reg_background">
      <div className="reg container">
        <div className="reg_inline row">
          <div className="reg_form col-6">
            <h1>Регистрация</h1>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Имя"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="reg_input"
              />
              <input
                type="text"
                placeholder="Фамилия"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="reg_input"
              />
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="reg_input"
              />
              <input
                type="password"
                placeholder="Пароль"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="reg_input"
              />
              <input
                type="password"
                placeholder="Подтверждение пароля"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="reg_input"
              />
              <button type="submit" className="reg_btn" disabled={loading}>
                {loading ? "Регистрация..." : "Зарегистрироваться"}
              </button>
              {error && <p style={{ color: "red" }}>{error}</p>}
              {success && <p style={{ color: "green" }}>{success}</p>}
            </form>
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
