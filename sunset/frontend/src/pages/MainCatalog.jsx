import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/Main/ProductCard";
import ProductCardSkeleton from "../components/Main/ProductCardSkeleton";
import { useStore } from "../contexts/StoreContext";
import { getStoreAvailability, listPickupStores, searchProducts } from "../api/client";
import { readCatalogFilters, readCatalogPage, writeCatalogFilters, writeCatalogPage } from "./catalogFilters";
import { productSearchScore } from "./productSearch";
import { categoryLabel, categoryRoots } from "../data/categoryLabels";
import "./MainCatalog.css";

const toggleValue = (items, value) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

const sizeGroupOrder = ["womenClothing", "menClothing", "clothing", "trousers", "dresses", "accessories", "shoes"];
const sizeGroupLabels = { womenClothing:"Женская одежда", menClothing:"Мужская одежда", clothing:"Международные размеры", trousers:"Брюки и джинсы", dresses:"Платья", accessories:"Аксессуары", shoes:"Обувь" };
const sizeGroup = (type = "clothing") => type === "women_dress" ? "dresses"
  : ["women_trousers","men_trousers","waist","jeans"].includes(type) ? "trousers"
    : ["accessory","belt","headwear"].includes(type) ? "accessories"
      : type === "shoes" ? "shoes" : type === "women_clothing" ? "womenClothing" : type === "men_clothing" ? "menClothing" : "clothing";
const sizeKey = (stock) => `${stock.sizeType || "clothing"}:${stock.sizeName}`;
const mobileQuery = "(max-width: 760px)";
const filterDrawerQuery = "(max-width: 900px)";
const pageNumbers = (current, count) => {
  const pages = new Set([1, count]);
  for (let page = Math.max(1, current - 2); page <= Math.min(count, current + 2); page += 1) pages.add(page);
  return [...pages].sort((a, b) => a - b);
};

