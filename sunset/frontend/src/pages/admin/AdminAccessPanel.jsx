import { useEffect, useMemo, useState } from "react";
import { ADMIN_COOKIE_SESSION, createStaffAccount, getIamAudit, getIamUserPermissions, updateIamUserRole } from "../../api/client";

const roleLabels = {
  CUSTOMER: "Покупатель — без доступа к админке",
  ADMIN: "Администратор — операционное управление магазином",
  WAREHOUSE_ADMIN: "Администратор склада — остатки своего склада",
  STORE_MANAGER: "Управляющий магазином — остатки и самовывоз своей точки",
  CONTENT_MARKETING: "Контент и маркетинг — товары, отзывы, акции",
};
const permissionLabels = {
  "catalog:write": "Товары", "stock:write": "Остатки", "orders:read": "Просмотр заказов",
  "orders:manage": "Обработка заказов", "reviews:moderate": "Отзывы", "promotions:manage": "Акции",
  "customers:read": "Клиенты", "customers:bonuses:write": "Бонусы", "stores:manage": "Магазины",
};

function accessLabel(value) {
  if (!value) return "Нет доступа";
  const [role, scope] = value.split(":");
  if (roleLabels[role]) return `${roleLabels[role]}${scope ? ` · ${scope}` : ""}`;
  return value.split(",").map((permission) => permissionLabels[permission] || permission).join(", ");
}

function AccessAudit({ targetId, refreshKey }) {
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ items: [], hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { setPage(0); }, [targetId]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getIamAudit(ADMIN_COOKIE_SESSION, page, targetId || undefined)
      .then((data) => { if (active) setResult(data); })
      .catch((failure) => { if (active) setError(failure.message || "Не удалось загрузить журнал"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, targetId, refreshKey]);

  return <div className="admin-iam__audit">
    <div className="admin-iam__audit-heading"><div><h3>История изменений доступа</h3><p>{targetId ? "Записи выбранной учётной записи" : "Последние изменения всех сотрудников"}</p></div><button type="button" onClick={() => setPage(0)} disabled={loading || page === 0}>К последним</button></div>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Загружаем историю…</p> : !error && !result.items.length ? <p>Изменений пока нет.</p> : null}
    {!loading && !error && result.items.length > 0 && <ol className="admin-iam__audit-list">{result.items.map((event) => <li key={event.id}>
      <div><strong>{event.targetEmail || "Удалённая учётная запись"}</strong><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString("ru-RU")}</time></div>
      <p>{accessLabel(event.oldPermissions)} <span aria-hidden="true">→</span> {accessLabel(event.newPermissions)}</p>
      <small>Изменил: {event.actorEmail || "Удалённая учётная запись"}</small>
    </li>)}</ol>}
    <div className="admin-iam__audit-pages"><button type="button" disabled={loading || page === 0} onClick={() => setPage((current) => current - 1)}>Назад</button><span>Страница {page + 1}</span><button type="button" disabled={loading || !result.hasMore} onClick={() => setPage((current) => current + 1)}>Далее</button></div>
  </div>;
}

