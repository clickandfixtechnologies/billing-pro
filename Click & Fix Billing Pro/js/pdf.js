"use strict";
window.CF = window.CF || {};
CF.pdf = {
 printInvoice: async id => {
  const [i, all] = await Promise.all([CF.db.get("invoices", id), CF.db.getAll("settings")]);
  if (!i) return;
  const s = Object.fromEntries(all.map(x => [x.key, x.value]));
  const gst = i.invoiceType === "GST", cust = i.customerSnapshot || {};
  const empty = "";
  const formatDate = value => { const m=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : CF.escape(value); };
  const terms = String(s.invoiceTerms || "").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const deliveryTerms = s.defaultDeliveryTerms || i.deliveryTerms || "";
  while (terms.length < 5) terms.push("");
  const customerName = CF.escape(cust.name || i.customerName), customerAddress = CF.escape(cust.address || "").replace(/\n/g,"<br>"), companyAddress = CF.escape(s.address || "").replace(/\n/g,"<br>");
  const qty = i.items.reduce((t,x)=>t+Number(x.qty||0),0), hsnCol = gst ? '<col style="width:10%">' : '', hsnHead = gst ? '<th>HSN/SAC</th>' : '', hsnCell = x => gst ? `<td>${CF.escape(x.hsn||"")}</td>` : '', gstHead = gst ? '<th>GST</th>' : '', gstCell = x => gst ? `<td class="number">${x.gst||0}%</td>` : '', colspan = gst ? 3 : 2;
  
  const qrSource = raw => { 
    const value = String(raw || "").trim(); 
    if (!value) return ""; 
    
    // Jodi path ti http ba data URL na hoy, tahole relative path hisebe treat korbe
    if (!value.startsWith('http') && !value.startsWith('data:') && !value.startsWith('file://')) {
      // Prothom slash (/) thakle ba na thakle thik kore handle korbe
      return value.startsWith('/') ? value : './' + value;
    }
    
    if (/^[A-Za-z]:[\\/]/.test(value)) return encodeURI(`file:///${value.replace(/\\/g,"/")}`); 
    return value; 
  };

  const qrUrl = qrSource(s.qrImageUrl);
  const qr = qrUrl ? `<img src="${CF.escape(qrUrl)}" alt="UPI QR">` : '<div class="qr-placeholder">Add UPI QR<br>in Settings</div>';
  const rows = i.items.map((x,n)=>`<tr><td>${n+1}</td><td class="description"><span class="item-name">${CF.escape(x.name)}</span>${x.serialNo?`<br><small>Batch: <b>${CF.escape(x.serialNo)}</b></small>`:""}${x.description?`<br><small>${CF.escape(x.description)}</small>`:""}</td>${hsnCell(x)}<td class="qty">${x.qty} Pcs</td><td class="money">${CF.formatCurrency(x.rate)}</td><td class="money">${CF.formatCurrency(x.discount)}</td>${gstCell(x)}<td class="money"><b>${CF.formatCurrency(x.amount)}</b></td></tr>`).join("");
  const metaCell = (label, value=empty) => `<td>${label}${value?`<strong>${value}</strong>`:""}</td>`;
  const h = `<!doctype html><html><head><meta charset="utf-8"><base href="${location.href}"><title>${CF.escape(i.invoiceNo)}</title><link rel="stylesheet" href="css/invoice.css?v=8"></head><body class="print-invoice"><h1 class="invoice-title">${gst?"Tax Invoice":"Invoice"}</h1><main class="invoice-frame"><section class="top-grid"><section class="seller"><p class="company-name">${CF.escape(s.companyName||"Click & Fix Billing Pro")}</p><p>${companyAddress}<br>Phone: ${CF.escape(s.phone||"")}${s.gst?`<br>GSTIN/UIN: ${CF.escape(s.gst)}`:""}<br>Email: ${CF.escape(s.email||"")}</p><div class="party"><span>Consignee (Ship to)</span><p class="customer-name">${customerName}</p><p>${customerAddress}${cust.mobile?`<br>${CF.escape(cust.mobile)}`:""}${cust.state?`<br>State: ${CF.escape(cust.state)}`:""}</p></div><div class="party"><span>Buyer (Bill to)</span><p class="customer-name">${customerName}</p><p>${customerAddress}${cust.mobile?`<br>${CF.escape(cust.mobile)}`:""}${cust.state?`<br>State: ${CF.escape(cust.state)}`:""}</p></div></section><section class="metadata"><table><tbody><tr>${metaCell("Invoice No.",CF.escape(i.invoiceNo))}${metaCell("Dated",formatDate(i.invoiceDate))}</tr><tr>${metaCell("Delivery Note",CF.escape(i.deliveryNote||""))}${metaCell("Mode/Terms of Payment",CF.escape(i.modeTerms||""))}</tr><tr>${metaCell("Reference No. & Date",CF.escape(i.referenceNo||""))}${metaCell("Other References",CF.escape(i.otherReferences||""))}</tr><tr>${metaCell("Buyer's Order No.",CF.escape(i.buyersOrderNo||""))}${metaCell("Dated",formatDate(i.orderDate))}</tr><tr>${metaCell("Dispatch Doc No.",CF.escape(i.dispatchDocNo||""))}${metaCell("Delivery Note Date",formatDate(i.deliveryNoteDate))}</tr><tr>${metaCell("Dispatched through",CF.escape(i.dispatchedThrough||""))}${metaCell("Destination",CF.escape(i.destination||""))}</tr></tbody></table><div class="delivery-box"><span>Terms of Delivery</span>${deliveryTerms?`<br>${CF.escape(deliveryTerms).replace(/\n/g,"<br>")}`:""}</div></section></section><table class="items"><colgroup><col style="width:3%"><col style="width:${gst?"36":"43"}%">${hsnCol}<col style="width:9%"><col style="width:10%"><col style="width:8%">${gst?'<col style="width:6%">':""}<col style="width:14%"></colgroup><thead><tr><th>Sl.<br>No.</th><th>Description of Goods</th>${hsnHead}<th>Quantity</th><th>Rate</th><th>Disc.</th>${gstHead}<th>Amount</th></tr></thead><tbody>${rows}<tr class="filler"><td></td><td></td>${gst?"<td></td>":""}<td></td><td></td><td></td>${gst?"<td></td>":""}<td></td></tr></tbody><tfoot><tr><td colspan="${colspan}">Total</td><td class="qty">${qty} Pcs</td><td colspan="${gst?3:2}"></td><td class="money">${CF.formatCurrency(i.grandTotal)}</td></tr></tfoot></table><section class="summary"><div class="words"><b>Amount Chargeable (in words)</b>${CF.escape(i.amountWords||CF.amountWords(i.grandTotal))}</div><div class="balances"><div class="balance-row"><span>Previous Balance</span><b>${CF.formatCurrency(i.previousBalance||0)}</b></div><div class="balance-row"><span>Invoice Amount</span><b>${CF.formatCurrency(i.grandTotal)}</b></div><div class="balance-row"><span>Current Balance</span><b>${CF.formatCurrency(Number(i.previousBalance||0)+Number(i.due||0))}</b></div></div></section><section class="footer-grid"><div class="terms"><b>Terms & Conditions</b><ol>${terms.slice(0,5).map(t=>`<li>${CF.escape(t)}</li>`).join("")}</ol></div><div class="scan-pay"><b>Scan & Pay</b>${s.upi?`<p>UPI ID: ${CF.escape(s.upi)}</p>`:""}<div class="qr-wrap">${qr}</div></div><div class="signatory"><b>for CLICK &amp; FIX TECHNOLOGIES</b><span>Authorised Signatory</span></div></section></main><p class="computer-note">This is a Computer Generated Invoice, does not require signature.</p></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return CF.toast("Please allow pop-ups to print the invoice.", "error");
  w.document.write(h); w.document.close(); w.focus(); setTimeout(()=>w.print(), 400);
 }
};

