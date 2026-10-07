import { useEffect, useState } from "react";
import { createCustomerAddress, deleteCustomerAddress, syncCustomerAddresses, updateCustomerAddress } from "../api/client";

const blank = { label: "Дом", city: "", street: "", house: "", building: "", structure: "", entrance: "", floor: "", apartment: "", intercom: "", postalCode: "", comment: "" };
const fields = [
  ["label", "Название"], ["city", "Город"], ["street", "Улица"], ["house", "Дом"],
  ["building", "Корпус"], ["structure", "Строение"], ["entrance", "Подъезд"],
  ["floor", "Этаж"], ["apartment", "Квартира / офис"], ["intercom", "Домофон"],
  ["postalCode", "Индекс"], ["comment", "Комментарий курьеру"],
];

export default function AddressBook({ user }) {
  const [addresses, setAddresses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    syncCustomerAddresses(localStorage.getItem("authToken"), user.uuid || user.id)
      .then((items) => { if (active) setAddresses(items); })
      .catch((cause) => { if (active) setError(cause.message || "Не удалось загрузить адреса"); });
    return () => { active = false; };
  }, [user?.uuid, user?.id]);

  const save = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const token = localStorage.getItem("authToken");
      const result = editingId
        ? await updateCustomerAddress(token, editingId, draft)
        : await createCustomerAddress(token, draft);
      setAddresses((current) => editingId
        ? current.map((item) => item.id === editingId ? result : item)
        : [...current, result]);
      setEditingId(null);
      setDraft(null);
    } catch (cause) {
      setError(cause.message || "Не удалось сохранить адрес");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Удалить этот адрес?")) return;
    setError("");
    setBusy(true);
    try {
      await deleteCustomerAddress(localStorage.getItem("authToken"), id);
      setAddresses((current) => current.filter((item) => item.id !== id));
      if (editingId === id) { setEditingId(null); setDraft(null); }
    } catch (cause) {
      setError(cause.message || "Не удалось удалить адрес");
    } finally {
      setBusy(false);
    }
  };

  return <section className="saved-profile-card address-book">
    <h3>Мои адреса</h3>
    {addresses.length ? addresses.map((address) => <div className="saved-profile-row" key={address.id}>
      <div><strong>{address.label}</strong><span>{[address.city, address.street, address.house, address.apartment && `кв. ${address.apartment}`].filter(Boolean).join(", ")}</span></div>
      <div className="address-book__actions">
        <button type="button" disabled={busy} onClick={() => { setEditingId(address.id); setDraft({ ...blank, ...address }); setError(""); }}>Изменить</button>
        <button type="button" disabled={busy} onClick={() => remove(address.id)}>Удалить</button>
      </div>
    </div>) : <p className="muted">Адресов пока нет. Добавьте первый для быстрого оформления заказа.</p>}
    {!draft && <button type="button" className="text-link" onClick={() => { setEditingId(null); setDraft({ ...blank }); setError(""); }}>+ Добавить адрес</button>}
    {draft && <form className="address-book__form" onSubmit={save}>
      {fields.map(([key, label]) => <label key={key}><span>{label}</span><input required={["label", "city", "street", "house"].includes(key)} maxLength={key === "comment" ? 500 : 160} value={draft[key] || ""} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
      <div className="address-book__footer"><button className="primary-action" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить адрес"}</button><button type="button" className="text-link" onClick={() => { setDraft(null); setEditingId(null); setError(""); }}>Отмена</button></div>
    </form>}
    {error && <p className="account-form__error" role="alert">{error}</p>}
  </section>;
}
