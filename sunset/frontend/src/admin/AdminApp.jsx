import React, { useEffect, useState } from "react";
import { HashRouter } from "react-router-dom";
import Admin from "../pages/Admin";
import ErrorBoundary from "../components/ErrorBoundary";
import { ADMIN_COOKIE_SESSION, ApiHttpError, getAdminSession, getIamIdentity, loginStaff, revokeSession, setAdminCsrfToken, verifyMfaLogin } from "../api/client";
import AdminMfaPanel from "./AdminMfaPanel";
import AdminMfaSetup from "./AdminMfaSetup";
import { storefrontUrl } from "./adminUrls";
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
    sessionStorage.removeItem("adminAuthToken");
    getAdminSession()
      .then(({ csrfToken }) => { setAdminCsrfToken(csrfToken); return getIamIdentity(ADMIN_COOKIE_SESSION); })
      .then((access) => { setIdentity(access); setStatus(access.permissions?.length ? "admin" : "denied"); })
      .catch((error) => {
        if (error instanceof ApiHttpError && [401, 403].includes(error.status)) {
          setAdminCsrfToken("");
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
      const result = await loginStaff({ email, password });
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
      throw new Error("Для входа в панель требуется двухфакторная защита");
    } catch (error) {
      setMessage(error.message || "Не удалось войти");
    } finally {
      setBusy(false);
    }
  }

  async function completeSignIn(csrfToken) {
      if (!csrfToken) throw new Error("Сервер не создал защищённый сеанс");
      setAdminCsrfToken(csrfToken);
      const access = await getIamIdentity(ADMIN_COOKIE_SESSION);
      if (!access.permissions?.length) {
        setStatus("denied");
        return;
      }
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
      await completeSignIn(result.csrfToken);
    } catch (error) { setMessage(error.message || "Неверный код"); }
    finally { setBusy(false); }
  }

  async function finishMandatorySetup(auth) {
    if (!auth?.csrfToken) { setMessage("Сервер не создал защищённый сеанс"); return; }
    try { await completeSignIn(auth.csrfToken); }
    catch (error) { setMessage(error.message || "Не удалось открыть админку"); }
  }

  async function signOut() {
    if (status === "admin" || status === "denied") {
      setBusy(true);
      try { await revokeSession(ADMIN_COOKIE_SESSION, true); }
      catch (error) {
        setMessage(error.message || "Не удалось завершить сеанс на сервере");
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setAdminCsrfToken("");
    setStatus("guest");
    setIdentity(null);
    setChallengeToken("");
    setSetupToken("");
    setMessage("");
  }

  return <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <div className="admin-app">
      <header className="admin-app__header">
        <a className="admin-app__brand" href={storefrontUrl()}>SUNSET <span>CONTROL</span></a>
        <nav aria-label="Навигация администрации"><a href={storefrontUrl()}>Перейти в магазин</a>{status === "admin" && <button type="button" onClick={signOut} disabled={busy}>{busy ? "Выходим…" : "Выйти"}</button>}</nav>
      </header>
      {status === "admin" ? <main className="admin-app__main">{message && <p role="alert">{message}</p>}<ErrorBoundary variant="app"><Admin identity={identity} securityPanel={<AdminMfaPanel token={ADMIN_COOKIE_SESSION} />} /></ErrorBoundary></main> :
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
              <label>Одноразовый код<input autoComplete="one-time-code" inputMode="numeric" required value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} /></label>
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