export default function MainCatalog() {
  const { products, loading, catalogError, categoryTree } = useStore();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(mobileQuery).matches);
  const [isFilterDrawer, setIsFilterDrawer] = useState(() => window.matchMedia(filterDrawerQuery).matches);
  const filterToggleRef = useRef(null);
  const filterSidebarRef = useRef(null);
  const [pickupStores, setPickupStores] = useState([]);
  const [storesError, setStoresError] = useState("");
  const [storesReloadKey, setStoresReloadKey] = useState(0);
  const [storeStock, setStoreStock] = useState(null);
  const [storeStockError, setStoreStockError] = useState("");
  const [storeStockReloadKey, setStoreStockReloadKey] = useState(0);
  const [serverPage, setServerPage] = useState(null);
  const [serverError, setServerError] = useState(false);
  const [serverReloadKey, setServerReloadKey] = useState(0);
  const filter = readCatalogFilters(params);
  const pageSize = isMobile ? 20 : 48;
  const requestedPage = readCatalogPage(params);
  const requestKey = `${params.toString()}|${isMobile ? "mobile" : "desktop"}|${serverReloadKey}`;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const pages = isMobile ? Array.from({ length: requestedPage }, (_, index) => index + 1) : [requestedPage];
      Promise.all(pages.map((page) => {
        const query = new URLSearchParams(params);
        query.set("page", String(page));
        query.set("pageSize", String(pageSize));
        return searchProducts(query, controller.signal);
      }))
        .then((results) => {
          if (!controller.signal.aborted) {
            const result = isMobile ? { ...results[0], items: results.flatMap((part) => part.items) } : results[0];
            setServerPage({ key: requestKey, result });
            setServerError(false);
          }
        })
        .catch((error) => { if (!controller.signal.aborted) { console.warn(error.message); setServerError(true); } });
    }, filter.search ? 220 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [requestKey]);

  useEffect(() => {
    const controller = new AbortController();
    setStoresError("");
    listPickupStores(controller.signal)
      .then((rows) => setPickupStores(rows.filter((store) => store.kind === "STORE" && store.active !== false)))
      .catch((error) => { if (!controller.signal.aborted) setStoresError(error.message || "Не удалось загрузить магазины"); });
    return () => controller.abort();
  }, [storesReloadKey]);

  useEffect(() => {
    if (!filter.storeId) { setStoreStock(null); setStoreStockError(""); return undefined; }
    const controller = new AbortController();
    setStoreStock(null);
    setStoreStockError("");
    getStoreAvailability(filter.storeId, controller.signal)
      .then((rows) => { if (!controller.signal.aborted) setStoreStock({ storeId: filter.storeId, rows }); })
      .catch((error) => { if (!controller.signal.aborted) setStoreStockError(error.message || "Не удалось загрузить остатки магазина"); });
    return () => controller.abort();
  }, [filter.storeId, storeStockReloadKey]);

  const selectedStoreStock = storeStock?.storeId === filter.storeId ? storeStock.rows : null;
  const storeStockLoading = Boolean(filter.storeId && !selectedStoreStock && !storeStockError);
  const stockByProduct = useMemo(() => {
    const result = new Map();
    for (const row of selectedStoreStock || []) {
      const key = String(row.productId);
      if (!result.has(key)) result.set(key, []);
      result.get(key).push(row);
    }
    return result;
  }, [selectedStoreStock]);

  useEffect(() => {
    const media = window.matchMedia(mobileQuery);
    const onChange = (event) => setIsMobile(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const media = window.matchMedia(filterDrawerQuery);
    const onChange = (event) => {
      setIsFilterDrawer(event.matches);
      if (!event.matches) setFiltersOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const changeFilters = (change, replace = false) => setParams((currentParams) => {
    const current = readCatalogFilters(currentParams);
    return writeCatalogFilters(currentParams, change(current));
  }, { replace });

  const options = useMemo(() => ({
    categories: [...new Set(products.flatMap((product) => product.categories || []))].sort((a, b) => a.localeCompare(b, "ru")),
    colors: [...new Map(products.flatMap((product) => product.colors || []).map((color) => [color.name, color])).values()],
    sizes: Object.values(products.filter((product) => filter.gender === "all" || product.gender === filter.gender || product.gender === "UNISEX").flatMap((product) => product.stock || []).reduce((all, stock) => {
      const key = sizeKey(stock);
      if (!all[key]) all[key] = { key, name: stock.sizeName, type: stock.sizeType || "clothing", group: sizeGroup(stock.sizeType), description: stock.sizeDescription };
      return all;
    }, {})).sort((a,b) => sizeGroupOrder.indexOf(a.group)-sizeGroupOrder.indexOf(b.group) || a.name.localeCompare(b.name,"ru",{numeric:true})),
  }), [products, filter.gender]);

  const treeCategories = useMemo(() => {
    const flattened = [];
    const walk = (nodes, depth = 0) => (nodes || []).forEach((node) => {
      const descendants = [];
      const collect = (item) => { descendants.push(item.name); (item.children || []).forEach(collect); };
      collect(node);
      flattened.push({ ...node, depth, descendants });
      walk(node.children, depth + 1);
    });
    const visibleRoots = categoryRoots(categoryTree, filter.gender);
    walk(visibleRoots);
    return flattened.length ? flattened : options.categories.map((name) => ({ name, depth: 0, descendants: [name] }));
  }, [categoryTree, options.categories, filter.gender]);

  const catalogMax = useMemo(() => {
    const highest = Math.max(0, ...products.map((product) => Number(product.price) || 0));
    return Math.max(1000, Math.ceil(highest / 1000) * 1000);
  }, [products]);

  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      const price = Number(product.price);
      const productStock = filter.storeId
        ? (stockByProduct.get(String(product.id)) || []).map((row) => ({
          ...(product.stock || []).find((variant) => String(variant.sizeId) === String(row.sizeId) && String(variant.colorId) === String(row.colorId)),
          ...row,
        }))
        : product.stock || [];
      const totalStock = productStock.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      return (!filter.search || productSearchScore(product, filter.search) > 0)
        && (filter.gender === "all" || product.gender === filter.gender || product.gender === "UNISEX")
        && (!filter.min || price >= Number(filter.min))
        && (!filter.max || price <= Number(filter.max))
        && (!filter.categories.length || filter.categories.some((category) => {
          const node = treeCategories.find((item) => item.name === category);
          return (node?.descendants || [category]).some((name) => product.categories?.includes(name));
        }))
        && (!filter.colors.length || filter.colors.some((name) => filter.storeId
          ? productStock.some((stock) => stock.colorName === name && stock.quantity > 0)
          : product.colors?.some((color) => color.name === name)))
        && (!filter.sizes.length || filter.sizes.some((key) => productStock.some((stock) => sizeKey(stock) === key && stock.quantity > 0)))
        && (!filter.reviewedOnly || Number(product.reviewCount || 0) > 0)
        && (!filter.ratingMin || (Number(product.reviewCount || 0) > 0 && Number(product.rating || 0) >= Number(filter.ratingMin)))
        && (!filter.ratingMax || (Number(product.reviewCount || 0) > 0 && Number(product.rating || 0) <= Number(filter.ratingMax)))
        && (!filter.storeId || totalStock > 0)
        && (filter.availability === "all" || (filter.availability === "in-stock" && totalStock > 0)
          || (filter.availability === "low-stock" && totalStock > 0 && totalStock <= 10));
    });
    if (filter.sort === "price-asc") result.sort((a, b) => Number(a.price) - Number(b.price));
    if (filter.sort === "price-desc") result.sort((a, b) => Number(b.price) - Number(a.price));
    if (filter.sort === "name") result.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    if (filter.sort === "rating-desc") result.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    return result;
  }, [products, filter, treeCategories, stockByProduct]);

  const livePage = serverPage?.key === requestKey && !serverError ? serverPage.result : null;
  const resultCount = livePage ? livePage.total : filtered.length;
  const pageCount = Math.max(1, Math.ceil(resultCount / pageSize));
  const currentPage = Math.min(requestedPage, pageCount);
  const visibleProducts = livePage ? livePage.items : isMobile
    ? filtered.slice(0, currentPage * pageSize)
    : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (!loading && (livePage || serverError) && !storeStockLoading && !storeStockError && requestedPage > pageCount) {
      setParams((current) => writeCatalogPage(current, pageCount), { replace: true });
    }
  }, [loading, livePage, serverError, storeStockLoading, storeStockError, requestedPage, pageCount, setParams]);

  const goToPage = (page, scrollToResults = false) => {
    if (page < 1 || page > pageCount || page === currentPage) return;
    setParams((current) => writeCatalogPage(current, page));
    if (scrollToResults) {
      requestAnimationFrame(() => document.querySelector(".catalog-results")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      }));
    }
  };

  useEffect(() => {
    if (!filtersOpen || !isFilterDrawer) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sidebar = filterSidebarRef.current;
    sidebar?.querySelector(".filter-close")?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setFiltersOpen(false);
        return;
      }
      if (event.key !== "Tab" || !sidebar) return;
      const focusable = [...sidebar.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) { event.preventDefault(); sidebar.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
      if (filterToggleRef.current?.getClientRects().length) filterToggleRef.current.focus();
    };
  }, [filtersOpen, isFilterDrawer]);

  const update = (key, value, replace = false) => changeFilters((current) => ({ ...current, [key]: value }), replace);
  const setStore = (storeId) => changeFilters((current) => ({ ...current, storeId, availability: storeId && current.availability === "all" ? "in-stock" : current.availability }));
  const setAvailability = (availability) => changeFilters((current) => ({ ...current, availability, storeId: availability === "all" ? "" : current.storeId }));
  const setGender = (gender) => changeFilters((current) => ({ ...current, gender, categories: [], sizes: [] }));
  const toggle = (key, value) => changeFilters((current) => ({ ...current, [key]: toggleValue(current[key], value) }));
  const reset = () => changeFilters(() => readCatalogFilters(new URLSearchParams()));
  const setPrice = (min, max) => changeFilters((current) => ({ ...current, min, max }));
  const activeChips = [
    ...(filter.gender !== "all" ? [{ label: filter.gender === "WOMEN" ? "Для женщин" : "Для мужчин", clear: () => setGender("all") }] : []),
    ...filter.categories.map((value) => ({ label: categoryLabel(value), clear: () => toggle("categories", value) })),
    ...filter.colors.map((value) => ({ label: value, clear: () => toggle("colors", value) })),
    ...filter.sizes.map((value) => ({ label: `Размер ${options.sizes.find((size)=>size.key===value)?.name || value.split(":").pop()}`, clear: () => toggle("sizes", value) })),
    ...(filter.min || filter.max ? [{ label: `${filter.min || 0}–${filter.max || catalogMax} ₽`, clear: () => setPrice("", "") }] : []),
    ...(filter.availability !== "all" ? [{ label: filter.availability === "in-stock" ? "В наличии" : "Заканчивается", clear: () => setAvailability("all") }] : []),
    ...(filter.storeId ? [{ label: pickupStores.find((store) => store.id === filter.storeId)?.name || "Выбранный магазин", clear: () => setStore("") }] : []),
    ...(filter.ratingMin || filter.ratingMax ? [{ label: `Рейтинг ${filter.ratingMin || "0"}–${filter.ratingMax || "5"}`, clear: () => changeFilters((current) => ({ ...current, ratingMin: "", ratingMax: "" })) }] : []),
    ...(filter.reviewedOnly ? [{ label: "Есть отзывы", clear: () => update("reviewedOnly", false) }] : []),
  ];

  return (
    <div className="catalog-page container">
      <header className="catalog-head">
        <div><p className="page-kicker">Коллекция SUNSET</p><h1>Каталог</h1></div>
        <div className="catalog-head__controls">
          <span>{storeStockLoading ? "Уточняем наличие…" : `${resultCount} товаров`}</span>
          <select value={filter.sort} onChange={(event) => update("sort", event.target.value)} aria-label="Сортировка">
            <option value="new">Сначала новинки</option><option value="price-asc">Сначала дешевле</option>
            <option value="price-desc">Сначала дороже</option><option value="rating-desc">По рейтингу</option><option value="name">По названию</option>
          </select>
          <button ref={filterToggleRef} className="filter-toggle" aria-controls="catalog-filter-panel" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}>Фильтры {activeChips.length ? `· ${activeChips.length}` : ""}</button>
        </div>
      </header>

      <nav className="catalog-gender" aria-label="Раздел каталога">
        {[['all','Вся коллекция'],['WOMEN','Для женщин'],['MEN','Для мужчин']].map(([value,label]) => <button key={value} className={filter.gender === value ? "active" : ""} onClick={() => setGender(value)}>{label}</button>)}
      </nav>

      {activeChips.length > 0 && <div className="active-filters" aria-label="Активные фильтры">
        {activeChips.map((chip, index) => <button key={`${chip.label}-${index}`} onClick={chip.clear}>{chip.label}<span>×</span></button>)}
        <button className="active-filters__reset" onClick={reset}>Очистить всё</button>
      </div>}

      <div className="catalog-layout">
        {filtersOpen && isFilterDrawer && <button className="filter-backdrop" aria-label="Закрыть фильтры" tabIndex={-1} onClick={() => setFiltersOpen(false)} />}
        <aside ref={filterSidebarRef} id="catalog-filter-panel" className={`filter-sidebar ${filtersOpen ? "open" : ""}`} role={isFilterDrawer ? "dialog" : undefined} aria-modal={isFilterDrawer && filtersOpen ? "true" : undefined} aria-label="Фильтры каталога" tabIndex={isFilterDrawer ? -1 : undefined} inert={isFilterDrawer && !filtersOpen}>
          <div className="filter-heading"><div><span>Подбор товара</span><h2>Фильтры</h2></div><div className="filter-heading__tools">{activeChips.length > 0 && <button type="button" className="filter-heading__reset" onClick={reset}>Сбросить</button>}<button className="filter-close" onClick={() => setFiltersOpen(false)} aria-label="Закрыть">×</button></div></div>
          <label className="filter-field"><span>Поиск в каталоге</span><input value={filter.search} onChange={(event) => update("search", event.target.value, true)} placeholder="Футболка, худи…" /></label>

          <div className="filter-section filter-section--availability"><div className="filter-section__title"><h3>Наличие</h3><small>{filter.storeId ? "в магазине" : "во всей сети"}</small></div>
            <label className="store-filter"><span>Где искать</span><select value={filter.storeId} onChange={(event) => setStore(event.target.value)} aria-label="Наличие в магазине"><option value="">Все магазины</option>{pickupStores.map((store) => <option key={store.id} value={store.id}>{store.name} · {store.city}</option>)}</select></label>
            <div className="availability-options" role="radiogroup" aria-label="Наличие">
              <label className="check-line"><input type="radio" name="availability" checked={filter.availability === "all"} onChange={() => setAvailability("all")} /><span>Любое</span></label>
              <label className="check-line"><input type="radio" name="availability" checked={filter.availability === "in-stock"} onChange={() => setAvailability("in-stock")} /><span>В наличии</span></label>
              <label className="check-line"><input type="radio" name="availability" checked={filter.availability === "low-stock"} onChange={() => setAvailability("low-stock")} /><span>Заканчивается</span></label>
            </div>
            {storesError && <div className="store-filter__error" role="alert">{storesError} <button type="button" onClick={() => setStoresReloadKey((value) => value + 1)}>Повторить</button></div>}
          </div>
          <div className="filter-section rating-filter"><div className="filter-section__title"><h3>Рейтинг по отзывам</h3><small>шаг 0,1</small></div>
            <div className="rating-presets"><button className={filter.ratingMin === "4.8" && filter.ratingMax === "5" ? "selected" : ""} onClick={() => changeFilters((current) => ({ ...current, ratingMin: "4.8", ratingMax: "5", reviewedOnly: true }))}>★ 4,8+</button><button className={filter.ratingMin === "4.5" && filter.ratingMax === "5" ? "selected" : ""} onClick={() => changeFilters((current) => ({ ...current, ratingMin: "4.5", ratingMax: "5", reviewedOnly: true }))}>★ 4,5+</button><button className={filter.ratingMin === "4" && filter.ratingMax === "5" ? "selected" : ""} onClick={() => changeFilters((current) => ({ ...current, ratingMin: "4", ratingMax: "5", reviewedOnly: true }))}>★ 4,0+</button></div>
            <div className="rating-values"><label><span>От</span><input type="number" min="0" max="5" step="0.1" value={filter.ratingMin} placeholder="0,0" onChange={(event) => update("ratingMin", event.target.value, true)} /></label><label><span>До</span><input type="number" min="0" max="5" step="0.1" value={filter.ratingMax} placeholder="5,0" onChange={(event) => update("ratingMax", event.target.value, true)} /></label></div>
            <input className="rating-range" type="range" min="0" max="5" step="0.1" value={filter.ratingMin || 0} onChange={(event) => update("ratingMin", event.target.value === "0" ? "" : event.target.value, true)} aria-label="Минимальный рейтинг" />
            <label className="check-line"><input type="checkbox" checked={filter.reviewedOnly} onChange={(event) => update("reviewedOnly", event.target.checked)} /><span>Показывать только товары с отзывами</span></label>
          </div>

          <div className="filter-section">
            <div className="filter-section__title"><h3>Раздел</h3><small>{filter.gender === "all" ? "Все" : filter.gender === "WOMEN" ? "Женский" : "Мужской"}</small></div>
            <div className="gender-filter">{[['all','Все'],['WOMEN','Женщинам'],['MEN','Мужчинам']].map(([value,label]) => <button key={value} className={filter.gender === value ? "selected" : ""} onClick={() => setGender(value)}>{label}</button>)}</div>
          </div>

          <div className="filter-section">
            <div className="filter-section__title"><h3>Категория</h3><small>{filter.categories.length || "Все"}</small></div>
            <div className="category-tree">{treeCategories.map((category) => <label className={`check-line category-tree__level-${Math.min(category.depth, 2)}`} key={category.name}><input type="checkbox" checked={filter.categories.includes(category.name)} onChange={() => toggle("categories", category.name)} /><span>{category.depth > 0 ? "↳ " : ""}{categoryLabel(category.name)}</span></label>)}</div>
          </div>

          <div className="filter-section">
            <div className="filter-section__title"><h3>Цена, ₽</h3><small>до {catalogMax.toLocaleString("ru-RU")}</small></div>
            <div className="price-row"><input type="number" min="0" placeholder="От" value={filter.min} onChange={(event) => update("min", event.target.value, true)} /><input type="number" min="0" placeholder="До" value={filter.max} onChange={(event) => update("max", event.target.value, true)} /></div>
            <input className="price-range" type="range" min="0" max={catalogMax} step="500" value={filter.max || catalogMax} onChange={(event) => update("max", event.target.value === String(catalogMax) ? "" : event.target.value, true)} aria-label="Максимальная цена" />
            <div className="price-presets"><button onClick={() => setPrice("", "2000")}>до 2 000</button><button onClick={() => setPrice("2000", "4000")}>2–4 тыс.</button><button onClick={() => setPrice("4000", "")}>от 4 000</button></div>
          </div>

          <div className="filter-section">
            <div className="filter-section__title"><h3>Цвет</h3><small>{filter.colors.length || "Все"}</small></div>
            <div className="color-filter">{options.colors.map((color) => <button key={color.name} className={filter.colors.includes(color.name) ? "selected" : ""} onClick={() => toggle("colors", color.name)} title={color.name}><i style={{ background: color.hexCode }} />{color.name}</button>)}</div>
          </div>

          <div className="filter-section">
            <div className="filter-section__title"><h3>Размер</h3><small>{filter.sizes.length || "Все"}</small></div>
            <div className="size-groups">{sizeGroupOrder.map((group)=><div className="size-group" key={group}>{options.sizes.some((size)=>size.group===group)&&<><span className="size-group__label">{sizeGroupLabels[group]}</span><div className="size-filter">{options.sizes.filter((size)=>size.group===group).map((size) => <button key={size.key} className={filter.sizes.includes(size.key) ? "selected" : ""} onClick={() => toggle("sizes", size.key)} title={size.description||sizeGroupLabels[group]}>{size.name}</button>)}</div></>}</div>)}</div>
          </div>

          <div className="filter-actions"><button className="filter-apply" onClick={() => setFiltersOpen(false)} disabled={storeStockLoading}>Показать {storeStockLoading ? "…" : resultCount}</button><button onClick={reset}>Сбросить</button></div>
        </aside>

        <main className="catalog-results">
          {catalogError && products.length > 0 && <p className="catalog-warning" role="status">Не удалось обновить каталог. Показаны ранее загруженные товары; наличие и цены уточняются при оформлении.</p>}
          {serverError && <div className="catalog-warning" role="alert">Поиск на сервере временно недоступен. Показаны товары из каталога браузера. <button type="button" className="text-link" onClick={() => { setServerError(false); setServerReloadKey((value) => value + 1); }}>Повторить</button></div>}
          {storeStockError && <div className="catalog-warning" role="alert">Не удалось проверить наличие в выбранном магазине. <button type="button" className="text-link" onClick={() => setStoreStockReloadKey((value) => value + 1)}>Повторить</button></div>}
          {loading || storeStockLoading ? <div className="catalog-grid" role="status" aria-label="Загружаем товары"><ProductCardSkeleton count={isMobile ? 4 : 6} /></div> : storeStockError ? null : resultCount ? <>
            <div className="catalog-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div>
            {pageCount > 1 && <>
              <div className="catalog-load-more">
                <p>Показано {visibleProducts.length} из {resultCount}</p>
                <div className="catalog-load-more__progress" role="progressbar" aria-label="Просмотренные товары" aria-valuenow={visibleProducts.length} aria-valuemin={0} aria-valuemax={resultCount}><span style={{ width: `${visibleProducts.length / resultCount * 100}%` }} /></div>
                {currentPage < pageCount && <button onClick={() => goToPage(currentPage + 1)}>Показать ещё</button>}
              </div>
              <nav className="catalog-pagination" aria-label="Страницы каталога">
                <button className="catalog-pagination__edge" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1, true)} aria-label="Предыдущая страница">←</button>
                {pageNumbers(currentPage, pageCount).map((page, index, numbers) => <React.Fragment key={page}>
                  {index > 0 && page - numbers[index - 1] > 1 && <span className="catalog-pagination__ellipsis" aria-hidden="true">…</span>}
                  <button className={page === currentPage ? "active" : ""} aria-label={`Страница ${page}`} aria-current={page === currentPage ? "page" : undefined} onClick={() => goToPage(page, true)}>{page}</button>
                </React.Fragment>)}
                <button className="catalog-pagination__edge" disabled={currentPage === pageCount} onClick={() => goToPage(currentPage + 1, true)} aria-label="Следующая страница">→</button>
              </nav>
            </>}
          </> : catalogError ? <div className="empty-state"><h2>Не удалось загрузить каталог</h2><p>Проверьте соединение и попробуйте ещё раз.</p><button className="text-link" onClick={() => window.location.reload()}>Повторить</button></div> : filter.storeId ? <div className="empty-state"><h2>В этом магазине пока нет подходящих товаров</h2><p>Попробуйте другой магазин или посмотрите всю коллекцию.</p><button className="text-link" onClick={() => setStore("")}>Все магазины</button></div> : <div className="empty-state"><h2>Таких товаров пока нет</h2><p>Измените параметры фильтрации.</p><button className="text-link" onClick={reset}>Сбросить фильтры</button></div>}
        </main>
      </div>
    </div>
  );
}