export default function AdminAccessPanel({ users, locations = [], onSaved, canManageAdmins = false }) {
  const [userId, setUserId] = useState("");
  const [current, setCurrent] = useState(null);
  const [roleCode, setRoleCode] = useState("");
  const [locationId, setLocationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [auditRefresh, setAuditRefresh] = useState(0);
  const [newStaff, setNewStaff] = useState({ email: "", password: "", firstName: "", lastName: "", roleCode: "CONTENT_MARKETING", locationId: "" });
  const scoped = roleCode === "WAREHOUSE_ADMIN" || roleCode === "STORE_MANAGER";
  const eligibleLocations = useMemo(() => locations.filter((location) =>
    location.active !== false && location.kind === (roleCode === "WAREHOUSE_ADMIN" ? "WAREHOUSE" : "STORE")), [locations, roleCode]);

  useEffect(() => {
    if (!userId) { setCurrent(null); setRoleCode(""); setLocationId(""); return; }
    let active = true;
    setLoading(true);
    getIamUserPermissions(ADMIN_COOKIE_SESSION, userId)
      .then((result) => {
        if (!active) return;
        setCurrent(result);
        setRoleCode(result.staffRole || (result.role === "CUSTOMER" ? "CUSTOMER" : result.role === "ADMIN" ? "ADMIN" : "LEGACY"));
        setLocationId(result.locationId || "");
      })
      .catch((error) => { if (active) setMessage(error.message || "Не удалось загрузить роль"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  async function save(event) {
    event.preventDefault();
    if (!userId || (current?.role === "ADMIN" && (!canManageAdmins || current?.staffRole === "OWNER")) || roleCode === "LEGACY" || !roleCode) return;
    if (scoped && !locationId) { setMessage("Выберите магазин или склад для этой роли"); return; }
    if (roleCode === "ADMIN" && current?.role !== "ADMIN" && !window.confirm("Назначить полный административный доступ этому сотруднику?")) return;
    setLoading(true);
    setMessage("");
    try {
      const result = await updateIamUserRole(ADMIN_COOKIE_SESSION, userId, roleCode, scoped ? locationId : null);
      setCurrent(result);
      setMessage("Роль сохранена. Прежние сеансы завершены; сотруднику нужно войти заново.");
      setAuditRefresh((current) => current + 1);
      onSaved?.();
    } catch (error) { setMessage(error.message || "Не удалось сохранить роль"); }
    finally { setLoading(false); }
  }

  async function create(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await createStaffAccount(ADMIN_COOKIE_SESSION, { ...newStaff, locationId: newStaff.locationId || null });
      setNewStaff({ email: "", password: "", firstName: "", lastName: "", roleCode: "CONTENT_MARKETING", locationId: "" });
      setMessage("Сотрудник добавлен. Передайте ему временный пароль безопасным способом; при первом входе потребуется MFA.");
      setAuditRefresh((current) => current + 1);
      onSaved?.();
    } catch (error) { setMessage(error.message || "Не удалось добавить сотрудника"); }
    finally { setLoading(false); }
  }

  return <section className="admin-iam">
    <p className="page-kicker">IAM · ДОСТУП</p>
    <h2>Роли сотрудников</h2>
    <p>Сотрудники хранятся отдельно от покупателей. Складские и магазинные права действуют только для выбранной точки. Только владелец может назначать администраторов.</p>
    <form onSubmit={create} className="admin-iam__create">
      <h3>Новый сотрудник</h3>
      <label>Email<input type="email" required autoComplete="off" value={newStaff.email} onChange={(event) => setNewStaff((value) => ({ ...value, email: event.target.value }))} /></label>
      <label>Имя<input required value={newStaff.firstName} onChange={(event) => setNewStaff((value) => ({ ...value, firstName: event.target.value }))} /></label>
      <label>Фамилия<input required value={newStaff.lastName} onChange={(event) => setNewStaff((value) => ({ ...value, lastName: event.target.value }))} /></label>
      <label>Временный пароль<input type="password" required minLength={8} autoComplete="new-password" value={newStaff.password} onChange={(event) => setNewStaff((value) => ({ ...value, password: event.target.value }))} /></label>
      <label>Роль<select value={newStaff.roleCode} onChange={(event) => setNewStaff((value) => ({ ...value, roleCode: event.target.value, locationId: "" }))}>
        {Object.entries(roleLabels).filter(([code]) => code !== "CUSTOMER" && (code !== "ADMIN" || canManageAdmins)).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
      </select></label>
      {["WAREHOUSE_ADMIN", "STORE_MANAGER"].includes(newStaff.roleCode) && <label>Точка<select required value={newStaff.locationId} onChange={(event) => setNewStaff((value) => ({ ...value, locationId: event.target.value }))}>
        <option value="">Выберите точку</option>
        {locations.filter((location) => location.active !== false && location.kind === (newStaff.roleCode === "WAREHOUSE_ADMIN" ? "WAREHOUSE" : "STORE")).map((location) => <option key={location.id} value={location.id}>{location.name} · {location.city}</option>)}
      </select></label>}
      <button type="submit" disabled={loading}>{loading ? "Добавляем…" : "Добавить сотрудника"}</button>
    </form>
    <form onSubmit={save}>
      <label>Учётная запись<select value={userId} onChange={(event) => { setUserId(event.target.value); setMessage(""); }}>
        <option value="">Выберите сотрудника</option>
        {users.map((user) => <option value={user.id} key={user.id}>{user.email} · {user.role}</option>)}
      </select></label>
      {current && <>
        <p>Текущий доступ: <strong>{current.staffRole ? roleLabels[current.staffRole] || (current.staffRole === "OWNER" ? "Владелец" : current.staffRole) : current.role === "ADMIN" ? "Администратор" : current.role === "STAFF" ? "Индивидуальные права (старый режим)" : "Покупатель"}</strong></p>
        {(current.role !== "ADMIN" || (canManageAdmins && current.staffRole !== "OWNER")) && <>
          <label>Новая роль<select value={roleCode} onChange={(event) => { setRoleCode(event.target.value); setLocationId(""); }} disabled={loading}>
            {roleCode === "LEGACY" && <option value="LEGACY">Выберите роль вместо индивидуальных прав</option>}
            {Object.entries(roleLabels).filter(([code]) => code !== "CUSTOMER" && (code !== "ADMIN" || canManageAdmins)).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select></label>
          {scoped && <label>{roleCode === "WAREHOUSE_ADMIN" ? "Склад" : "Магазин"}<select aria-label={roleCode === "WAREHOUSE_ADMIN" ? "Склад" : "Магазин"} value={locationId} onChange={(event) => setLocationId(event.target.value)} disabled={loading} required>
            <option value="">Выберите точку</option>
            {eligibleLocations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.city}</option>)}
          </select></label>}
          <button type="submit" disabled={loading || roleCode === "LEGACY" || (scoped && !locationId)}>{loading ? "Сохраняем…" : "Назначить роль"}</button>
        </>}
        {!!current.permissions?.length && <p>Действующие права: {current.permissions.map((permission) => permissionLabels[permission] || permission).join(", ")}.</p>}
      </>}
    </form>
    {message && <p role="status">{message}</p>}
    <AccessAudit targetId={userId} refreshKey={auditRefresh} />
  </section>;
}
