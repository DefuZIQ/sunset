import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginCustomer, registerCustomer } from "../api/client";
import "./Auth.css";

export default function Registration({ setUser }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
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
