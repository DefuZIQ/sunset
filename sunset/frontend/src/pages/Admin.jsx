import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { categoryMatches } from "../components/AdminCategoryTree";
import AdminProductsPanel, { AdminEditProductDialog } from "./admin/AdminProductsPanel";
import AdminStockPanel from "./admin/AdminStockPanel";
import AdminReviewsPanel from "./admin/AdminReviewsPanel";
import AdminAccessPanel from "./admin/AdminAccessPanel";
import AdminNavIcon from "./admin/AdminNavIcon";
import { adjustAdminBonuses, createAdminProduct, createAdminPromotion, deleteAdminProduct, getAdminAnalytics, getAdminLocationStock, getCategoryTree, listAdminLocations, listAdminOrders, listAdminPromotions, listAdminReturns, listAdminUsers, listAdminVariants, listProducts, updateAdminOrderStatus, updateAdminProduct, updateAdminReturnStatus, updateAdminStock } from "../api/client";
import { ADMIN_COOKIE_SESSION } from "../api/client";
import "./Admin.css";

const adminToken = () => ADMIN_COOKIE_SESSION;
const blankProduct = { name:"",description:"",price:"",quantity:0,category:"",gender:"WOMEN",imageUrl:"" };
const leafCategory = (item) => item?.categories?.[item.categories.length-1] || "";
const orderStatusLabels={PENDING:"Новый",CONFIRMED:"Подтверждён",ASSEMBLING:"Собирается",SHIPPED:"Доставка",DELIVERED:"Доставлен",CANCELLED:"Отменён"};
const nextOrderStatuses={PENDING:["CONFIRMED","CANCELLED"],CONFIRMED:["ASSEMBLING","CANCELLED"],ASSEMBLING:["SHIPPED","CANCELLED"],SHIPPED:["DELIVERED"],DELIVERED:[],CANCELLED:[]};
const sections=[["overview","Обзор","orders:read"],["orders","Заказы","orders:read"],["returns","Возвраты","orders:read"],["products","Товары","catalog:write"],["stock","Остатки","stock:write"],["reviews","Отзывы","reviews:moderate"],["promos","Акции","promotions:manage"],["users","Клиенты","customers:read"],["access","Доступ","staff:manage"],["security","Безопасность",null]];

