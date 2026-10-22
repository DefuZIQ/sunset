import { useState } from "react";
import AdminCategoryTree, { categoryMatches, firstLeafCategory } from "../../components/AdminCategoryTree";
import { categoryPath } from "../../data/categoryLabels";

const leafCategory = (item) => item?.categories?.[item.categories.length - 1] || "";

export default function AdminProductsPanel({
  products, categoryTree, product, setProduct, productGender, setProductGender,
  productCategoryFilter, setProductCategoryFilter, onCreate, onEdit, onDelete, canStock = true,
}) {
  const [productQuery, setProductQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const [createError, setCreateError] = useState("");
  const visibleProducts = products.filter((item) =>
    (productGender === "ALL" || (item.gender || "WOMEN") === productGender)
    && categoryMatches(categoryTree, productCategoryFilter, item.categories || [])
    && [item.name, item.description, item.id].some((value) => String(value || "").toLocaleLowerCase("ru-RU").includes(productQuery.trim().toLocaleLowerCase("ru-RU"))));
  const genderCount = (gender) => products.filter((item) => (item.gender || "WOMEN") === gender).length;

  return <div className="admin-products-layout">
    <div className="admin-products-head"><div><p className="page-kicker">КАТАЛОГ</p><h2>Товары</h2><span>{products.length} карточек в каталоге</span></div><button type="button" onClick={() => setCreating((value) => !value)} aria-expanded={creating} aria-controls="admin-create-product">{creating ? "Закрыть форму" : "+ Добавить товар"}</button></div>
    {creating && <form id="admin-create-product" className="admin-form admin-create-product" onSubmit={async (event) => { event.preventDefault(); if (!product.category) { setCreateError("Выберите конечную категорию товара"); return; } if (imageBroken) { setCreateError("Фото не загрузилось — проверьте ссылку"); return; } setCreateError(""); if (await onCreate(event)) { setCreating(false); setImageBroken(false); } }}>
      <div className="admin-create-product__title"><div><p className="page-kicker">НОВАЯ КАРТОЧКА</p><h3>Добавление товара</h3><p>Заполните данные, выберите конечную категорию и проверьте фотографию перед сохранением.</p></div><button type="button" onClick={() => setCreating(false)} aria-label="Закрыть форму добавления товара">×</button></div>
      <div className="admin-create-product__columns">
        <section className="admin-create-product__section" aria-labelledby="admin-create-main-title"><h4 id="admin-create-main-title"><span>01</span> Информация о товаре</h4>
          <label>Название товара<input required autoFocus value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} placeholder="Например, льняная рубашка" /></label>
          <label>Описание<textarea value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} placeholder="Материал, посадка и особенности модели" /></label>
          <div className="admin-create-product__fields"><label>Цена, ₽<input required type="number" min="1" value={product.price} onChange={(e) => setProduct({ ...product, price: e.target.value })} placeholder="0" /></label>{canStock && <label>Остаток на каждый размер<input type="number" min="0" value={product.quantity} onChange={(e) => setProduct({ ...product, quantity: e.target.value })} /></label>}</div>
          <p className="admin-create-product__hint">{canStock ? "При создании это количество задаётся каждому размеру на складе. Позже остатки по размерам и магазинам можно изменить в разделе «Остатки»." : "Карточка будет создана без остатка. Администратор склада добавит наличие отдельно."}</p>
        </section>
        <section className="admin-create-product__section" aria-labelledby="admin-create-category-title"><h4 id="admin-create-category-title"><span>02</span> Раздел и изображение</h4>
          <label>Для кого<select value={product.gender} onChange={(e) => { setCreateError(""); setProduct({ ...product, gender: e.target.value, category: "" }); }}><option value="WOMEN">Для женщин</option><option value="MEN">Для мужчин</option><option value="UNISEX">Унисекс</option></select></label>
          <div className={`admin-create-product__category${createError && !product.category ? " is-invalid" : ""}`}><AdminCategoryTree tree={categoryTree} selected={product.category} gender={product.gender} onSelect={(category) => { setCreateError(""); setProduct({ ...product, category }); }} title="Конечная категория товара" />{!product.category && <small>Нажмите на подкатегорию в дереве.</small>}</div>
          <label>Ссылка на фотографию<input required value={product.imageUrl} onChange={(e) => { setCreateError(""); setImageBroken(false); setProduct({ ...product, imageUrl: e.target.value }); }} placeholder="https://… или /images/…" /></label>
          <div className="admin-create-product__preview">{product.imageUrl && !imageBroken ? <img src={product.imageUrl} alt="Предпросмотр фотографии товара" onError={() => setImageBroken(true)} /> : <span>{imageBroken ? "Фото не загрузилось — проверьте ссылку" : "Предпросмотр фотографии появится здесь"}</span>}</div>
          {createError && <p className="admin-create-product__error" role="alert">{createError}</p>}
        </section>
      </div>
      <div className="admin-create-product__footer"><p>После создания проверьте цвета, размеры и наличие в разделе «Остатки».</p><button type="submit" className="primary-action">Добавить в каталог</button></div>
    </form>}
    <div className="admin-product-list">
      <div className="admin-list-head"><div><h2>Карточки товаров</h2><span className="admin-list-subtitle">{visibleProducts.length} из {products.length}</span></div></div>
      <label className="admin-product-search">Поиск в каталоге<input type="search" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Название или артикул" /></label>
      <div className="admin-gender-tabs" aria-label="Раздел товаров">{[["ALL", "Все", products.length], ["WOMEN", "Для женщин", genderCount("WOMEN")], ["MEN", "Для мужчин", genderCount("MEN")], ["UNISEX", "Унисекс", genderCount("UNISEX")]].map(([key, label, count]) => <button type="button" className={productGender === key ? "active" : ""} onClick={() => { setProductGender(key); setProductCategoryFilter(""); }} key={key}><span>{label}</span><small>{count}</small></button>)}</div>
      <AdminCategoryTree tree={categoryTree} selected={productCategoryFilter} gender={productGender} onSelect={setProductCategoryFilter} selectBranches allowAll title="Фильтр по категориям" />
      {visibleProducts.length === 0 && <p className="admin-empty-list">В выбранной категории товаров нет.</p>}
      {visibleProducts.map((item) => <article key={item.id}><img src={item.imageUrl} alt="" /><div><strong>{item.name}</strong><small>{item.gender === "MEN" ? "Для мужчин" : item.gender === "UNISEX" ? "Унисекс" : "Для женщин"} · {categoryPath(item.categories).join(" · ")}</small><span>{Number(item.price).toLocaleString("ru-RU")} ₽</span></div><button onClick={() => onEdit({ ...item })}>Изменить</button>{canStock && <button className="danger" onClick={() => onDelete(item)}>Удалить</button>}</article>)}
    </div>
  </div>;
}

