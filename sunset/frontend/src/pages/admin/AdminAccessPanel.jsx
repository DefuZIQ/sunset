import { useEffect, useMemo, useState } from "react";
import { ADMIN_COOKIE_SESSION, getIamUserPermissions, updateIamUserRole } from "../../api/client";

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

export default function AdminAccessPanel({ users, locations = [], onSaved, canManageAdmins = false }) {
  const [userId, setUserId] = useState("");
  const [current, setCurrent] = useState(null);
  const [roleCode, setRoleCode] = useState("");
  const [locationId, setLocationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
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
    if (roleCode === "CUSTOMER" && current?.role !== "CUSTOMER" && !window.confirm("Убрать у сотрудника доступ к админке?")) return;
    setLoading(true);
    setMessage("");
    try {
      const result = await updateIamUserRole(ADMIN_COOKIE_SESSION, userId, roleCode, scoped ? locationId : null);
      setCurrent(result);
      setMessage("Роль сохранена. Прежние сеансы завершены; сотруднику нужно войти заново.");
      onSaved?.();
    } catch (error) { setMessage(error.message || "Не удалось сохранить роль"); }
    finally { setLoading(false); }
  }

  return <section className="admin-iam">
    <p className="page-kicker">IAM · ДОСТУП</p>
    <h2>Роли сотрудников</h2>
    <p>Назначьте одну рабочую роль. Складские и магазинные права действуют только для выбранной точки. Только владелец может назначать администраторов; сам владелец назначается отдельно после проверки учётной записи.</p>
    <form onSubmit={save}>
      <label>Учётная запись<select value={userId} onChange={(event) => { setUserId(event.target.value); setMessage(""); }}>
        <option value="">Выберите пользователя</option>
        {users.map((user) => <option value={user.id} key={user.id}>{user.email} · {user.role}</option>)}
      </select></label>
      {current && <>
        <p>Текущий доступ: <strong>{current.staffRole ? roleLabels[current.staffRole] || (current.staffRole === "OWNER" ? "Владелец" : current.staffRole) : current.role === "ADMIN" ? "Администратор" : current.role === "STAFF" ? "Индивидуальные права (старый режим)" : "Покупатель"}</strong></p>
        {(current.role !== "ADMIN" || (canManageAdmins && current.staffRole !== "OWNER")) && <>
          <label>Новая роль<select value={roleCode} onChange={(event) => { setRoleCode(event.target.value); setLocationId(""); }} disabled={loading}>
            {roleCode === "LEGACY" && <option value="LEGACY">Выберите роль вместо индивидуальных прав</option>}
            {Object.entries(roleLabels).filter(([code]) => code !== "ADMIN" || canManageAdmins).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select></label>
          {scoped && <label>{roleCode === "WAREHOUSE_ADMIN" ? "Склад" : "Магазин"}<select value={locationId} onChange={(event) => setLocationId(event.target.value)} disabled={loading} required>
            <option value="">Выберите точку</option>
            {eligibleLocations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.city}</option>)}
          </select></label>}
          <button type="submit" disabled={loading || roleCode === "LEGACY" || (scoped && !locationId)}>{loading ? "Сохраняем…" : "Назначить роль"}</button>
        </>}
        {!!current.permissions?.length && <p>Действующие права: {current.permissions.map((permission) => permissionLabels[permission] || permission).join(", ")}.</p>}
      </>}
    </form>
    {message && <p role="status">{message}</p>}
  </section>;
}
