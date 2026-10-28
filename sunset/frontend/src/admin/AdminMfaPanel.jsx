import React, { useEffect, useState } from "react";
import { getMfaStatus } from "../api/client";

export default function AdminMfaPanel({ token }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMfaStatus(token).then(setStatus).catch(() => setError("Не удалось проверить двухфакторную защиту"));
  }, [token]);

  return <section className="admin-mfa" aria-labelledby="admin-mfa-title">
    <div className="admin-mfa__heading"><div><p className="page-kicker">БЕЗОПАСНОСТЬ</p><h2 id="admin-mfa-title">Двухфакторная защита</h2></div><span className={status?.enabled ? "admin-mfa__badge is-on" : "admin-mfa__badge"}>{status?.enabled ? "Включена" : "Проверяем"}</span></div>
    {status?.enabled && <p>Защита обязательна для сотрудников. При входе требуется код из приложения-аутентификатора или резервный код. Неиспользованных резервных кодов: {status.recoveryCodesRemaining}.</p>}
    {error && <p role="alert" className="admin-mfa__error">{error}</p>}
  </section>;
}
