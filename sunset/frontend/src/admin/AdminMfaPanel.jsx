import React, { useEffect, useState } from "react";
import { confirmMfaEnrollment, disableMfa, getMfaStatus, startMfaEnrollment } from "../api/client";

export default function AdminMfaPanel({ token, onSessionRevoked }) {
  const [status, setStatus] = useState(null);
  const [step, setStep] = useState("idle");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [enrollment, setEnrollment] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMfaStatus(token).then(setStatus).catch(() => setError("Не удалось проверить двухфакторную защиту"));
  }, [token]);

  async function begin(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await startMfaEnrollment(token, password);
      setEnrollment(result);
      setPassword("");
      setStep("confirm");
    } catch (cause) { setError(cause.message || "Не удалось начать настройку"); }
    finally { setBusy(false); }
  }

  async function confirm(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await confirmMfaEnrollment(token, code.trim());
      setRecoveryCodes(result.recoveryCodes);
      setEnrollment(null);
      setCode("");
      setStep("recovery");
    } catch (cause) { setError(cause.message || "Проверьте одноразовый код"); }
    finally { setBusy(false); }
  }

  async function remove(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await disableMfa(token, password, code.trim());
      onSessionRevoked();
    } catch (cause) { setError(cause.message || "Не удалось отключить защиту"); }
    finally { setBusy(false); }
  }

  return <section className="admin-mfa" aria-labelledby="admin-mfa-title">
    <div className="admin-mfa__heading"><div><p className="page-kicker">БЕЗОПАСНОСТЬ</p><h2 id="admin-mfa-title">Двухфакторная защита</h2></div><span className={status?.enabled ? "admin-mfa__badge is-on" : "admin-mfa__badge"}>{status?.enabled ? "Включена" : "Не включена"}</span></div>
    {!status && !error && <p>Проверяем настройки…</p>}
    {status?.enabled && step === "idle" && <><p>При входе потребуется код из приложения-аутентификатора или резервный код. Осталось резервных кодов: {status.recoveryCodesRemaining}.</p><button type="button" onClick={() => setStep("disable")}>Отключить защиту</button></>}
    {status && !status.enabled && step === "idle" && <><p>Подключите приложение-аутентификатор. До подтверждения кода текущий вход остаётся обычным.</p><button type="button" onClick={() => setStep("start")}>Настроить защиту</button></>}
    {step === "start" && <form onSubmit={begin}><label>Подтвердите пароль<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label><button disabled={busy}>{busy ? "Подготавливаем…" : "Получить ключ"}</button></form>}
    {step === "confirm" && enrollment && <><p>Добавьте SUNSET в приложение-аутентификатор. Можно открыть ссылку на телефоне или ввести ключ вручную:</p><a className="admin-mfa__link" href={enrollment.otpauthUri}>Открыть в приложении</a><code className="admin-mfa__secret">{enrollment.secret}</code><form onSubmit={confirm}><label>Шестизначный код<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required value={code} onChange={(event) => setCode(event.target.value)} /></label><button disabled={busy}>{busy ? "Проверяем…" : "Подтвердить и включить"}</button></form></>}
    {step === "recovery" && <><p role="status">Защита включена. Сохраните резервные коды в безопасном месте: каждый работает только один раз и больше не будет показан.</p><div className="admin-mfa__codes">{recoveryCodes.map((item) => <code key={item}>{item}</code>)}</div><button type="button" onClick={onSessionRevoked}>Я сохранил коды — войти заново</button></>}
    {step === "disable" && <form onSubmit={remove}><p>Отключение защиты завершит все ваши сеансы. Укажите пароль и код из приложения или резервный код.</p><label>Пароль<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Код<input required value={code} onChange={(event) => setCode(event.target.value)} /></label><button disabled={busy}>{busy ? "Проверяем…" : "Отключить MFA"}</button></form>}
    {error && <p role="alert" className="admin-mfa__error">{error}</p>}
  </section>;
}
