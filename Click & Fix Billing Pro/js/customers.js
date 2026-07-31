"use strict";
window.CF = window.CF || {};
CF.customers = (() => {
  const form = customer => `<form id="customerForm" class="form-grid"><input type="hidden" name="customerId" value="${CF.escape(customer?.customerId)}"><label>Name*<input required name="name" value="${CF.escape(customer?.name)}"></label><label>Mobile*<input required name="mobile" value="${CF.escape(customer?.mobile)}"></label><label>Alternate mobile<input name="alternateMobile" value="${CF.escape(customer?.alternateMobile)}"></label><label>Email<input type="email" name="email" value="${CF.escape(customer?.email)}"></label><label>GST Number<input name="gstNumber" value="${CF.escape(customer?.gstNumber)}"></label><label>State<input name="state" value="${CF.escape(customer?.state)}"></label><label class="wide">Address<textarea name="address">${CF.escape(customer?.address)}</textarea></label><label class="wide">Notes<textarea name="notes">${CF.escape(customer?.notes)}</textarea></label><div class="form-actions wide"><button class="primary">Save Customer</button><button type="button" class="secondary" data-cancel>Cancel</button></div></form>`;
  
  const rows = items => items.length ? items.sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<tr><td>${CF.escape(c.customerId)}</td><td>${CF.escape(c.name)}</td><td>${CF.escape(c.mobile)}</td><td>${CF.escape(c.gstNumber || "-")}</td><td>${CF.formatCurrency(c.outstanding)}</td><td class="actions"><button data-edit="${c.customerId}">Edit</button><button data-profile="${c.customerId}">Profile</button><button class="primary" data-welcome-email="${c.customerId}">📧 Welcome Email</button><button class="danger" data-delete-customer="${c.customerId}">Delete</button></td></tr>`).join("") : `<tr><td colspan="6" class="empty-cell">No customers yet.</td></tr>`;
  
  const render = async () => { const items = await CF.db.getAll("customers"); return `<div class="toolbar"><button class="primary" id="newCustomer">+ New Customer</button><input id="customerSearch" placeholder="Search name, mobile or GST"></div><article class="card" id="customerEditor" hidden></article><article class="card table-card"><table><thead><tr><th>Customer ID</th><th>Name</th><th>Mobile</th><th>GST</th><th>Outstanding</th><th></th></tr></thead><tbody id="customerRows">${rows(items)}</tbody></table></article>`; };
  
  const bind = () => { 
    document.getElementById("newCustomer")?.addEventListener("click",()=>show()); 
    document.getElementById("customerEditor")?.addEventListener("click",e=>{if(e.target.dataset.cancel!==undefined)e.currentTarget.hidden=true;}); 
    document.getElementById("customerRows")?.addEventListener("click",async e=>{
      const editId = e.target.dataset.edit;
      const profileId = e.target.dataset.profile;
      const welcomeId = e.target.dataset.welcomeEmail;
      const deleteId = e.target.dataset.deleteCustomer;

      if(editId) {
        const c = await CF.db.get("customers", editId);
        show(c);
      } else if(profileId) {
        const c = await CF.db.get("customers", profileId);
        profile(c);
      } else if(welcomeId) {
        sendWelcomeEmail(welcomeId);
      } else if(deleteId) {
        removeCustomer(deleteId);
      }
    }); 
    document.getElementById("customerSearch")?.addEventListener("input",async e=>{const q=e.target.value.toLowerCase(); const all=await CF.db.getAll("customers"); document.getElementById("customerRows").innerHTML=rows(all.filter(c=>[c.name,c.mobile,c.gstNumber].join(" ").toLowerCase().includes(q)));}); 
  };
  
  const show = c => { const panel=document.getElementById("customerEditor"); panel.hidden=false; panel.innerHTML=`<h2 class="section-title">${c?"Edit":"New"} Customer</h2>${form(c)}`; panel.querySelector("form").addEventListener("submit",save); };
  
  const save = async e => { e.preventDefault(); const data=Object.fromEntries(new FormData(e.target)); const existing=data.customerId&&await CF.db.get("customers",data.customerId); data.customerId=data.customerId||await CF.db.nextId("CUS-"); data.outstanding=Number(existing?.outstanding||0); data.createdAt=existing?.createdAt||new Date().toISOString(); data.updatedAt=new Date().toISOString(); if(existing?.welcomeEmailSent!==undefined){data.welcomeEmailSent=existing.welcomeEmailSent;data.welcomeEmailSentAt=existing.welcomeEmailSentAt;} await CF.db.put("customers",data); await CF.db.log("Saved customer","customer",data.customerId); CF.toast("Customer saved"); CF.router.render(); };
  const sendWelcomeEmail = async id => { const customer=await CF.db.get("customers",id); if(!customer)return CF.toast("Customer not found.","error"); const details=`<div style="line-height:1.7;text-align:left"><strong>Customer Name:</strong> ${CF.escape(customer.name||"")}<br><strong>Customer ID:</strong> ${CF.escape(customer.customerId||"")}<br><strong>Customer Email:</strong> ${CF.escape(customer.email||"Not available")}</div>`,approved=window.Swal?await window.Swal.fire({title:"Send Welcome Email?",html:details,icon:"question",showCancelButton:true,confirmButtonText:"Send",cancelButtonText:"Cancel",confirmButtonColor:"#246b9f"}).then(result=>result.isConfirmed):window.confirm(`Send Welcome Email?\n\nCustomer Name: ${customer.name||""}\nCustomer ID: ${customer.customerId||""}\nCustomer Email: ${customer.email||"Not available"}`);if(!approved)return;try{const email=String(customer.email||"").trim();if(!email)return CF.toast("Customer Email Not Found.","error");const template=await CF.emailTemplates.welcomeTemplate(),settings=Object.fromEntries((await CF.db.getAll("settings")).map(item=>[item.key,item.value])),variables={customerName:customer.name||"",customerId:customer.customerId||"",mobile:customer.mobile||"",email,companyName:settings.companyName||"Click & Fix Technologies",companyPhone:settings.phone||"",companyEmail:settings.email||"",companyAddress:settings.address||""};await CF.dues.sendEmail({to:email,customerName:customer.name||"",subject:CF.dues.replaceVariables(template.subject,variables),html:CF.dues.templateHtml(template.body,variables),errorLabel:"Welcome email"});await CF.db.put("customers",{...customer,welcomeEmailSent:true,welcomeEmailSentAt:new Date().toISOString()});CF.toast("Welcome email sent successfully");}catch(error){console.error(error);CF.toast(CF.dues.messageForError(error),"error");}};
  
  const removeCustomer = async id => {
    if(!confirm("Are you sure you want to delete this customer?")) return;
    try {
      const [invoices, payments] = await Promise.all([
        CF.db.getAll("invoices"),
        CF.db.getAll("payments")
      ]);
      const hasInvoices = invoices.some(i => i.customerId === id);
      const hasPayments = payments.some(p => p.customerId === id);

      if(hasInvoices || hasPayments) {
        return CF.toast("Cannot delete customer with existing invoices or payment history.", "error");
      }

      await CF.db.remove("customers", id);
      await CF.db.log("Deleted customer", "customer", id);
      CF.toast("Customer deleted successfully");
      CF.router.render();
    } catch(error) {
      CF.toast(error.message || "Could not delete customer", "error");
    }
  };

  const profile = async c => { const [invoices,payments]=await Promise.all([CF.db.getAll("invoices"),CF.db.getAll("payments")]); document.getElementById("view").innerHTML=`<button class="secondary" onclick="location.hash='#customers'">← Customers</button><div class="profile-head"><div><p class="eyebrow">${CF.escape(c.customerId)}</p><h2>${CF.escape(c.name)}</h2><p>${CF.escape(c.mobile)} · ${CF.escape(c.email||"No email")}</p><p>${CF.escape(c.address||"No address")}</p></div><div class="due-box">Outstanding Due<strong>${CF.formatCurrency(c.outstanding)}</strong></div></div><div class="section-grid"><article class="card"><h3 class="section-title">Invoice History</h3>${invoices.filter(x=>x.customerId===c.customerId).map(x=>`<p>${CF.escape(x.invoiceNo)} — ${CF.formatCurrency(x.grandTotal)} · Due ${CF.formatCurrency(x.due)}</p>`).join("")||"<p class='empty'>No invoices.</p>"}</article><article class="card"><h3 class="section-title">Payment History</h3>${payments.filter(x=>x.customerId===c.customerId).map(x=>`<p>${x.paymentDate} — ${CF.formatCurrency(x.amount)} (${CF.escape(x.mode)})</p>`).join("")||"<p class='empty'>No payments.</p>"}</article></div>`; };
  
  return { render, bind };
})();
