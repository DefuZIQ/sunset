import { useCallback, useEffect, useMemo, useState } from "react";
import { categoryMatches } from "../components/AdminCategoryTree";
import AdminProductsPanel, { AdminEditProductDialog } from "./admin/AdminProductsPanel";
import AdminStockPanel from "./admin/AdminStockPanel";
import { adjustAdminBonuses, createAdminProduct, createAdminPromotion, deleteAdminProduct, getAdminAnalytics, getCategoryTree, listAdminOrders, listAdminPromotions, listAdminReturns, listAdminUsers, listAdminVariants, listProducts, updateAdminOrderStatus, updateAdminProduct, updateAdminReturnStatus, updateAdminStock } from "../api/client";
import "./Admin.css";

const adminToken = () => localStorage.getItem("authToken") || "";
const blankProduct = { name:"",description:"",price:"",quantity:10,category:"Женские боди",gender:"WOMEN",imageUrl:"/images/products/1.png" };
const leafCategory = (item) => item?.categories?.[item.categories.length-1] || "";
const orderStatusLabels={PENDING:"Новый",CONFIRMED:"Подтверждён",ASSEMBLING:"Собирается",SHIPPED:"Доставка",DELIVERED:"Доставлен",CANCELLED:"Отменён"};
const nextOrderStatuses={PENDING:["CONFIRMED","CANCELLED"],CONFIRMED:["ASSEMBLING","CANCELLED"],ASSEMBLING:["SHIPPED","CANCELLED"],SHIPPED:["DELIVERED"],DELIVERED:[],CANCELLED:[]};

