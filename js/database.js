"use strict";
window.CF = window.CF || {};
CF.db = (() => {
  const DB_NAME = "ClickFixBillingDB", VERSION = 6;
  const stores = [
    ["customers", "customerId", ["name", "mobile", "email"]],
    ["products", "productId", ["name", "productCode", "category"]],
    ["inventory", "inventoryId", ["productId", "transactionDate", "type"]],
    ["invoices", "invoiceId", ["invoiceNo", "customerId", "invoiceDate", "paymentStatus"]],
    ["payments", "paymentId", ["invoiceId", "customerId", "paymentDate"]],
    ["settings", "key", []], ["syncQueue", "queueId", ["status", "createdAt"]],
    ["auditLog", "logId", ["createdAt", "entityType", "entityId"]], ["counters", "name", []],
    ["brands", "brandId", ["name"]], ["categories", "categoryId", ["name"]],
    ["suppliers", "supplierId", ["name", "mobile", "gstNumber"]],
    ["purchases", "purchaseId", ["purchaseNo", "supplierId", "purchaseDate", "paymentStatus"]],
    ["supplierPayments", "paymentId", ["supplierId", "purchaseId", "paymentDate"]],
    ["emailTemplates", "templateId", ["name", "type"]], ["reminders", "reminderId", ["customerId", "createdAt", "status"]]
  ];
  let connection;
  const storeNames = () => stores.map(([name]) => name).filter(name => connection.objectStoreNames.contains(name));
  const open = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = event => { const db = event.target.result; stores.forEach(([name, key, indexes]) => { const store = db.objectStoreNames.contains(name) ? event.target.transaction.objectStore(name) : db.createObjectStore(name, { keyPath:key }); indexes.forEach(index => { if (!store.indexNames.contains(index)) store.createIndex(index, index, { unique:false }); }); }); };
    request.onblocked = () => reject(new Error("Close other Click & Fix tabs, then reload to update the local database."));
    request.onsuccess = event => { connection = event.target.result; resolve(connection); };
    request.onerror = () => reject(request.error);
  });
  const assertStore = store => { if (!connection?.objectStoreNames.contains(store)) throw new Error(`Local database update is required for '${store}'. Close every Click & Fix tab and reload this page.`); };
  const getAll = store => new Promise((resolve, reject) => { try { assertStore(store); const req = connection.transaction(store, "readonly").objectStore(store).getAll(); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); } catch(error) { reject(error); } });
  const get = (store, key) => new Promise((resolve, reject) => { const req = connection.transaction(store, "readonly").objectStore(store).get(key); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); });
  const put = (store, value) => new Promise((resolve, reject) => { const req=connection.transaction(store,"readwrite").objectStore(store).put(value); req.onsuccess=()=>resolve(value); req.onerror=()=>reject(req.error); });
  const remove = (store, key) => new Promise((resolve, reject) => { const req=connection.transaction(store,"readwrite").objectStore(store).delete(key); req.onsuccess=()=>resolve(); req.onerror=()=>reject(req.error); });
  const nextId = async prefix => { const record = await new Promise((resolve,reject)=>{ const req=connection.transaction("counters","readwrite").objectStore("counters").get(prefix); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); const number=(record?.value || 0)+1; await put("counters", {name:prefix,value:number,updatedAt:new Date().toISOString()}); return `${prefix}${String(number).padStart(6,"0")}`; };
  const log = async (action, entityType, entityId = "", detail = "") => put("auditLog", { logId:crypto.randomUUID(), action, entityType, entityId, detail, createdAt:new Date().toISOString() });
  const exportDatabase = async () => {
    if (!connection) throw new Error("Local database is not open.");
    const names = storeNames(), transaction = connection.transaction(names, "readonly"), data = {};
    await Promise.all(names.map(name => new Promise((resolve, reject) => { const request = transaction.objectStore(name).getAll(); request.onsuccess = () => { data[name] = request.result; resolve(); }; request.onerror = () => reject(request.error); })));
    return { app:"Click & Fix Billing Pro", version:"1.0", exportedAt:new Date().toISOString(), stores:data };
  };
  const importDatabase = json => new Promise((resolve, reject) => {
    if (!connection) return reject(new Error("Local database is not open."));
    const source = json?.stores || json;
    if (!source || typeof source !== "object" || Array.isArray(source)) return reject(new Error("Invalid Click & Fix backup."));
    const names = storeNames();
    if (!names.some(name => Array.isArray(source[name]))) return reject(new Error("Invalid Click & Fix backup."));
    try {
      const transaction = connection.transaction(names, "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Could not restore the local database."));
      transaction.onabort = () => reject(transaction.error || new Error("Could not restore the local database."));
      names.forEach(name => {
        const store = transaction.objectStore(name), clear = store.clear();
        clear.onerror = () => transaction.abort();
        clear.onsuccess = () => {
          const records = Array.isArray(source[name]) ? source[name] : [];
          records.forEach(record => { if (!record || typeof record !== "object" || Array.isArray(record)) { transaction.abort(); return; } const request = store.put(record); request.onerror = () => transaction.abort(); });
        };
      });
    } catch (error) { reject(error); }
  });
  return { open, getAll, get, put, remove, nextId, log, exportDatabase, importDatabase };
})();
