import React, { useEffect, useState } from "react";
import { HashRouter } from "react-router-dom";
import Admin from "../pages/Admin";
import ErrorBoundary from "../components/ErrorBoundary";
import { ApiHttpError, getIamIdentity, loginCustomer, revokeSession, verifyMfaLogin } from "../api/client";
import AdminMfaPanel from "./AdminMfaPanel";
import AdminMfaSetup from "./AdminMfaSetup";
import "./AdminApp.css";

export default function AdminApp() {
  const [status, setStatus] = useState("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [challengeToken, setChallengeToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [setupToken, setSetupToken] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("adminAuthToken");
    if (!token) { setStatus("guest"); return; }
    getIamIdentity(token)
      .then((access) => { setIdentity(access); setStatus(access.permissions?.length ? "admin" : "denied"); })
      .catch((error) => {
        if (error instanceof ApiHttpError && [401, 403].includes(error.status)) {
          sessionStorage.removeItem("adminAuthToken");
          setStatus("guest");
        } else {
          setMessage("Не удалось проверить доступ. Попробуйте обновить страницу.");
          setStatus("error");
        }
      });
  }, []);

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await loginCustomer({ email, password });
      if (result.mfaRequired && result.challengeToken) {
        setChallengeToken(result.challengeToken);
        setPassword("");
        setStatus("challenge");
        return;
      }
      if (result.mfaEnrollmentRequired && result.setupToken) {
        setSetupToken(result.setupToken);
        setPassword("");
        setStatus("setup");
        return;
      }
      if (!result.token) throw new Error("Сервер не выдал токен доступа");
      await completeSignIn(result.token);
    } catch (error) {
      setMessage(error.message || "Не удалось войти");
    } finally {
      setBusy(false);
    }
  }

  async function completeSignIn(token) {
      const access = await getIamIdentity(token);
      if (!access.permissions?.length) {
        setStatus("denied");
        return;
      }
      sessionStorage.setItem("adminAuthToken", token);
      setIdentity(access);
      setPassword("");
      setChallengeToken("");
      setSetupToken("");
      setMfaCode("");
      setStatus("admin");
  }

  async function finishMfa(event) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const result = await verifyMfaLogin(challengeToken, mfaCode.trim());
      if (!result.token) throw new Error("Сервер не выдал токен доступа");
      await completeSignIn(result.token);
    } catch (error) { setMessage(error.message || "Неверный код"); }
    finally { setBusy(false); }
  }

  async function finishMandatorySetup(auth) {
    if (!auth?.token) { setMessage("Сервер не выдал токен доступа"); return; }
    try { await completeSignIn(auth.token); }
    catch (error) { setMessage(error.message || "Не удалось открыть админку"); }
  }

  async function signOut() {
    const token = sessionStorage.getItem("adminAuthToken");
    if (token) {
      setBusy(true);
      try { await revokeSession(token); }
      catch (error) {
        setMessage(error.message || "Не удалось завершить сеанс на сервере");
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    sessionStorage.removeItem("adminAuthToken");
    setStatus("guest");
    setIdentity(null);
    setChallengeToken("");
    setSetupToken("");
    setMessage("");
  }

  return <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <div className="admin-app">
      <header className="admin-app__header">
        <a className="admin-app__brand" href="/">SUNSET <span>CONTROL</span></a>
        <nav aria-label="Навигация администрации"><a href="/">Перейти в магазин</a>{status === "admin" && <button type="button" onClick={signOut} disabled={busy}>{busy ? "Выходим…" : "Выйти"}</button>}</nav>
      </header>
      {status === "admin" ? <main>{message && <p role="alert">{message}</p>}<AdminMfaPanel token={sessionStorage.getItem("adminAuthToken")} /><ErrorBoundary variant="app"><Admin identity={identity} /></ErrorBoundary></main> :
        <main className="admin-app__access">
          <div className="admin-app__access-card">
            <p className="page-kicker">SUNSET CONTROL</p>
            <h1>Панель управления</h1>
            {status === "loading" && <p role="status">Проверяем доступ…</p>}
            {status === "error" && <button type="button" onClick={() => window.location.reload()}>Проверить снова</button>}
            {status === "denied" && <><p role="alert">У этой учётной записи нет доступа к управлению магазином.</p><button type="button" onClick={signOut}>Войти с другой учётной записью</button></>}
            {status === "guest" && <form onSubmit={signIn}>
              <label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              <label>Пароль<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              <button type="submit" disabled={busy}>{busy ? "Входим…" : "Войти"}</button>
            </form>}
            {status === "challenge" && <form onSubmit={finishMfa}>
              <p>Введите код из приложения-аутентификатора или резервный код.</p>
              <label>Одноразовый код<input autoFocus autoComplete="one-time-code" inputMode="numeric" required value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} /></label>
              <button type="submit" disabled={busy}>{busy ? "Проверяем…" : "Подтвердить вход"}</button>
              <button type="button" className="admin-app__secondary" onClick={() => { setStatus("guest"); setChallengeToken(""); setMfaCode(""); }}>Назад к паролю</button>
            </form>}
            {status === "setup" && <AdminMfaSetup setupToken={setupToken} onFinish={finishMandatorySetup}
              onBack={() => { setStatus("guest"); setSetupToken(""); setMessage(""); }} />}
            {message && <p role="alert">{message}</p>}
          </div>
        </main>}
    </div>
  </HashRouter>;
}
