"use strict";
window.CF = window.CF || {};
CF.products = (() => {
 let masters={brands:[],categories:[]};
 const getStoreName = type => type === "category" ? "categories" : type + "s";
 const options=(items,value,blank)=>`<option value="">${blank}</option>${items.map(x=>`<option value="${x.name}" ${x.name===value?"selected":""}>${CF.escape(x.name)}</option>`).join("")}`;
 
 const form=p=>`<form id="productForm" class="form-grid">
 <input type="hidden" name="productId" value="${CF.escape(p?.productId)}">
 <label>Product Name*<input required name="name" value="${CF.escape(p?.name)}"></label>
 <label>Brand<select name="brand">${options(masters.brands,p?.brand,"Select brand")}</select></label>
 <label>Category<select name="category">${options(masters.categories,p?.category,"Select category")}</select></label>
 <label>HSN/SAC<input name="hsn" value="${CF.escape(p?.hsn)}"></label>
 <label>Purchase Price<input class="no-spinner" type="number" name="purchasePrice" value="${p?.purchasePrice??0}"></label>
 <label>Selling Price*<input required class="no-spinner" type="number" name="sellingPrice" value="${p?.sellingPrice??0}"></label>
 <label>GST %<input class="no-spinner" type="number" name="gst" value="${p?.gst??0}"></label>
 <label>Opening Stock<input min="0" step="1" type="number" name="currentStock" value="${p?.currentStock??0}"></label>
 <label>Minimum Stock<input min="0" step="1" type="number" name="minimumStock" value="${p?.minimumStock??0}"></label>
 <label class="wide">Description<textarea name="description">${CF.escape(p?.description)}</textarea></label>
 <details class="wide"><summary>Optional / future fields</summary><label>Product Code<input name="productCode" value="${CF.escape(p?.productCode)}" placeholder="Optional product code"></label></details>
 <div class="form-actions wide"><button class="primary">Save Product</button>${p?`<button type="button" class="danger" data-delete-product="${CF.escape(p.productId)}">Delete Product</button>`:""}<button type="button" class="secondary" data-cancel>Cancel</button></div></form>`;

 const rows=items=>items.length?items.map(p=>`<tr><td>${CF.escape(p.name)}</td><td>${CF.escape(p.brand||"-")}</td><td>${CF.escape(p.category||"-")}</td><td>${CF.formatCurrency(p.sellingPrice)}</td><td class="${Number(p.currentStock)<=Number(p.minimumStock)?"low-stock":""}">${p.currentStock}</td><td><button data-edit="${p.productId}">Edit</button></td></tr>`).join(""):`<tr><td colspan="6" class="empty-cell">No products yet.</td></tr>`;
 
 const masterCard=(title,type,items)=>`<article class="card master-card"><h3>${title}</h3><form data-master="${type}" class="inline-mini"><input required placeholder="Add ${title.toLowerCase()}" name="name"><button class="secondary">Add</button></form><details class="master-list"><summary>${items.length} saved ${title.toLowerCase()} (manage)</summary><div class="tag-list">${items.map(x=>`<span>${CF.escape(x.name)} <button title="Remove" data-remove-master="${type}:${x[type+"Id"]}">×</button></span>`).join("")||"<small>No saved entries yet.</small>"}</div></details></article>`;
 
 const render=async()=>{const [items,brands,categories]=await Promise.all([CF.db.getAll("products"),CF.db.getAll("brands"),CF.db.getAll("categories")]);masters={brands,categories};return `<div class="toolbar"><button class="primary" id="newProduct">+ New Product</button></div><div class="master-grid">${masterCard("Brands","brand",brands)}${masterCard("Categories","category",categories)}</div><article class="card" id="productEditor" hidden></article><article class="card table-card"><table><thead><tr><th>Product</th><th>Brand</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr></thead><tbody id="productRows">${rows(items)}</tbody></table></article>`};
 
 const bind=()=>{document.getElementById("newProduct")?.addEventListener("click",()=>show());document.getElementById("productEditor")?.addEventListener("click",e=>{if(e.target.dataset.cancel!==undefined)e.currentTarget.hidden=true;if(e.target.dataset.deleteProduct)deleteProduct(e.target.dataset.deleteProduct)});document.getElementById("productRows")?.addEventListener("click",async e=>{if(e.target.dataset.edit)show(await CF.db.get("products",e.target.dataset.edit))});document.querySelectorAll("[data-master]").forEach(f=>f.addEventListener("submit",saveMaster));document.querySelectorAll("[data-remove-master]").forEach(b=>b.addEventListener("click",removeMaster));};
 
 const saveMaster=async e=>{
   e.preventDefault();
   const type=e.currentTarget.dataset.master,name=new FormData(e.currentTarget).get("name").trim();
   if(!name)return;
   const storeName = getStoreName(type);
   const all=await CF.db.getAll(storeName);
   if(all.some(x=>x.name.toLowerCase()===name.toLowerCase()))return CF.toast("Already exists","error");
   await CF.db.put(storeName,{[type+"Id"]:CF.id(),name,createdAt:new Date().toISOString()});
   CF.toast(`${type} added`);
   CF.router.render();
 };
 
 const removeMaster=async e=>{
   const [type,id]=e.currentTarget.dataset.removeMaster.split(":");
   if(confirm("Remove this saved option?")){
     await CF.db.remove(getStoreName(type),id);
     CF.router.render();
   }
 };
 
 const show=p=>{const x=document.getElementById("productEditor");x.hidden=false;x.innerHTML=`<h2 class="section-title">${p?"Edit":"New"} Product</h2>${form(p)}`;x.querySelector("form").addEventListener("submit",save)};
 const deleteProduct=async id=>{const [product,invoices,purchases]=await Promise.all([CF.db.get("products",id),CF.db.getAll("invoices"),CF.db.getAll("purchases")]);if(!product)return CF.toast("Product not found","error");if(invoices.some(invoice=>(invoice.items||[]).some(item=>item.productId===id))||purchases.some(purchase=>(purchase.items||[]).some(item=>item.productId===id)))return CF.toast("This product cannot be deleted because it is used in an invoice or purchase record.","error");if(!confirm(`Delete ${product.name}? Its local stock history will also be removed.`))return;for(const entry of await CF.db.getAll("inventory"))if(entry.productId===id)await CF.db.remove("inventory",entry.inventoryId);await CF.db.remove("products",id);CF.toast("Product deleted");CF.router.render()};
 
 const save=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const old=d.productId&&await CF.db.get("products",d.productId);["purchasePrice","sellingPrice","gst","currentStock","minimumStock"].forEach(k=>d[k]=Number(d[k]||0));d.productId=d.productId||CF.id();d.createdAt=old?.createdAt||new Date().toISOString();d.updatedAt=new Date().toISOString();await CF.db.put("products",d);if(!old&&d.currentStock)await CF.db.put("inventory",{inventoryId:CF.id(),productId:d.productId,type:"Opening stock",quantity:d.currentStock,transactionDate:CF.today(),note:"Initial stock"});CF.toast("Product saved");CF.router.render()};
 return {render,bind};
})();
