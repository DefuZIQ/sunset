import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { listPickupStores } from "../api/client";
import "./ContentPages.css";
import "./Contacts.css";

function coordinates(store) {
  if (store.latitude == null || store.longitude == null) return null;
  const latitude = Number(store.latitude);
  const longitude = Number(store.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? [latitude, longitude] : null;
}

function StoresMap({ stores, selectedId, onSelect, mapRef }) {
  const elementRef = useRef(null);
  const markersRef = useRef(new Map());
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const locatedStores = stores.filter((store) => coordinates(store));

  useEffect(() => {
    if (!elementRef.current || !locatedStores.length) return;
    let cancelled = false;
    let map;
    let frame;
    import("leaflet").then(({ default: L }) => {
      if (cancelled || !elementRef.current) return;
      map = L.map(elementRef.current, { scrollWheelZoom: false });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const bounds = L.latLngBounds([]);
      markersRef.current = new Map();
      locatedStores.forEach((store) => {
        const point = coordinates(store);
        bounds.extend(point);
        const selected = store.id === selectedRef.current;
        const marker = L.circleMarker(point, { radius: selected ? 13 : 10, color: "#fffaf4", weight: 3, fillColor: selected ? "#af7651" : "#765442", fillOpacity: 1 }).addTo(map);
        const popup = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = store.name;
        const address = document.createElement("div");
        address.textContent = `${store.city}, ${store.address}`;
        popup.append(name, address);
        marker.bindPopup(popup);
        marker.on("click", () => onSelect(store.id));
        markersRef.current.set(store.id, marker);
      });
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
      frame = requestAnimationFrame(() => map.invalidateSize());
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      mapRef.current = null;
      markersRef.current.clear();
      map?.remove();
    };
  }, [stores]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => marker.setStyle({
      radius: id === selectedId ? 13 : 10,
      fillColor: id === selectedId ? "#af7651" : "#765442",
    }));
  }, [selectedId, stores]);

  return locatedStores.length
    ? <div ref={elementRef} className="stores-map" role="img" aria-label={`Карта магазинов SUNSET: ${locatedStores.length} меток`} />
    : <div className="stores-map stores-map--empty">Для магазинов пока не указаны координаты карты.</div>;
}

export default function Contacts() {
  const [stores, setStores] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const mapRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    listPickupStores(controller.signal)
      .then((items) => {
        const active = items.filter((store) => store.active !== false);
        setStores(active);
        setSelectedId((previous) => active.some((store) => store.id === previous) ? previous : active[0]?.id || null);
      })
      .catch((failure) => { if (failure.name !== "AbortError") setError("Не удалось загрузить магазины. Попробуйте ещё раз."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reloadKey]);

  const focusStore = (store) => {
    setSelectedId(store.id);
    const point = coordinates(store);
    if (point) mapRef.current?.flyTo(point, Math.max(mapRef.current.getZoom(), 14), { duration: 0.6 });
  };

  return <div className="page-shell container contacts-page">
    <p className="page-kicker">Мы на связи</p>
    <h1 className="page-title">Контакты</h1>
    <p className="page-intro">Поможем подобрать размер, расскажем о составе и статусе заказа. Отвечаем ежедневно с 9:00 до 21:00.</p>

    <section className="contact-grid contact-grid--support" aria-label="Связаться с нами">
      <article className="contact-card"><h3>Позвонить</h3><p><a href="tel:+79200220122">+7 (920) 022-01-22</a></p><p>Ежедневно, 9:00–21:00</p></article>
      <article className="contact-card"><h3>Написать</h3><p><a href="mailto:hello@t3ch.pro">hello@t3ch.pro</a></p><p>Ответим в течение рабочего дня</p></article>
    </section>

    <section className="stores-section" aria-labelledby="stores-title">
      <div className="stores-section__head"><div><p className="page-kicker">Найдите нас рядом</p><h2 id="stores-title">Наши магазины</h2></div>{!loading && !error && <span>{stores.length} {stores.length === 1 ? "магазин" : stores.length < 5 ? "магазина" : "магазинов"}</span>}</div>
      {loading && <p className="stores-section__status" role="status">Загружаем адреса магазинов…</p>}
      {error && <div className="stores-section__status" role="alert">{error} <button type="button" onClick={() => setReloadKey((value) => value + 1)}>Повторить</button></div>}
      {!loading && !error && !stores.length && <p className="stores-section__status">Список магазинов пока пуст.</p>}
      {!loading && !error && stores.length > 0 && <div className="stores-directory">
        <StoresMap stores={stores} selectedId={selectedId} onSelect={setSelectedId} mapRef={mapRef} />
        <div className="stores-directory__list" aria-label="Адреса магазинов">
          {stores.map((store) => {
            const point = coordinates(store);
            const route = point
              ? `https://www.openstreetmap.org/directions?to=${encodeURIComponent(point.join(","))}`
              : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${store.city}, ${store.address}`)}`;
            return <article className={`store-card ${selectedId === store.id ? "is-selected" : ""}`} key={store.id}>
              <button type="button" className="store-card__select" onClick={() => focusStore(store)} aria-label={`Показать ${store.name} на карте`}>
                <span className="store-card__name">{store.name}</span><span aria-hidden="true">↗</span>
              </button>
              <p>{store.city}, {store.address}</p>
              {store.hours && <small>{store.hours}</small>}
              <div className="store-card__links">{store.phone && <a href={`tel:${store.phone.replace(/[^\d+]/g, "")}`}>{store.phone}</a>}<a href={route} target="_blank" rel="noreferrer">Маршрут →</a></div>
            </article>;
          })}
        </div>
      </div>}
    </section>
  </div>;
}
