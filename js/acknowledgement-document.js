"use strict";
window.CF = window.CF || {};

// Canonical final acknowledgement document. Both the authenticated admin page
// and the token-only customer page use this exact markup and PDF capture path.
CF.ackDocument = (() => {
  const escape = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
  const pick = (record, snake, camel = snake) => record?.[snake] ?? record?.[camel] ?? "";
  const date = value => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? String(value || "—") : parsed.toLocaleDateString("en-GB"); };
  const time = value => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleTimeString("en-GB"); };
  const money = value => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR" }).format(Number(value || 0));

  const normalize = record => ({
    acknowledgementNo: pick(record, "acknowledgement_no", "acknowledgementNo"),
    invoiceNo: pick(record, "invoice_no", "invoiceNo"),
    invoiceDate: pick(record, "invoice_date", "invoiceDate"),
    deliveryDate: pick(record, "delivery_date", "deliveryDate"),
    customerName: pick(record, "customer_name", "customerName"),
    customerAddress: pick(record, "customer_address", "customerAddress"),
    customerMobile: pick(record, "customer_mobile", "customerMobile"),
    customerEmail: pick(record, "customer_email", "customerEmail"),
    customerGstin: pick(record, "customer_gstin", "customerGstin"),
    invoiceTotal: pick(record, "invoice_total", "invoiceTotal"),
    receiverName: pick(record, "receiver_name", "receiverName"),
    issueRemark: pick(record, "issue_remark", "issueRemark"),
    signatureData: pick(record, "signature_data", "signatureData"),
    signedAt: pick(record, "signed_at", "signedAt"),
    signedIp: pick(record, "signed_ip", "signedIp"),
    verifiedAt: pick(record, "otp_verified_at", "verifiedAt"),
    verificationMethod: pick(record, "verification_method", "verificationMethod") || "Email OTP",
    deliveryLocation: pick(record, "delivery_location", "deliveryLocation"),
    latitude: pick(record, "latitude"),
    longitude: pick(record, "longitude"),
    signatureMethod: pick(record, "signature_method", "signatureMethod") || "digital"
  });

  const styles = `<style>
    *{box-sizing:border-box}.ack-slip{background:#fff;border:1px solid #24445f;color:#17212b;font:9.2px/1.28 Arial,sans-serif;margin:0 auto;max-width:190mm;padding:0 4.5mm 3.5mm;width:190mm;overflow-wrap:anywhere}.ack-slip-header{align-items:center;background:#175ea8;color:#fff;display:flex;justify-content:space-between;margin:0 -4.5mm 3mm;padding:3.4mm 4.5mm}.ack-slip-brand{font-size:14px;font-weight:700;letter-spacing:1px}.ack-slip-subtitle{font-size:9px;margin-top:1px}.ack-slip-title{text-align:right}.ack-slip-title strong{font-size:12px}.ack-slip-title span{font-size:8.5px}.ack-slip-grid{border:1px solid #a8b8c5;display:grid;grid-template-columns:repeat(4,1fr);margin:0}.ack-slip-field{border-bottom:1px solid #d1dbe3;min-width:0;padding:1.5mm 2mm}.ack-slip-field:nth-child(4n+1),.ack-slip-field:nth-child(4n+2),.ack-slip-field:nth-child(4n+3){border-right:1px solid #d1dbe3}.ack-slip-field.customer{grid-column:span 2}.ack-slip-label{color:#4b5f70;font-size:7.5px;font-weight:700;text-transform:uppercase}.ack-slip-value{font-weight:600;margin-top:.5mm;overflow-wrap:anywhere}.ack-slip-statement,.ack-slip-condition,.ack-slip-auto{border:1px solid #a8b8c5;border-top:0;padding:1.8mm 2mm}.ack-slip-condition{display:grid;gap:1mm;grid-template-columns:1fr 1fr}.ack-slip-final{border:1px solid #a8b8c5;border-top:0;display:grid;grid-template-columns:1fr 1.15fr;min-width:0}.ack-slip-receiver,.ack-slip-signature{min-width:0;padding:2mm}.ack-slip-receiver{border-right:1px solid #a8b8c5}.ack-slip-row{margin-bottom:1.25mm}.ack-slip-row:last-child{margin-bottom:0}.ack-slip-signature-box{align-items:center;display:grid;gap:2mm;grid-template-columns:minmax(0,1fr) 42mm}.ack-slip-signature-image{display:block;max-height:18mm;max-width:100%;object-fit:contain}.ack-slip-signature-date{border-left:1px solid #d1dbe3;font-size:8.2px;line-height:1.4;padding-left:2mm}.ack-slip-auto{font-size:8px}.ack-slip-disclaimer{font:7.5px/1.2 Arial,sans-serif;margin:1.5mm 0 0;text-align:center}@media print{@page{size:A4 portrait;margin:10mm}body{background:#fff;margin:0}.ack-slip{max-width:190mm;width:190mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}.ack-slip-header{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style>`;

  const html = record => {
    const a = normalize(record);
    return `<section class="ack-slip"><header class="ack-slip-header"><div><div class="ack-slip-brand">CLICK &amp; FIX</div><div class="ack-slip-subtitle">Acknowledgement / Delivery Receipt</div></div><div class="ack-slip-title"><strong>ACKNOWLEDGEMENT</strong><br><span>No. ${escape(a.acknowledgementNo)}</span></div></header><section class="ack-slip-grid"><div class="ack-slip-field"><div class="ack-slip-label">Invoice No.</div><div class="ack-slip-value">${escape(a.invoiceNo)}</div></div><div class="ack-slip-field"><div class="ack-slip-label">Invoice Date</div><div class="ack-slip-value">${date(a.invoiceDate)}</div></div><div class="ack-slip-field"><div class="ack-slip-label">Delivery Date</div><div class="ack-slip-value">${date(a.deliveryDate)}</div></div><div class="ack-slip-field"><div class="ack-slip-label">Bill Amount</div><div class="ack-slip-value">${money(a.invoiceTotal)}</div></div><div class="ack-slip-field customer"><div class="ack-slip-label">Customer</div><div class="ack-slip-value">${escape(a.customerName)}${a.customerAddress ? `<br>${escape(a.customerAddress)}` : ""}</div></div><div class="ack-slip-field"><div class="ack-slip-label">Mobile</div><div class="ack-slip-value">${escape(a.customerMobile || "—")}</div></div><div class="ack-slip-field"><div class="ack-slip-label">GSTIN</div><div class="ack-slip-value">${escape(a.customerGstin || "—")}</div></div></section><section class="ack-slip-statement">This acknowledgement confirms receipt of the above goods/services in satisfactory condition.</section><section class="ack-slip-condition"><div><b>Delivery Condition</b><br>Goods/Service received in good condition &nbsp; ☑ Yes</div><div><b>Issue/Remark</b><br>${escape(a.issueRemark || "—")}</div></section><section class="ack-slip-final"><div class="ack-slip-receiver"><div class="ack-slip-row"><b>Receiver Name:</b> ${escape(a.receiverName || "—")}</div><div class="ack-slip-row"><b>Received By:</b> ${escape(a.receiverName || a.customerName || "—")}</div><div class="ack-slip-row"><b>Signature Method:</b> ${escape(a.signatureMethod === "digital" ? "Digital" : a.signatureMethod)}</div></div><div class="ack-slip-signature"><div class="ack-slip-signature-box"><div><b>Digital Signature</b>${a.signatureData ? `<img class="ack-slip-signature-image" alt="Digital signature" src="${a.signatureData}">` : "<div>—</div>"}</div><div class="ack-slip-signature-date"><b>Signed Date/Time</b><br>${date(a.signedAt)}<br>${time(a.signedAt)}</div></div></div></section><section class="ack-slip-auto"><b>Automatic Information</b><br>Verified: ${date(a.verifiedAt)} ${time(a.verifiedAt)} · ${escape(a.verificationMethod)}<br>IP: ${escape(a.signedIp || "Captured server-side")} · Location: ${escape(a.deliveryLocation || "—")}<br>Latitude: ${escape(a.latitude || "—")} · Longitude: ${escape(a.longitude || "—")}</section></section><p class="ack-slip-disclaimer">This is system generated acknowledgement does not require signature</p>`;
  };

  const print = record => {
    const a = normalize(record), popup = window.open("", "_blank");
    if (!popup) throw Error("Please allow pop-ups to print.");
    popup.document.write(`<!doctype html><html><head><title>${escape(a.acknowledgementNo)}</title>${styles}</head><body>${html(a)}</body></html>`);
    popup.document.close();
    setTimeout(() => popup.print(), 250);
  };

  const download = async record => {
    if (!window.html2canvas || !window.jspdf?.jsPDF) throw Error("PDF generator is unavailable.");
    const a = normalize(record), host = document.createElement("div");
    host.style.cssText = "left:-100000px;position:fixed;top:0;width:190mm";
    host.innerHTML = `${styles}${html(a)}`;
    document.body.append(host);
    try {
      const node = host.querySelector(".ack-slip"), canvas = await html2canvas(node, { scale:2, useCORS:true, backgroundColor:"#fff" }), pdf = new window.jspdf.jsPDF({ orientation:"p", unit:"mm", format:"a4" }), width = 190, height = canvas.height * width / canvas.width;
      if (height > 128) throw Error("Final acknowledgement slip exceeds the half-A4 layout.");
      pdf.addImage(canvas.toDataURL("image/jpeg", .95), "JPEG", 10, 10, width, height);
      pdf.save(`Acknowledgement-${a.acknowledgementNo}.pdf`);
    } finally { host.remove(); }
  };

  return { html, styles, print, download, normalize, isFinal: record => String(record?.status || "").toUpperCase() === "SIGNED" };
})();
