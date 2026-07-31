"use strict";
window.CF=window.CF||{};
CF.payments=(()=>{
 const numberToWords = num => {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if ((num = num.toString()).length > 9) return 'Overflow';
  let n = ('000000000' + num).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return ''; 
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + ' Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim() ? 'INR ' + str.trim() + ' Only' : 'Zero Only';
 };

 const render=async()=>{const [invoices,payments]=await Promise.all([CF.db.getAll("invoices"),CF.db.getAll("payments")]),open=invoices.filter(i=>Number(i.due)>0);return `<article class="card"><h2 class="section-title">Payment Entry</h2><form id="paymentForm" class="form-grid"><label>Invoice*<select required name="invoiceId"><option value="">Select pending invoice</option>${open.map(i=>`<option value="${i.invoiceId}">${CF.escape(i.invoiceNo)} — Due ${CF.formatCurrency(i.due)}</option>`).join("")}</select></label><label>Date<input name="paymentDate" type="date" value="${CF.today()}" required></label><label>Amount*<input name="amount" type="number" step=".01" min=".01" required></label><label>Mode<select name="mode"><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Card</option><option>Cheque</option><option>Other</option></select></label><label>Transaction ID<input name="transactionId"></label><label>Remark<input name="remark"></label><div class="form-actions wide"><button class="primary">Record Payment &amp; Print Slip</button></div></form></article><article class="card table-card"><h2 class="section-title">Payment History</h2><table><thead><tr><th>Date</th><th>Invoice</th><th>Amount</th><th>Mode</th><th>Transaction ID</th><th></th></tr></thead><tbody>${payments.sort((a,b)=>b.paymentDate.localeCompare(a.paymentDate)).map(p=>`<tr><td>${p.paymentDate}</td><td>${CF.escape(invoices.find(i=>i.invoiceId===p.invoiceId)?.invoiceNo||"—")}</td><td>${CF.formatCurrency(p.amount)}</td><td>${CF.escape(p.mode)}</td><td>${CF.escape(p.transactionId||"—")}</td><td class="actions"><button data-slip="${p.paymentId}">Slip</button><button data-edit-payment="${p.paymentId}">Edit</button><button class="danger" data-delete-payment="${p.paymentId}">Delete</button></td></tr>`).join("")||`<tr><td colspan="6" class="empty-cell">No payments recorded.</td></tr>`}</tbody></table></article>`};
 
 const formatDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString("en-IN"):"";
 const confirmationDetails=(customer,invoice,payment)=>`<div style="line-height:1.7;text-align:left"><strong>Customer Name:</strong> ${CF.escape(customer?.name||"Walk-in Customer")}<br><strong>Invoice Number:</strong> ${CF.escape(invoice.invoiceNo||"—")}<br><strong>Amount Paid:</strong> ${CF.formatCurrency(payment.amount)}<br><strong>Payment Date:</strong> ${formatDate(payment.paymentDate)}</div>`;
 const confirmSend=async id=>{const payment=await CF.db.get("payments",id);if(!payment)return CF.toast("Payment details not found.","error");const [invoice,customer]=await Promise.all([CF.db.get("invoices",payment.invoiceId),CF.db.get("customers",payment.customerId)]);if(!invoice)return CF.toast("Payment details not found.","error");const details=confirmationDetails(customer,invoice,payment),approved=window.Swal?await window.Swal.fire({title:"Send Payment Confirmation?",html:details,icon:"question",showCancelButton:true,confirmButtonText:"Send",cancelButtonText:"Cancel",confirmButtonColor:"#246b9f"}).then(result=>result.isConfirmed):window.confirm(`Send Payment Confirmation?\n\nCustomer Name: ${customer?.name||"Walk-in Customer"}\nInvoice Number: ${invoice.invoiceNo||"—"}\nAmount Paid: ${CF.formatCurrency(payment.amount)}\nPayment Date: ${formatDate(payment.paymentDate)}`);if(!approved)return;try{const email=String(customer?.email||"").trim();if(!email)return CF.toast("Customer Email Not Found.","error");const template=await CF.emailTemplates.paymentConfirmationTemplate(),settings=Object.fromEntries((await CF.db.getAll("settings")).map(item=>[item.key,item.value])),variables={customerName:customer?.name||"",invoiceNo:invoice.invoiceNo||"",invoiceDate:formatDate(invoice.invoiceDate),paymentDate:formatDate(payment.paymentDate),amount:CF.formatCurrency(payment.amount),paymentMethod:payment.mode||"",companyName:settings.companyName||"Click & Fix Technologies",companyPhone:settings.phone||"",companyEmail:settings.email||"",companyAddress:settings.address||""};await CF.dues.sendEmail({to:email,customerName:customer?.name,subject:CF.dues.replaceVariables(template.subject,variables),html:CF.dues.templateHtml(template.body,variables),errorLabel:"Payment confirmation"});await CF.db.put("payments",{...payment,confirmationSent:true,confirmationSentAt:new Date().toISOString()});CF.toast("Payment confirmation sent successfully");}catch(error){console.error(error);CF.toast(CF.dues.messageForError(error),"error");}};

 const slip=async id=>{
  const p=await CF.db.get("payments",id),i=await CF.db.get("invoices",p.invoiceId),cust=await CF.db.get("customers",p.customerId),w=window.open("","_blank");
  if(!w)return CF.toast("Please allow pop-ups to print the payment slip.","error");
  
  w.document.write(`
   <html>
   <head>
    <title>Receipt Voucher - ${p.paymentId}</title>
    <style>
     body { font-family: Arial, sans-serif; font-size: 14px; color: #000; margin: 20px; line-height: 1.4; }
     .header { text-align: center; margin-bottom: 20px; }
     .header h2 { margin: 0; font-size: 20px; font-weight: bold; }
     .header p { margin: 2px 0; font-size: 13px; }
     .title { text-align: center; font-weight: bold; font-size: 16px; margin: 15px 0; text-decoration: underline; }
     .meta-table, .content-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
     .meta-table td { padding: 4px 0; }
     .content-table th, .content-table td { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 8px; text-align: left; }
     .content-table th { background: #f9f9f9; }
     .text-right { text-align: right; }
     .footer { margin-top: 50px; float: right; text-align: center; }
     .sig-line { margin-top: 40px; border-top: 1px solid #000; width: 200px; }
    </style>
   </head>
   <body>
    <div class="header">
     <h2>Click & Fix Technologies</h2>
     <p>Computer Repair | IT Solutions | CCTV Installation</p>
     <p>📍 Burdwan, West Bengal</p>
     <p>📞 Phone: 7098889990 | 🌐 clickandfix.site</p>
     <p>E-Mail : your_email@gmail.com</p>
    </div>

    <div class="title">Receipt Voucher</div>

    <table class="meta-table">
     <tr>
      <td><b>No. :</b> ${p.paymentId.slice(-6).toUpperCase()}</td>
      <td class="text-right"><b>Dated :</b> ${new Date(p.paymentDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'2-digit'}).replace(/ /g, '-')}</td>
     </tr>
    </table>

    <table class="content-table">
     <thead>
      <tr>
       <th>Particulars</th>
       <th class="text-right">Amount</th>
      </tr>
     </thead>
     <tbody>
      <tr>
       <td>
        <b>Account :</b><br>
        <div style="margin-left: 15px; margin-top: 5px;">
         <b>${CF.escape(cust?.name || "Walk-in Customer")}</b><br>
         <span style="font-size: 12px; color: #333;">Agst Ref &nbsp;&nbsp; ${CF.escape(i?.invoiceNo || "—")}</span>
        </div>
       </td>
       <td class="text-right" style="vertical-align: top;"><br><b>${CF.formatCurrency(p.amount).replace('₹','Rs. ')}</b></td>
      </tr>
     </tbody>
    </table>

    <p style="margin-top: 15px;"><b>Through :</b> ${CF.escape(p.mode)} ${p.transactionId ? `&nbsp;&nbsp;|&nbsp;&nbsp; <b>Transaction ID :</b> ${CF.escape(p.transactionId)}` : ''}</p>
    <p><b>Amount (in words) :</b><br>${numberToWords(Math.round(p.amount))}</p>

    <div class="footer">
     <div class="sig-line"></div>
     <p><b>Authorised Signatory</b></p>
    </div>

   </body>
   </html>
  `);
  w.document.close();
  setTimeout(()=>w.print(), 200);
 };

 const bind=()=>{
 document.getElementById("paymentForm")?.addEventListener("submit",save);
  document.querySelectorAll("[data-edit-payment]").forEach(editButton=>{const button=document.createElement("button");button.type="button";button.className="primary";button.dataset.sendConfirmation=editButton.dataset.editPayment;button.textContent="📧 Send Confirmation";editButton.before(button);});
  document.querySelectorAll("[data-slip]").forEach(b=>b.addEventListener("click",()=>slip(b.dataset.slip)));
  document.querySelectorAll("[data-send-confirmation]").forEach(b=>b.addEventListener("click",()=>confirmSend(b.dataset.sendConfirmation)));
  document.querySelectorAll("[data-edit-payment]").forEach(b=>b.addEventListener("click",()=>edit(b.dataset.editPayment)));
  document.querySelectorAll("[data-delete-payment]").forEach(b=>b.addEventListener("click",()=>removePayment(b.dataset.deletePayment)));
 };

 const edit=async id=>{const [p,invoices]=await Promise.all([CF.db.get("payments",id),CF.db.getAll("invoices")]);if(!p)return;document.getElementById("view").innerHTML=`<article class="card"><div class="toolbar"><h2 class="section-title">Edit Payment</h2><button type="button" class="secondary" id="cancelPaymentEdit">Cancel</button></div><p class="notice">Changing the amount automatically updates the invoice due and the customer outstanding balance.</p><form id="editPaymentForm" class="form-grid"><label>Invoice<select name="invoiceId" required>${invoices.map(i=>`<option value="${i.invoiceId}" ${i.invoiceId===p.invoiceId?"selected":""}>${CF.escape(i.invoiceNo)} — Total ${CF.formatCurrency(i.grandTotal)}</option>`).join("")}</select></label><label>Date<input name="paymentDate" type="date" value="${p.paymentDate}" required></label><label>Amount<input name="amount" type="number" min=".01" step=".01" value="${p.amount}" required></label><label>Mode<select name="mode">${["Cash","UPI","Bank Transfer","Card","Cheque","Other"].map(x=>`<option ${x===p.mode?"selected":""}>${x}</option>`).join("")}</select></label><label>Transaction ID<input name="transactionId" value="${CF.escape(p.transactionId||"")}"></label><label>Remark<input name="remark" value="${CF.escape(p.remark||"")}"></label><div class="form-actions wide"><button class="primary">Save Payment Changes</button></div></form></article>`;document.getElementById("cancelPaymentEdit").addEventListener("click",CF.router.render);document.getElementById("editPaymentForm").addEventListener("submit",e=>saveEdit(e,p))};

 const applyAmount=async(invoice,customer,delta)=>{if(delta>Number(invoice.due||0)+0.0001)throw new Error("Payment amount is more than the invoice outstanding due.");invoice.due=CF.money(Number(invoice.due||0)-delta);invoice.paid=CF.money(Number(invoice.paid||0)+delta);invoice.paymentStatus=invoice.due===0?"Paid":invoice.paid>0?"Partial":"Unpaid";customer.outstanding=CF.money(Number(customer.outstanding||0)-delta);await Promise.all([CF.db.put("invoices",invoice),CF.db.put("customers",customer)])};

 const saveEdit=async(e,p)=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),amount=Number(d.amount);if(!(amount>0))return CF.toast("Enter a valid payment amount","error");const [oldInvoice,oldCustomer,targetInvoice]=await Promise.all([CF.db.get("invoices",p.invoiceId),CF.db.get("customers",p.customerId),CF.db.get("invoices",d.invoiceId)]);if(!targetInvoice)return CF.toast("Select a valid invoice","error");const available=Number(targetInvoice.due||0)+(targetInvoice.invoiceId===p.invoiceId?Number(p.amount||0):0);if(amount>available+0.0001)return CF.toast("Payment amount is more than the invoice outstanding due","error");try{await applyAmount(oldInvoice,oldCustomer,-Number(p.amount||0));const invoice=await CF.db.get("invoices",d.invoiceId),customer=await CF.db.get("customers",invoice.customerId);await applyAmount(invoice,customer,amount);Object.assign(p,d,{amount,customerId:invoice.customerId,updatedAt:new Date().toISOString()});await CF.db.put("payments",p);CF.toast("Payment updated and balances adjusted");CF.router.render()}catch(error){CF.toast(error.message||"Could not update payment","error")}};

 const removePayment=async id=>{
  if(!confirm("Are you sure you want to delete this payment? This will revert the invoice due and customer outstanding balance.")) return;
  try {
   const p = await CF.db.get("payments", id);
   if(!p) return CF.toast("Payment not found", "error");
   const [invoice, customer] = await Promise.all([
    CF.db.get("invoices", p.invoiceId),
    CF.db.get("customers", p.customerId)
   ]);
   if(invoice && customer) {
    invoice.due = CF.money(Number(invoice.due || 0) + Number(p.amount));
    invoice.paid = CF.money(Number(invoice.paid || 0) - Number(p.amount));
    invoice.paymentStatus = invoice.due === Number(invoice.grandTotal || invoice.due) ? "Unpaid" : "Partial";
    customer.outstanding = CF.money(Number(customer.outstanding || 0) + Number(p.amount));
    await Promise.all([
     CF.db.put("invoices", invoice),
     CF.db.put("customers", customer)
    ]);
   }
   await CF.db.remove("payments", id);
   CF.toast("Payment deleted and balances reverted");
   CF.router.render();
  } catch(error) {
   CF.toast(error.message || "Could not delete payment", "error");
  }
 };

 const save=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),invoice=await CF.db.get("invoices",d.invoiceId),amount=Number(d.amount);if(!invoice||!(amount>0))return CF.toast("Select an invoice and enter a valid amount","error");const c=await CF.db.get("customers",invoice.customerId);try{await applyAmount(invoice,c,amount);const p={paymentId:CF.id(),...d,amount,customerId:invoice.customerId,createdAt:new Date().toISOString()};await CF.db.put("payments",p);CF.toast("Payment recorded");await slip(p.paymentId);CF.router.render()}catch(error){CF.toast(error.message||"Could not record payment","error")}};

 return {render,bind};
})();
