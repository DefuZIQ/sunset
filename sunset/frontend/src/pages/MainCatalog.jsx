import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/Main/ProductCard";
import { useStore } from "../contexts/StoreContext";
import "./MainCatalog.css";

const initialFilter = (params) => ({
  search: "", min: "", max: "", categories: params.getAll("category[]"),
  gender: params.get("gender") || "all", colors: [], sizes: [], availability: "all", ratingMin: "", ratingMax: "", reviewedOnly: false, sort: "new",
});

const toggleValue = (items, value) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

const sizeGroupOrder = ["womenClothing", "menClothing", "clothing", "trousers", "dresses", "accessories", "shoes"];
const sizeGroupLabels = { womenClothing:"Женская одежда", menClothing:"Мужская одежда", clothing:"Международные размеры", trousers:"Брюки и джинсы", dresses:"Платья", accessories:"Аксессуары", shoes:"Обувь" };
const sizeGroup = (type = "clothing") => type === "women_dress" ? "dresses"
  : ["women_trousers","men_trousers","waist","jeans"].includes(type) ? "trousers"
    : ["accessory","belt","headwear"].includes(type) ? "accessories"
      : type === "shoes" ? "shoes" : type === "women_clothing" ? "womenClothing" : type === "men_clothing" ? "menClothing" : "clothing";
const sizeKey = (stock) => `${stock.sizeType || "clothing"}:${stock.sizeName}`;