export default function Admin() {
  const [tab,setTab]=useState("overview"); const [orders,setOrders]=useState([]); const [users,setUsers]=useState([]); const [promos,setPromos]=useState([]); const [products,setProducts]=useState([]); const [categoryTree,setCategoryTree]=useState([]); const [returns,setReturns]=useState([]); const [analytics,setAnalytics]=useState(null); const [message,setMessage]=useState("");
  const [product,setProduct]=useState(blankProduct); const [editing,setEditing]=useState(null); const [productGender,setProductGender]=useState("ALL"); const [productCategoryFilter,setProductCategoryFilter]=useState(""); const [stockCategory,setStockCategory]=useState(""); const [stockProductId,setStockProductId]=useState(""); const [stockDraft,setStockDraft]=useState([]); const [stockOptions,setStockOptions]=useState({colors:[],sizes:[]}); const [newVariant,setNewVariant]=useState({colorId:"",sizeId:"",quantity:0}); const [bonusDraft,setBonusDraft]=useState({});
  const [promo,setPromo]=useState({code:"",title:"",description:"",discountPercent:10,bonusMultiplier:1,minOrder:0,birthdayOnly:false,active:true});

  const load=useCallback(async()=>{
    const token=localStorage.getItem("authToken");
    if(!token){setMessage("Войдите в аккаунт администратора");return;}
    const [ordersResult,usersResult,promosResult,catalogResult,variantsResult,treeResult,returnsResult,analyticsResult]=await Promise.allSettled([
      listAdminOrders(token),listAdminUsers(token),listAdminPromotions(token),listProducts(),
      listAdminVariants(token),getCategoryTree(),listAdminReturns(token),getAdminAnalytics(token),
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
    const failed=[ordersResult,usersResult,promosResult,catalogResult,variantsResult,treeResult,returnsResult,analyticsResult]
      .find((result)=>result.status==="rejected");
    if(failed)setMessage(failed.reason?.message||"Часть данных магазина не загрузилась");
  },[]);
  useEffect(()=>{load();},[load]);
  const stockCategoryProducts=useMemo(()=>products.filter((item)=>categoryMatches(categoryTree,stockCategory,item.categories||[])),[products,categoryTree,stockCategory]);
  const selectedStock=useMemo(()=>stockCategoryProducts.find((item)=>String(item.id)===String(stockProductId)),[stockCategoryProducts,stockProductId]);
  const expectedSizeType=useMemo(()=>{const category=leafCategory(selectedStock).toLowerCase();if(category.match(/аксессуар|сумк|ремн|головн|кепк|очк|час/))return "accessory";if(category.includes("плать"))return "women_dress";if(category.includes("джинс"))return "jeans";if(category.includes("брюк"))return selectedStock?.gender==="MEN"?"men_trousers":"women_trousers";return selectedStock?.gender==="MEN"?"men_clothing":"women_clothing";},[selectedStock]);
  const allowedStockSizes=useMemo(()=>stockOptions.sizes.filter((size)=>size.type===expectedSizeType),[stockOptions.sizes,expectedSizeType]);
  useEffect(()=>setStockDraft((selectedStock?.stock||[]).map((item)=>({...item}))),[selectedStock]);
  useEffect(()=>{if(stockCategoryProducts.length&&!stockCategoryProducts.some((item)=>String(item.id)===String(stockProductId)))setStockProductId(stockCategoryProducts[0].id);},[stockCategoryProducts,stockProductId]);
  useEffect(()=>{if(allowedStockSizes.length&&!allowedStockSizes.some((size)=>String(size.id)===String(newVariant.sizeId)))setNewVariant((current)=>({...current,sizeId:allowedStockSizes[0].id}));},[allowedStockSizes,newVariant.sizeId]);
  const notify=(value)=>{setMessage(value);window.setTimeout(()=>setMessage(""),3500);};
  const changeStatus=async(id,status)=>{try{await updateAdminOrderStatus(adminToken(),id,{status});notify("Статус заказа обновлён");load();}catch(error){notify(error.message);}};
  const createProduct=async(event)=>{event.preventDefault();try{
    const data=await createAdminProduct(adminToken(),{...product,price:Number(product.price),quantity:Number(product.quantity)});
    notify(`Товар «${data.name}» добавлен`);setProduct(blankProduct);load();
  }catch(error){notify(error.message);}};
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
    await updateAdminStock(adminToken(),stockProductId,{stock:stockDraft.map((item)=>({
      sizeId:item.sizeId,colorId:item.colorId,quantity:Number(item.quantity),
    }))});
    notify("Остатки сохранены");load();
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

  return <div className="page-shell container admin-page"><div className="admin-heading"><div><p className="page-kicker">SUNSET CONTROL</p><h1 className="page-title">Управление магазином</h1></div><span>{products.length} товаров · {users.length} клиентов</span></div>
    <div className="admin-tabs">{[["overview","Обзор"],["orders","Заказы"],["returns","Возвраты"],["products","Товары"],["stock","Остатки"],["promos","Акции"],["users","Клиенты"]].map(([key,label])=><button className={tab===key?"active":""} onClick={()=>setTab(key)} key={key}>{label}</button>)}</div>{message&&<p className="admin-message">{message}</p>}

    {tab==="overview"&&<><div className="admin-metrics"><article><span>Заказов</span><strong>{analytics?.orders?.total||0}</strong><small>За 30 дней: {analytics?.orders?.last30Days||0}</small></article><article><span>Выручка</span><strong>{Number(analytics?.orders?.revenue||0).toLocaleString("ru-RU")} ₽</strong><small>Без отменённых заказов</small></article><article><span>Возвраты</span><strong>{analytics?.returns?.requested||0}</strong><small>Ожидают решения</small></article><article><span>Низкий остаток</span><strong>{analytics?.lowStock||0}</strong><small>Вариантов по 0–3 шт.</small></article></div><div className="admin-top-products"><h2>Популярные товары</h2>{analytics?.topProducts?.map((item,index)=><div key={item.id}><i>{index+1}</i><span><strong>{item.name}</strong><small>{item.quantity} шт.</small></span><b>{Number(item.revenue).toLocaleString("ru-RU")} ₽</b></div>)}</div></>}

    {tab==="orders"&&<div className="admin-table"><div className="admin-row admin-row--head"><span>Заказ</span><span>Клиент</span><span>Сумма</span><span>Статус</span></div>{orders.map((order)=><div className="admin-row" key={order.id}><span><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleString("ru-RU")}</small></span><span>{order.customerName}<small>{order.customerPhone}</small></span><span>{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</span><select value={order.status} disabled={!nextOrderStatuses[order.status]?.length} onChange={(event)=>changeStatus(order.id,event.target.value)}><option value={order.status}>{orderStatusLabels[order.status]||order.status}</option>{(nextOrderStatuses[order.status]||[]).map((status)=><option value={status} key={status}>{orderStatusLabels[status]}</option>)}</select></div>)}</div>}

    {tab==="returns"&&<div className="admin-table"><div className="admin-row admin-row--head"><span>Заказ</span><span>Клиент и причина</span><span>Сумма</span><span>Статус</span></div>{returns.map((item)=><div className="admin-row" key={item.id}><span><strong>{item.orderNumber}</strong><small>{new Date(item.created_at).toLocaleString("ru-RU")}</small></span><span>{item.email}<small>{item.reason}{item.comment?` · ${item.comment}`:""}</small></span><span>{Number(item.refund_amount).toLocaleString("ru-RU")} ₽</span><select value={item.status} onChange={(event)=>changeReturnStatus(item.id,event.target.value)}><option value="REQUESTED">Новая заявка</option><option value="APPROVED">Одобрено</option><option value="REJECTED">Отклонено</option><option value="RECEIVED">Товар получен</option><option value="REFUNDED">Деньги возвращены</option></select></div>)}</div>}

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
      stockOptions={stockOptions} newVariant={newVariant} setNewVariant={setNewVariant}
      expectedSizeType={expectedSizeType} allowedStockSizes={allowedStockSizes}
      onAddVariant={addStockVariant} onRemoveVariant={removeStockVariant} onSave={saveStock}
    />}

    {tab==="promos"&&<><form className="admin-form" onSubmit={createPromo}><p className="page-kicker">Маркетинг</p><h2>Запустить промокод</h2><div><label>Код<input required value={promo.code} onChange={(e)=>setPromo({...promo,code:e.target.value.toUpperCase()})}/></label><label>Название<input required value={promo.title} onChange={(e)=>setPromo({...promo,title:e.target.value})}/></label></div><label>Описание<textarea value={promo.description} onChange={(e)=>setPromo({...promo,description:e.target.value})}/></label><div><label>Скидка, %<input type="number" min="0" max="100" value={promo.discountPercent} onChange={(e)=>setPromo({...promo,discountPercent:e.target.value})}/></label><label>Минимальный заказ<input type="number" min="0" value={promo.minOrder} onChange={(e)=>setPromo({...promo,minOrder:e.target.value})}/></label></div><button className="primary-action">Запустить акцию</button></form><div className="promo-admin-list">{promos.map((item)=><article key={item.id}><strong>{item.code}</strong><span>{item.title}</span><small>{item.active?"Активен":"Остановлен"} · использований: {item.usage_count}</small></article>)}</div></>}

    {tab==="users"&&<div className="admin-table admin-client-table"><div className="admin-row admin-users admin-row--head"><span>Клиент</span><span>Контакты</span><span>Заказы</span><span>Бонусы</span></div>{users.map((user)=><div className="admin-row admin-users" key={user.id}><span><strong>{user.firstName} {user.lastName}</strong><small>{user.role}</small></span><span>{user.email}<small>{user.phone||"Телефон не указан"}</small></span><span>{user.orderCount} · {Number(user.orderTotal).toLocaleString("ru-RU")} ₽</span><div className="bonus-control"><strong>{user.bonusBalance}</strong><input type="number" placeholder="+100 / −50" value={bonusDraft[user.id]||""} onChange={(e)=>setBonusDraft({...bonusDraft,[user.id]:e.target.value})}/><button onClick={()=>adjustBonus(user)}>Применить</button></div></div>)}</div>}

    <AdminEditProductDialog editing={editing} setEditing={setEditing} categoryTree={categoryTree} onSave={saveProduct} />
  </div>;
}