export function AdminEditProductDialog({ editing, setEditing, categoryTree, onSave }) {
  if (!editing) return null;
  return <div className="admin-modal" role="dialog"><button className="admin-modal__backdrop" onClick={() => setEditing(null)} aria-label="Закрыть" /><form className="admin-form admin-modal__body" onSubmit={onSave}><button type="button" className="admin-modal__close" onClick={() => setEditing(null)}>×</button><p className="page-kicker">Редактирование</p><h2>{editing.name}</h2><label>Название<input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label><label>Описание<textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label><div><label>Цена<input required type="number" min="1" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></label><label>Раздел<select value={editing.gender || "WOMEN"} onChange={(e) => { const gender = e.target.value; setEditing({ ...editing, gender, categories: [firstLeafCategory(categoryTree, gender) || leafCategory(editing)] }); }}><option value="WOMEN">Для женщин</option><option value="MEN">Для мужчин</option><option value="UNISEX">Унисекс</option></select></label></div><AdminCategoryTree tree={categoryTree} selected={leafCategory(editing)} gender={editing.gender || "WOMEN"} onSelect={(category) => setEditing({ ...editing, categories: [category] })} title="Категория товара" /><label>Изображение<input value={editing.imageUrl || ""} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} /></label><button className="primary-action">Сохранить карточку</button></form></div>;
}
