import { useEffect, useState } from "react";
import { getIamUserPermissions, updateIamUserPermissions } from "../../api/client";

const permissionLabels = [
  ["catalog:write", "Управление товарами"],
  ["stock:write", "Остатки магазинов и склада"],
  ["orders:read", "Просмотр заказов и возвратов"],
  ["orders:manage", "Подтверждение заказов и возвратов"],
  ["reviews:moderate", "Модерация отзывов"],
  ["promotions:manage", "Акции и промокоды"],
  ["customers:read", "Просмотр клиентов"],
  ["customers:bonuses:write", "Корректировка бонусов"],
  ["stores:manage", "Управление магазинами"],
];

export default function AdminAccessPanel({ users }) {
  const [userId, setUserId] = useState("");
  const [selected, setSelected] = useState([]);
  const [currentRole, setCurrentRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userId) { setSelected([]); setCurrentRole(""); return; }
    let active = true;
    setLoading(true);
    getIamUserPermissions(sessionStorage.getItem("adminAuthToken"), userId)
      .then((result) => { if (active) { setSelected(result.permissions || []); setCurrentRole(result.role); } })
      .catch((error) => { if (active) setMessage(error.message || "Не удалось загрузить права"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  function toggle(permission) {
    setSelected((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);
  }

  async function save(event) {
    event.preventDefault();
    if (!userId || currentRole === "ADMIN") return;
    setLoading(true);
    setMessage("");
    try {
      const result = await updateIamUserPermissions(sessionStorage.getItem("adminAuthToken"), userId, selected);
      setCurrentRole(result.role);
      setSelected(result.permissions || []);
      setMessage("Права сотрудника сохранены. Изменения действуют сразу.");
    } catch (error) {
      setMessage(error.message || "Не удалось сохранить права");
    } finally {
      setLoading(false);
    }
  }

  return <section className="admin-iam">
    <p className="page-kicker">IAM · Доступ</p>
    <h2>Права сотрудников</h2>
    <p>Выберите существующую учётную запись. Разрешения открывают только указанные операции; администратор сохраняет полный доступ.</p>
    <form onSubmit={save}>
      <label>Учётная запись<select value={userId} onChange={(event) => { setUserId(event.target.value); setMessage(""); }}>
        <option value="">Выберите пользователя</option>
        {users.map((user) => <option value={user.id} key={user.id}>{user.email} · {user.role}</option>)}
      </select></label>
      {userId && <><p>Текущая роль: <strong>{currentRole || "загрузка…"}</strong></p>
        <div className="admin-iam__permissions">{permissionLabels.map(([key, label]) => <label key={key}><input type="checkbox" checked={currentRole === "ADMIN" || selected.includes(key)} disabled={loading || currentRole === "ADMIN"} onChange={() => toggle(key)} /><span>{label}</span></label>)}</div>
        <button type="submit" disabled={loading || currentRole === "ADMIN"}>{loading ? "Сохраняем…" : "Сохранить права"}</button></>}
    </form>
    {message && <p role="status">{message}</p>}
  </section>;
}