export default function MainCatalog() {
  const { products, loading, categoryTree } = useStore();
  const [params] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filter, setFilter] = useState(() => initialFilter(params));

  const options = useMemo(() => ({
    categories: [...new Set(products.flatMap((product) => product.categories || []))].sort(),
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
    const visibleRoots = filter.gender === "WOMEN"
      ? categoryTree.filter((node) => node.name === "Для женщин")
      : filter.gender === "MEN"
        ? categoryTree.filter((node) => node.name === "Для мужчин")
        : categoryTree;
    walk(visibleRoots);
    return flattened.length ? flattened : options.categories.map((name) => ({ name, depth: 0, descendants: [name] }));
  }, [categoryTree, options.categories, filter.gender]);

  const catalogMax = useMemo(() => {
    const highest = Math.max(0, ...products.map((product) => Number(product.price) || 0));
    return Math.max(1000, Math.ceil(highest / 1000) * 1000);
  }, [products]);

  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      const text = `${product.name} ${product.description || ""}`.toLowerCase();
      const price = Number(product.price);
      const totalStock = (product.stock || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      return (!filter.search || text.includes(filter.search.toLowerCase()))
        && (filter.gender === "all" || product.gender === filter.gender || product.gender === "UNISEX")
        && (!filter.min || price >= Number(filter.min))
        && (!filter.max || price <= Number(filter.max))
        && (!filter.categories.length || filter.categories.some((category) => {
          const node = treeCategories.find((item) => item.name === category);
          return (node?.descendants || [category]).some((name) => product.categories?.includes(name));
        }))
        && (!filter.colors.length || filter.colors.some((name) => product.colors?.some((color) => color.name === name)))
        && (!filter.sizes.length || filter.sizes.some((key) => product.stock?.some((stock) => sizeKey(stock) === key && stock.quantity > 0)))
        && (!filter.reviewedOnly || Number(product.reviewCount || 0) > 0)
        && (!filter.ratingMin || (Number(product.reviewCount || 0) > 0 && Number(product.rating || 0) >= Number(filter.ratingMin)))
        && (!filter.ratingMax || (Number(product.reviewCount || 0) > 0 && Number(product.rating || 0) <= Number(filter.ratingMax)))
        && (filter.availability === "all" || (filter.availability === "in-stock" && totalStock > 0)
          || (filter.availability === "low-stock" && totalStock > 0 && totalStock <= 10));
    });
    if (filter.sort === "price-asc") result.sort((a, b) => Number(a.price) - Number(b.price));
    if (filter.sort === "price-desc") result.sort((a, b) => Number(b.price) - Number(a.price));
    if (filter.sort === "name") result.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    if (filter.sort === "rating-desc") result.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    return result;
  }, [products, filter, treeCategories]);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [filtersOpen]);

  const update = (key, value) => setFilter((current) => ({ ...current, [key]: value }));
  const setGender = (gender) => setFilter((current) => ({ ...current, gender, categories: [], sizes: [] }));
  const toggle = (key, value) => update(key, toggleValue(filter[key], value));
  const reset = () => setFilter(initialFilter(new URLSearchParams()));
  const setPrice = (min, max) => setFilter((current) => ({ ...current, min, max }));
  const activeChips = [
    ...(filter.gender !== "all" ? [{ label: filter.gender === "WOMEN" ? "Для женщин" : "Для мужчин", clear: () => setGender("all") }] : []),
    ...filter.categories.map((value) => ({ label: value, clear: () => toggle("categories", value) })),
    ...filter.colors.map((value) => ({ label: value, clear: () => toggle("colors", value) })),
    ...filter.sizes.map((value) => ({ label: `Размер ${options.sizes.find((size)=>size.key===value)?.name || value.split(":").pop()}`, clear: () => toggle("sizes", value) })),
    ...(filter.min || filter.max ? [{ label: `${filter.min || 0}–${filter.max || catalogMax} ₽`, clear: () => setPrice("", "") }] : []),
    ...(filter.availability !== "all" ? [{ label: filter.availability === "in-stock" ? "В наличии" : "Заканчивается", clear: () => update("availability", "all") }] : []),
    ...(filter.ratingMin || filter.ratingMax ? [{ label: `Рейтинг ${filter.ratingMin || "0"}–${filter.ratingMax || "5"}`, clear: () => setFilter((current) => ({ ...current, ratingMin: "", ratingMax: "" })) }] : []),
    ...(filter.reviewedOnly ? [{ label: "Есть отзывы", clear: () => update("reviewedOnly", false) }] : []),
  ];

  return (
    <div className="catalog-page container">
      <header className="catalog-head">
        <div><p className="page-kicker">Коллекция SUNSET</p><h1>Каталог</h1></div>
        <div className="catalog-head__controls">
          <span>{filtered.length} товаров</span>
          <select value={filter.sort} onChange={(event) => update("sort", event.target.value)} aria-label="Сортировка">
            <option value="new">Сначала новинки</option><option value="price-asc">Сначала дешевле</option>
            <option value="price-desc">Сначала дороже</option><option value="rating-desc">По рейтингу</option><option value="name">По названию</option>
          </select>
          <button className="filter-toggle" onClick={() => setFiltersOpen(true)}>Фильтры {activeChips.length ? `· ${activeChips.length}` : ""}</button>
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
        {filtersOpen && <button className="filter-backdrop" aria-label="Закрыть фильтры" onClick={() => setFiltersOpen(false)} />}
        <aside className={`filter-sidebar ${filtersOpen ? "open" : ""}`} aria-label="Фильтры каталога">
          <div className="filter-heading"><div><span>Подбор товара</span><h2>Фильтры</h2></div><button className="filter-close" onClick={() => setFiltersOpen(false)} aria-label="Закрыть">×</button></div>
          <label className="filter-field"><span>Поиск в каталоге</span><input value={filter.search} onChange={(event) => update("search", event.target.value)} placeholder="Футболка, худи…" /></label>

          <div className="filter-section">
            <div className="filter-section__title"><h3>Раздел</h3><small>{filter.gender === "all" ? "Все" : filter.gender === "WOMEN" ? "Женский" : "Мужской"}</small></div>
            <div className="gender-filter">{[['all','Все'],['WOMEN','Женщинам'],['MEN','Мужчинам']].map(([value,label]) => <button key={value} className={filter.gender === value ? "selected" : ""} onClick={() => setGender(value)}>{label}</button>)}</div>
          </div>

          <div className="filter-section">
            <div className="filter-section__title"><h3>Категория</h3><small>{filter.categories.length || "Все"}</small></div>
            <div className="category-tree">{treeCategories.map((category) => <label className={`check-line category-tree__level-${Math.min(category.depth, 2)}`} key={category.name}><input type="checkbox" checked={filter.categories.includes(category.name)} onChange={() => toggle("categories", category.name)} /><span>{category.depth > 0 ? "↳ " : ""}{category.name}</span></label>)}</div>
          </div>

          <div className="filter-section">
            <div className="filter-section__title"><h3>Цена, ₽</h3><small>до {catalogMax.toLocaleString("ru-RU")}</small></div>
            <div className="price-row"><input type="number" min="0" placeholder="От" value={filter.min} onChange={(event) => update("min", event.target.value)} /><input type="number" min="0" placeholder="До" value={filter.max} onChange={(event) => update("max", event.target.value)} /></div>
            <input className="price-range" type="range" min="0" max={catalogMax} step="500" value={filter.max || catalogMax} onChange={(event) => update("max", event.target.value === String(catalogMax) ? "" : event.target.value)} aria-label="Максимальная цена" />
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

          <div className="filter-section"><h3>Наличие</h3>
            <label className="check-line"><input type="radio" name="availability" checked={filter.availability === "all"} onChange={() => update("availability", "all")} /><span>Любое</span></label>
            <label className="check-line"><input type="radio" name="availability" checked={filter.availability === "in-stock"} onChange={() => update("availability", "in-stock")} /><span>В наличии</span></label>
            <label className="check-line"><input type="radio" name="availability" checked={filter.availability === "low-stock"} onChange={() => update("availability", "low-stock")} /><span>Заканчивается</span></label>
          </div>
          <div className="filter-section rating-filter"><div className="filter-section__title"><h3>Рейтинг по отзывам</h3><small>шаг 0,1</small></div>
            <div className="rating-presets"><button className={filter.ratingMin === "4.8" && filter.ratingMax === "5" ? "selected" : ""} onClick={() => setFilter((current) => ({ ...current, ratingMin: "4.8", ratingMax: "5", reviewedOnly: true }))}>4,8–5,0</button><button className={filter.ratingMin === "4.5" && filter.ratingMax === "5" ? "selected" : ""} onClick={() => setFilter((current) => ({ ...current, ratingMin: "4.5", ratingMax: "5", reviewedOnly: true }))}>4,5–5,0</button><button className={filter.ratingMin === "4" && filter.ratingMax === "5" ? "selected" : ""} onClick={() => setFilter((current) => ({ ...current, ratingMin: "4", ratingMax: "5", reviewedOnly: true }))}>4,0–5,0</button></div>
            <div className="rating-values"><label><span>От</span><input type="number" min="0" max="5" step="0.1" value={filter.ratingMin} placeholder="0,0" onChange={(event) => update("ratingMin", event.target.value)} /></label><label><span>До</span><input type="number" min="0" max="5" step="0.1" value={filter.ratingMax} placeholder="5,0" onChange={(event) => update("ratingMax", event.target.value)} /></label></div>
            <input className="rating-range" type="range" min="0" max="5" step="0.1" value={filter.ratingMin || 0} onChange={(event) => update("ratingMin", event.target.value === "0" ? "" : event.target.value)} aria-label="Минимальный рейтинг" />
            <label className="check-line"><input type="checkbox" checked={filter.reviewedOnly} onChange={(event) => update("reviewedOnly", event.target.checked)} /><span>Показывать только товары с отзывами</span></label>
          </div>
          <div className="filter-actions"><button className="filter-apply" onClick={() => setFiltersOpen(false)}>Показать {filtered.length}</button><button onClick={reset}>Сбросить</button></div>
        </aside>

        <main className="catalog-results">
          {loading ? <p>Загружаем коллекцию…</p> : filtered.length ? <div className="catalog-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h2>Таких товаров пока нет</h2><p>Измените параметры фильтрации.</p><button className="text-link" onClick={reset}>Сбросить фильтры</button></div>}
        </main>
      </div>
    </div>
  );
}
