import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { confirmMandatoryMfaSetup, startMandatoryMfaSetup } from "../api/client";

export default function AdminMfaSetup({ setupToken, onFinish, onBack }) {
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const [completion, setCompletion] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true); setError("");
    try { setEnrollment(await startMandatoryMfaSetup(setupToken)); }
    catch (cause) { setError(cause.message || "Не удалось начать настройку. Войдите заново."); }
    finally { setBusy(false); }
  }

  async function confirm(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      setCompletion(await confirmMandatoryMfaSetup(setupToken, code.trim()));
      setEnrollment(null);
      setCode("");
    } catch (cause) { setError(cause.message || "Не удалось подтвердить код"); }
    finally { setBusy(false); }
  }

  return <div className="admin-mfa-setup">
    <p>Для доступа к управлению магазином необходима двухфакторная защита. Пароль подтверждён; теперь привяжите приложение-аутентификатор. Настройку нужно завершить в течение 10 минут.</p>
    {!enrollment && !completion && <button type="button" disabled={busy} onClick={start}>{busy ? "Подготавливаем…" : "Начать настройку"}</button>}
    {enrollment && <>
      <p>Отсканируйте QR-код в приложении-аутентификаторе. Если приложение установлено на этом устройстве, откройте ссылку или введите ключ вручную.</p>
      <div className="admin-mfa__qr" aria-label="QR-код для подключения двухфакторной защиты">
        <QRCodeSVG
          value={enrollment.otpauthUri}
          size={192}
          marginSize={4}
          bgColor="#fffdfb"
          fgColor="#211a17"
          title="QR-код SUNSET для приложения-аутентификатора"
        />
      </div>
      <a className="admin-mfa__link" href={enrollment.otpauthUri}>Открыть в приложении</a>
      <span className="admin-mfa__hint">Ключ для ручного ввода — не сообщайте его никому:</span>
      <code className="admin-mfa__secret">{enrollment.secret}</code>
      <form onSubmit={confirm}>
        <label>Шестизначный код<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value)} /></label>
        <button type="submit" disabled={busy}>{busy ? "Проверяем…" : "Подтвердить код"}</button>
      </form>
    </>}
    {completion && <>
      <p role="status">Защита включена. Сохраните резервные коды в безопасном месте. Они показываются один раз и понадобятся, если телефон будет недоступен.</p>
      <div className="admin-mfa__codes">{completion.recoveryCodes.map((item) => <code key={item}>{item}</code>)}</div>
      <button type="button" onClick={() => onFinish(completion.auth)}>Я сохранил коды — открыть админку</button>
    </>}
    {error && <p role="alert" className="admin-mfa__error">{error}</p>}
    {!completion && <button type="button" className="admin-app__secondary" onClick={onBack}>Начать вход заново</button>}
  </div>;
}