export default function Admin({ identity = { role: "ADMIN", permissions: [] }, securityPanel = null }) {
  const can = useCallback((permission) => identity.role === "ADMIN" || identity.permissions?.includes(permission), [identity]);
  const [tab,setTab]=useState("overview"); const [orders,setOrders]=useState([]); const [users,setUsers]=useState([]); const [promos,setPromos]=useState([]); const [products,setProducts]=useState([]); const [categoryTree,setCategoryTree]=useState([]); const [returns,setReturns]=useState([]); const [analytics,setAnalytics]=useState(null); const [message,setMessage]=useState("");
  const [menuOpen,setMenuOpen]=useState(false); const [refreshing,setRefreshing]=useState(false); const [lastUpdated,setLastUpdated]=useState(null);
  const menuButtonRef=useRef(null);
  const [orderQuery,setOrderQuery]=useState(""); const [orderStatus,setOrderStatus]=useState("ALL"); const [userQuery,setUserQuery]=useState("");
  const [product,setProduct]=useState(blankProduct); const [editing,setEditing]=useState(null); const [productGender,setProductGender]=useState("ALL"); const [productCategoryFilter,setProductCategoryFilter]=useState(""); const [stockCategory,setStockCategory]=useState(""); const [stockProductId,setStockProductId]=useState(""); const [stockDraft,setStockDraft]=useState([]); const [stockOptions,setStockOptions]=useState({colors:[],sizes:[]}); const [newVariant,setNewVariant]=useState({colorId:"",sizeId:"",quantity:0}); const [bonusDraft,setBonusDraft]=useState({});
  const [locations,setLocations]=useState([]); const [stockLocationId,setStockLocationId]=useState(""); const [stockLoading,setStockLoading]=useState(false); const [stockError,setStockError]=useState(""); const [stockReloadKey,setStockReloadKey]=useState(0);
  const [promo,setPromo]=useState({code:"",title:"",description:"",discountPercent:10,bonusMultiplier:1,minOrder:0,birthdayOnly:false,active:true});

  const load=useCallback(async()=>{
    const token=adminToken();
    if(!token){setMessage("Войдите в аккаунт администратора");return;}
    setRefreshing(true);
    const [ordersResult,usersResult,promosResult,catalogResult,variantsResult,treeResult,returnsResult,analyticsResult,locationsResult]=await Promise.allSettled([
      can("orders:read")?listAdminOrders(token):[],can("customers:read")?listAdminUsers(token):[],can("promotions:manage")?listAdminPromotions(token):[],listProducts(),
      can("stock:write")?listAdminVariants(token):{colors:[],sizes:[]},getCategoryTree(),can("orders:read")?listAdminReturns(token):[],can("orders:read")?getAdminAnalytics(token):null,can("stock:write")?listAdminLocations(token):[],
    ]);
    if(ordersResult.status==="fulfilled")setOrders(ordersResult.value);
    if(usersResult.status==="fulfilled")setUsers(usersResult.value);
    if(promosResult.status==="fulfilled")setPromos(promosResult.value);
    if(catalogResult.status==="fulfilled"){
      const catalog=catalogResult.value;
      setProducts(catalog);
      setStockProductId((value)=>value||catalog[0]?.id||"");
      setStockCategory((value)=>value||leafCategory(catalog[0]));
    }
    if(variantsResult.status==="fulfilled"){
      const variants=variantsResult.value;
      setStockOptions(variants);
      setNewVariant((current)=>({colorId:current.colorId||variants.colors?.[0]?.id||"",sizeId:current.sizeId||variants.sizes?.[0]?.id||"",quantity:current.quantity}));
    }
    if(treeResult.status==="fulfilled")setCategoryTree(treeResult.value);
    if(returnsResult.status==="fulfilled")setReturns(returnsResult.value);
    if(analyticsResult.status==="fulfilled")setAnalytics(analyticsResult.value);
    if(locationsResult.status==="fulfilled"){
      setLocations(locationsResult.value);
      setStockLocationId((current)=>locationsResult.value.some((item)=>item.id===current)?current:locationsResult.value.find((item)=>item.kind==="WAREHOUSE")?.id||locationsResult.value[0]?.id||"");
    }
    const failed=[ordersResult,usersResult,promosResult,catalogResult,variantsResult,treeResult,returnsResult,analyticsResult,locationsResult]
      .find((result)=>result.status==="rejected");
    if(failed)setMessage(failed.reason?.message||"Часть данных магазина не загрузилась");
    setLastUpdated(new Date());
    setRefreshing(false);
  },[can]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{if(!menuOpen)return;const onKeyDown=(event)=>{if(event.key==="Escape"){setMenuOpen(false);menuButtonRef.current?.focus();}};window.addEventListener("keydown",onKeyDown);return()=>window.removeEventListener("keydown",onKeyDown);},[menuOpen]);
  useEffect(()=>{if(!can("orders:read"))setTab(can("catalog:write")?"products":can("stock:write")?"stock":can("reviews:moderate")?"reviews":can("promotions:manage")?"promos":can("customers:read")?"users":"overview");},[can]);
  const stockCategoryProducts=useMemo(()=>products.filter((item)=>categoryMatches(categoryTree,stockCategory,item.categories||[])),[products,categoryTree,stockCategory]);
  const selectedStock=useMemo(()=>stockCategoryProducts.find((item)=>String(item.id)===String(stockProductId)),[stockCategoryProducts,stockProductId]);
  const expectedSizeType=useMemo(()=>{const category=leafCategory(selectedStock).toLowerCase();if(category.match(/аксессуар|сумк|ремн|головн|кепк|очк|час/))return "accessory";if(category.includes("плать"))return "women_dress";if(category.includes("джинс"))return "jeans";if(category.includes("брюк"))return selectedStock?.gender==="MEN"?"men_trousers":"women_trousers";return selectedStock?.gender==="MEN"?"men_clothing":"women_clothing";},[selectedStock]);
  const allowedStockSizes=useMemo(()=>stockOptions.sizes.filter((size)=>size.type===expectedSizeType),[stockOptions.sizes,expectedSizeType]);
  useEffect(()=>{
    if(!stockProductId||!stockLocationId){setStockDraft([]);return;}
    let current=true;
    setStockLoading(true);setStockError("");setStockDraft([]);
    (can("stock:write") ? getAdminLocationStock(adminToken(),stockProductId,stockLocationId) : Promise.resolve([]))
      .then((rows)=>{if(current)setStockDraft(rows.map((item)=>({...item})));})
      .catch((error)=>{if(current)setStockError(error.message||"Не удалось загрузить остатки точки");})
      .finally(()=>{if(current)setStockLoading(false);});
    return()=>{current=false;};
  },[stockProductId,stockLocationId,stockReloadKey,can]);
  useEffect(()=>{if(stockCategoryProducts.length&&!stockCategoryProducts.some((item)=>String(item.id)===String(stockProductId)))setStockProductId(stockCategoryProducts[0].id);},[stockCategoryProducts,stockProductId]);
  useEffect(()=>{if(allowedStockSizes.length&&!allowedStockSizes.some((size)=>String(size.id)===String(newVariant.sizeId)))setNewVariant((current)=>({...current,sizeId:allowedStockSizes[0].id}));},[allowedStockSizes,newVariant.sizeId]);
  const notify=(value)=>{setMessage(value);window.setTimeout(()=>setMessage(""),3500);};
  const changeStatus=async(id,status)=>{try{await updateAdminOrderStatus(adminToken(),id,{status});notify("Статус заказа обновлён");load();}catch(error){notify(error.message);}};
  const createProduct=async(event)=>{event.preventDefault();try{
    if(!product.category)throw new Error("Выберите конечную категорию товара");
    if(!product.imageUrl.trim())throw new Error("Добавьте ссылку на фотографию товара");
    const data=await createAdminProduct(adminToken(),{...product,price:Number(product.price),quantity:Number(product.quantity)});
    notify(`Товар «${data.name}» добавлен`);setProduct(blankProduct);load();return true;
  }catch(error){notify(error.message);return false;}};
  const saveProduct=async(event)=>{event.preventDefault();try{
    await updateAdminProduct(adminToken(),editing.id,{
      name:editing.name,description:editing.description||"",price:Number(editing.price),
      gender:editing.gender||"WOMEN",category:leafCategory(editing),imageUrl:editing.imageUrl||"",
    });
    notify("Карточка товара обновлена");setEditing(null);load();
  }catch(error){notify(error.message);}};
  const deleteProduct=async(item)=>{if(!window.confirm(`Удалить «${item.name}»?`))return;try{
    await deleteAdminProduct(adminToken(),item.id);notify("Товар удалён");load();
  }catch(error){notify(error.message||"Не удалось удалить товар");}};
  const saveStock=async()=>{try{
    if(!stockLocationId||stockLoading||stockError)throw new Error("Выберите точку и дождитесь загрузки остатков");
    await updateAdminStock(adminToken(),stockProductId,{locationId:stockLocationId,stock:stockDraft.map((item)=>({
      sizeId:item.sizeId,colorId:item.colorId,quantity:Number(item.quantity),
    }))});
    notify("Остатки точки сохранены");setStockReloadKey((value)=>value+1);load();
  }catch(error){notify(error.message);}};
  const addStockVariant=()=>{const color=stockOptions.colors.find((item)=>String(item.id)===String(newVariant.colorId));const size=stockOptions.sizes.find((item)=>String(item.id)===String(newVariant.sizeId));if(!color||!size){notify("Выберите цвет и размер");return;}if(stockDraft.some((item)=>String(item.colorId)===String(color.id)&&String(item.sizeId)===String(size.id))){notify("Такая комбинация уже есть");return;}setStockDraft([...stockDraft,{colorId:color.id,colorName:color.name,sizeId:size.id,sizeName:size.name,sizeType:size.type,sizeGender:size.gender,sizeDescription:size.description,quantity:Number(newVariant.quantity)||0}]);};
  const removeStockVariant=(index)=>setStockDraft(stockDraft.filter((_,itemIndex)=>itemIndex!==index));
  const createPromo=async(event)=>{event.preventDefault();try{
    await createAdminPromotion(adminToken(),{
      ...promo,discountPercent:Number(promo.discountPercent),bonusMultiplier:Number(promo.bonusMultiplier),minOrder:Number(promo.minOrder),
    });
    notify("Промокод запущен");setPromo({...promo,code:"",title:"",description:""});load();
  }catch(error){notify(error.message);}};
  const adjustBonus=async(user)=>{const amount=Number(bonusDraft[user.id]||0);if(!amount)return;try{
    const data=await adjustAdminBonuses(adminToken(),user.id,{amount,reason:"Корректировка администратором"});
    notify(`Баланс изменён на ${data.applied > 0 ? "+" : ""}${data.applied}`);setBonusDraft({...bonusDraft,[user.id]:""});load();
  }catch(error){notify(error.message);}};
  const changeReturnStatus=async(id,status)=>{try{
    await updateAdminReturnStatus(adminToken(),id,{status});notify("Статус возврата обновлён");load();
  }catch(error){notify(error.message);}};

  const availableSections=sections.filter(([, ,permission])=>permission==="staff:manage"?identity.role==="ADMIN":!permission||can(permission));
  const pendingOrders=orders.filter((item)=>item.status==="PENDING").length;
  const pendingReturns=returns.filter((item)=>item.status==="REQUESTED").length;
  const visibleOrders=orders.filter((item)=>(orderStatus==="ALL"||item.status===orderStatus)
    && [item.orderNumber,item.customerName,item.customerPhone].some((value)=>String(value||"").toLocaleLowerCase("ru-RU").includes(orderQuery.trim().toLocaleLowerCase("ru-RU"))));
  const visibleUsers=users.filter((item)=>[item.firstName,item.lastName,item.email,item.phone].some((value)=>String(value||"").toLocaleLowerCase("ru-RU").includes(userQuery.trim().toLocaleLowerCase("ru-RU"))));
  const selectTab=(key)=>{setTab(key);if(menuOpen)menuButtonRef.current?.focus();setMenuOpen(false);window.scrollTo({top:0,behavior:"smooth"});};
  const sectionName=sections.find(([key])=>key===tab)?.[1]||"Обзор";

  return <div className="admin-page">
    {menuOpen&&<button type="button" className="admin-sidebar-backdrop" aria-label="Закрыть меню" onClick={()=>{setMenuOpen(false);menuButtonRef.current?.focus();}} />}
    <aside id="admin-sidebar" className={`admin-sidebar${menuOpen?" is-open":""}`}>
      <div className="admin-sidebar__intro"><span>РАБОЧЕЕ ПРОСТРАНСТВО</span><strong>SUNSET</strong><small>Управление магазином</small></div>
      <nav className="admin-tabs" aria-label="Разделы админки">{availableSections.map(([key,label])=><button type="button" className={tab===key?"active":""} aria-current={tab===key?"page":undefined} onClick={()=>selectTab(key)} key={key}><AdminNavIcon name={key}/><span>{label}</span>{key==="orders"&&pendingOrders>0&&<small aria-hidden="true">{pendingOrders}</small>}{key==="returns"&&pendingReturns>0&&<small aria-hidden="true">{pendingReturns}</small>}</button>)}</nav>
      <div className="admin-sidebar__footer"><span className="admin-sidebar__avatar" aria-hidden="true">{(identity.email||"A").slice(0,1).toUpperCase()}</span><span><strong>{identity.email||"Администратор"}</strong><small>{identity.role==="ADMIN"?"Администратор":"Сотрудник"}</small></span></div>
    </aside>
    <div className="admin-workspace">
      <div className="admin-workspace__toolbar"><button ref={menuButtonRef} type="button" className="admin-menu-toggle" aria-label="Открыть меню" aria-expanded={menuOpen} aria-controls="admin-sidebar" onClick={()=>setMenuOpen((value)=>!value)}>☰ <span>Меню</span></button><span className="admin-workspace__crumb">SUNSET CONTROL <b>/</b> {sectionName}</span><div className="admin-workspace__tools"><button type="button" onClick={()=>{setMessage("");load();}} disabled={refreshing}>{refreshing?"Обновляем…":"Обновить данные"}</button></div></div>
      <div className="admin-workspace__content"><div className="admin-heading"><div><p className="page-kicker">{sectionName.toUpperCase()}</p><h1 className="page-title">Управление магазином</h1></div><span>{products.length} товаров · {users.length} клиентов{lastUpdated&&<small>Данные на {lastUpdated.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</small>}</span></div>
    {message&&<p className="admin-message" role="alert">{message}</p>}

    {tab==="overview"&&<><div className="admin-metrics"><article><span>Заказов</span><strong>{analytics?.orders?.total||0}</strong><small>За 30 дней: {analytics?.orders?.last30Days||0}</small></article><article><span>Выручка</span><strong>{Number(analytics?.orders?.revenue||0).toLocaleString("ru-RU")} ₽</strong><small>Без отменённых заказов</small></article><article><span>Возвраты</span><strong>{analytics?.returns?.requested||0}</strong><small>Ожидают решения</small></article><article><span>Низкий остаток</span><strong>{analytics?.lowStock||0}</strong><small>Вариантов по 0–3 шт.</small></article></div><div className="admin-overview-grid"><section className="admin-work-card"><div className="admin-work-card__head"><span className="page-kicker">В ПРИОРИТЕТЕ</span><h2>Требует внимания</h2><p>Самое важное для работы магазина сегодня.</p></div><div className="admin-work-card__links"><button type="button" onClick={()=>selectTab("orders")}><span>Новые заказы</span><strong>{pendingOrders}</strong><span aria-hidden="true">↗</span></button><button type="button" onClick={()=>selectTab("returns")}><span>Заявки на возврат</span><strong>{pendingReturns}</strong><span aria-hidden="true">↗</span></button><button type="button" onClick={()=>selectTab("stock")}><span>Низкие остатки</span><strong>{analytics?.lowStock||0}</strong><span aria-hidden="true">↗</span></button></div></section><div className="admin-top-products"><h2>Популярные товары</h2>{!analytics?.topProducts?.length&&<p>Данные о продажах появятся здесь.</p>}{analytics?.topProducts?.map((item,index)=><div key={item.id}><i>{index+1}</i><span><strong>{item.name}</strong><small>{item.quantity} шт.</small></span><b>{Number(item.revenue).toLocaleString("ru-RU")} ₽</b></div>)}</div></div></>}

    {tab==="orders"&&<><div className="admin-filterbar"><label>Поиск заказа<input type="search" value={orderQuery} onChange={(event)=>setOrderQuery(event.target.value)} placeholder="Номер, имя или телефон" /></label><label>Статус<select aria-label="Фильтр по статусу" value={orderStatus} onChange={(event)=>setOrderStatus(event.target.value)}><option value="ALL">Все статусы</option>{Object.entries(orderStatusLabels).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label><span>{visibleOrders.length} из {orders.length}</span></div><div className="admin-table"><div className="admin-row admin-row--head"><span>Заказ</span><span>Клиент</span><span>Сумма</span><span>Статус</span></div>{visibleOrders.map((order)=><div className="admin-row" key={order.id}><span><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleString("ru-RU")}</small></span><span>{order.customerName}<small>{order.customerPhone}</small></span><span>{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</span><select value={order.status} disabled={!can("orders:manage")||!nextOrderStatuses[order.status]?.length} onChange={(event)=>changeStatus(order.id,event.target.value)} aria-label={`Статус заказа ${order.orderNumber}`}><option value={order.status}>{orderStatusLabels[order.status]||order.status}</option>{(nextOrderStatuses[order.status]||[]).map((status)=><option value={status} key={status}>{orderStatusLabels[status]}</option>)}</select></div>)}{!visibleOrders.length&&<p className="admin-empty-list">Заказов по этим условиям нет.</p>}</div></>}

    {tab==="returns"&&<div className="admin-table"><div className="admin-row admin-row--head"><span>Заказ</span><span>Клиент и причина</span><span>Сумма</span><span>Статус</span></div>{returns.map((item)=><div className="admin-row" key={item.id}><span><strong>{item.orderNumber}</strong><small>{new Date(item.created_at).toLocaleString("ru-RU")}</small></span><span>{item.email}<small>{item.reason}{item.comment?` · ${item.comment}`:""}</small></span><span>{Number(item.refund_amount).toLocaleString("ru-RU")} ₽</span><select value={item.status} disabled={!can("orders:manage")} onChange={(event)=>changeReturnStatus(item.id,event.target.value)}><option value="REQUESTED">Новая заявка</option><option value="APPROVED">Одобрено</option><option value="REJECTED">Отклонено</option><option value="RECEIVED">Товар получен</option><option value="REFUNDED">Деньги возвращены</option></select></div>)}</div>}

    {tab==="products"&&<AdminProductsPanel
      products={products} categoryTree={categoryTree} product={product} setProduct={setProduct}
      productGender={productGender} setProductGender={setProductGender}
      productCategoryFilter={productCategoryFilter} setProductCategoryFilter={setProductCategoryFilter}
      onCreate={createProduct} onEdit={setEditing} onDelete={deleteProduct}
    />}

    {tab==="stock"&&<AdminStockPanel
      products={products} categoryTree={categoryTree} stockCategory={stockCategory} setStockCategory={setStockCategory}
      stockCategoryProducts={stockCategoryProducts} stockProductId={stockProductId} setStockProductId={setStockProductId}
      selectedStock={selectedStock} stockDraft={stockDraft} setStockDraft={setStockDraft}
      locations={locations} stockLocationId={stockLocationId} setStockLocationId={setStockLocationId} stockLoading={stockLoading} stockError={stockError}
      stockOptions={stockOptions} newVariant={newVariant} setNewVariant={setNewVariant}
      expectedSizeType={expectedSizeType} allowedStockSizes={allowedStockSizes}
      onAddVariant={addStockVariant} onRemoveVariant={removeStockVariant} onSave={saveStock}
    />}

    {tab==="reviews"&&<AdminReviewsPanel />}

    {tab==="access"&&identity.role==="ADMIN"&&<AdminAccessPanel users={users} />}

    {tab==="promos"&&<><form className="admin-form" onSubmit={createPromo}><p className="page-kicker">Маркетинг</p><h2>Запустить промокод</h2><div><label>Код<input required value={promo.code} onChange={(e)=>setPromo({...promo,code:e.target.value.toUpperCase()})}/></label><label>Название<input required value={promo.title} onChange={(e)=>setPromo({...promo,title:e.target.value})}/></label></div><label>Описание<textarea value={promo.description} onChange={(e)=>setPromo({...promo,description:e.target.value})}/></label><div><label>Скидка, %<input type="number" min="0" max="100" value={promo.discountPercent} onChange={(e)=>setPromo({...promo,discountPercent:e.target.value})}/></label><label>Минимальный заказ<input type="number" min="0" value={promo.minOrder} onChange={(e)=>setPromo({...promo,minOrder:e.target.value})}/></label></div><button className="primary-action">Запустить акцию</button></form><div className="promo-admin-list">{promos.map((item)=><article key={item.id}><strong>{item.code}</strong><span>{item.title}</span><small>{item.active?"Активен":"Остановлен"} · использований: {item.usage_count}</small></article>)}</div></>}

    {tab==="users"&&<><div className="admin-filterbar"><label>Поиск клиента<input type="search" value={userQuery} onChange={(event)=>setUserQuery(event.target.value)} placeholder="Имя, email или телефон" /></label><span>{visibleUsers.length} из {users.length}</span></div><div className="admin-table admin-client-table"><div className="admin-row admin-users admin-row--head"><span>Клиент</span><span>Контакты</span><span>Заказы</span><span>Бонусы</span></div>{visibleUsers.map((user)=><div className="admin-row admin-users" key={user.id}><span><strong>{user.firstName} {user.lastName}</strong><small>{user.role}</small></span><span>{user.email}<small>{user.phone||"Телефон не указан"}</small></span><span>{user.orderCount} · {Number(user.orderTotal).toLocaleString("ru-RU")} ₽</span><div className="bonus-control"><strong>{user.bonusBalance}</strong>{can("customers:bonuses:write")&&<><input type="number" placeholder="+100 / −50" value={bonusDraft[user.id]||""} onChange={(e)=>setBonusDraft({...bonusDraft,[user.id]:e.target.value})}/><button onClick={()=>adjustBonus(user)}>Применить</button></>}</div></div>)}{!visibleUsers.length&&<p className="admin-empty-list">Клиентов по этому запросу нет.</p>}</div></>}

    {tab==="security"&&securityPanel}

    <AdminEditProductDialog editing={editing} setEditing={setEditing} categoryTree={categoryTree} onSave={saveProduct} />
      </div>
    </div>
  </div>;
}
