import { useEffect, useState } from "react";
import { getAddressGeocoderStatus, lookupAddress } from "../api/client";

export default function AddressGeocoder({ draft, onChoose }) {
  const [available, setAvailable] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getAddressGeocoderStatus(localStorage.getItem("authToken"))
      .then((result) => { if (active) setAvailable(Boolean(result.available)); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!available) return null;

  const search = async () => {
    const query = [draft.city, draft.street, draft.house].filter(Boolean).join(", ").trim();
    if (query.length < 5) { setMessage("Укажите город, улицу и дом"); return; }
    setBusy(true);
    setMessage("");
    setCandidates([]);
    try {
      const result = await lookupAddress(localStorage.getItem("authToken"), query);
      setCandidates(result.suggestions || []);
      if (!result.suggestions?.length) setMessage("Адрес не найден. Проверьте написание или заполните вручную.");
    } catch (error) {
      setMessage(error.message || "Не удалось проверить адрес");
    } finally {
      setBusy(false);
    }
  };

  const select = async (candidate) => {
    setBusy(true);
    setMessage("");
    try {
      const result = await lookupAddress(localStorage.getItem("authToken"), candidate.query, true);
      const resolved = result.suggestions?.[0] || candidate;
      onChoose(resolved);
      setCandidates([]);
      if (resolved.lat == null || resolved.lon == null) setMessage("Адрес выбран, но координаты не найдены. Проверьте точку вручную.");
    } catch (error) {
      setMessage(error.message || "Не удалось уточнить адрес");
    } finally {
      setBusy(false);
    }
  };

  return <div className="address-geocoder">
    <button type="button" disabled={busy} onClick={search}>{busy ? "Проверяем…" : "Найти адрес на карте"}</button>
    <small>После нажатия введённый адрес передаётся сервису DaData. Выберите точный вариант из списка.</small>
    {candidates.length > 0 && <div className="address-geocoder__results" role="listbox" aria-label="Найденные адреса">
      {candidates.map((candidate) => <button type="button" role="option" aria-selected="false" key={candidate.query} disabled={busy} onClick={() => select(candidate)}>{candidate.value || candidate.query}</button>)}
    </div>}
    {message && <p role="status">{message}</p>}
  </div>;
}
