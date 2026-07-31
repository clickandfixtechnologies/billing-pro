"use strict";
window.CF = window.CF || {};
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("todayDate").textContent = new Intl.DateTimeFormat("en-IN", { dateStyle:"full" }).format(new Date());
  document.getElementById("menuButton").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
  document.getElementById("syncButton").addEventListener("click", () => location.hash = "#settings");
  window.addEventListener("hashchange", CF.router.render);
  try { await CF.db.open(); await CF.sync.init(); await CF.db.log("Application opened", "system"); await CF.router.render(); }
  catch(error) { console.error(error); document.getElementById("view").innerHTML = '<article class="card"><h2>Database unavailable</h2><p>Please allow browser storage and reload the application.</p></article>'; CF.toast("Could not open local database.", "error"); }
});
