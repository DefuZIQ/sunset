import AdminCategoryTree, { categoryMatches, firstLeafCategory } from "../../components/AdminCategoryTree";

const leafCategory = (item) => item?.categories?.[item.categories.length - 1] || "";

export default function AdminProductsPanel({
  products, categoryTree, product, setProduct, productGender, setProductGender,
  productCategoryFilter, setProductCategoryFilter, onCreate, onEdit, onDelete,
}) {
  const visibleProducts = products.filter((item) =>
    (productGender === "ALL" || (item.gender || "WOMEN") === productGender)
    && categoryMatches(categoryTree, productCategoryFilter, item.categories || []));
  const genderCount = (gender) => products.filter((item) => (item.gender || "WOMEN") === gender).length;

  return <div className="admin-products-layout">
    <form className="admin-form" onSubmit={onCreate}>
      <p className="page-kicker">Новая карточка</p><h2>Добавить товар</h2>
      <label>Название<input required value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} /></label>
      <label>Описание<textarea value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} /></label>
      <div><label>Цена<input required type="number" min="1" value={product.price} onChange={(e) => setProduct({ ...product, price: e.target.value })} /></label><label>Стартовый остаток<input type="number" min="0" value={product.quantity} onChange={(e) => setProduct({ ...product, quantity: e.target.value })} /></label></div>
      <label>Раздел<select value={product.gender} onChange={(e) => { const gender = e.target.value; setProduct({ ...product, gender, category: firstLeafCategory(categoryTree, gender) || product.category }); }}><option value="WOMEN">Для женщин</option><option value="MEN">Для мужчин</option><option value="UNISEX">Унисекс</option></select></label>
      <AdminCategoryTree tree={categoryTree} selected={product.category} gender={product.gender} onSelect={(category) => setProduct({ ...product, category })} title="Категория товара" />
      <label>Изображение<input value={product.imageUrl} onChange={(e) => setProduct({ ...product, imageUrl: e.target.value })} /></label>
      <button className="primary-action">Добавить в каталог</button>
    </form>
    <div className="admin-product-list">
      <div className="admin-list-head"><div><h2>Карточки товаров</h2><span className="admin-list-subtitle">{visibleProducts.length} из {products.length}</span></div></div>
      <div className="admin-gender-tabs" aria-label="Раздел товаров">{[["ALL", "Все", products.length], ["WOMEN", "Для женщин", genderCount("WOMEN")], ["MEN", "Для мужчин", genderCount("MEN")], ["UNISEX", "Унисекс", genderCount("UNISEX")]].map(([key, label, count]) => <button type="button" className={productGender === key ? "active" : ""} onClick={() => { setProductGender(key); setProductCategoryFilter(""); }} key={key}><span>{label}</span><small>{count}</small></button>)}</div>
      <AdminCategoryTree tree={categoryTree} selected={productCategoryFilter} gender={productGender} onSelect={setProductCategoryFilter} selectBranches allowAll title="Фильтр по категориям" />
      {visibleProducts.length === 0 && <p className="admin-empty-list">В выбранной категории товаров нет.</p>}
      {visibleProducts.map((item) => <article key={item.id}><img src={item.imageUrl} alt="" /><div><strong>{item.name}</strong><small>{item.gender === "MEN" ? "Для мужчин" : item.gender === "UNISEX" ? "Унисекс" : "Для женщин"} · {item.categories?.join(" · ")}</small><span>{Number(item.price).toLocaleString("ru-RU")} ₽</span></div><button onClick={() => onEdit({ ...item })}>Изменить</button><button className="danger" onClick={() => onDelete(item)}>Удалить</button></article>)}
    </div>
  </div>;
}

export function AdminEditProductDialog({ editing, setEditing, categoryTree, onSave }) {
  if (!editing) return null;
  return <div className="admin-modal" role="dialog"><button className="admin-modal__backdrop" onClick={() => setEditing(null)} aria-label="Закрыть" /><form className="admin-form admin-modal__body" onSubmit={onSave}><button type="button" className="admin-modal__close" onClick={() => setEditing(null)}>×</button><p className="page-kicker">Редактирование</p><h2>{editing.name}</h2><label>Название<input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label><label>Описание<textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label><div><label>Цена<input required type="number" min="1" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></label><label>Раздел<select value={editing.gender || "WOMEN"} onChange={(e) => { const gender = e.target.value; setEditing({ ...editing, gender, categories: [firstLeafCategory(categoryTree, gender) || leafCategory(editing)] }); }}><option value="WOMEN">Для женщин</option><option value="MEN">Для мужчин</option><option value="UNISEX">Унисекс</option></select></label></div><AdminCategoryTree tree={categoryTree} selected={leafCategory(editing)} gender={editing.gender || "WOMEN"} onSelect={(category) => setEditing({ ...editing, categories: [category] })} title="Категория товара" /><label>Изображение<input value={editing.imageUrl || ""} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} /></label><button className="primary-action">Сохранить карточку</button></form></div>;
}
