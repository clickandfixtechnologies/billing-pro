"use strict";
window.CF = window.CF || {};
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("todayDate").textContent = new Intl.DateTimeFormat("en-IN", { dateStyle:"full" }).format(new Date());
  const sidebar=document.querySelector(".sidebar"),backdrop=document.getElementById("sidebarBackdrop"),menuButton=document.getElementById("menuButton"),setSidebarOpen=open=>{const mobile=window.matchMedia("(max-width:720px)").matches,isOpen=mobile&&open;sidebar.classList.toggle("open",isOpen);backdrop.classList.toggle("open",isOpen);backdrop.setAttribute("aria-hidden",String(!isOpen));menuButton.setAttribute("aria-expanded",String(isOpen));};
  CF.sidebar={open:()=>setSidebarOpen(true),close:()=>setSidebarOpen(false),toggle:()=>setSidebarOpen(!sidebar.classList.contains("open"))};
  menuButton.addEventListener("click",CF.sidebar.toggle);
  backdrop.addEventListener("click",CF.sidebar.close);
  document.getElementById("syncButton").addEventListener("click", () => location.hash = "#settings");
  window.addEventListener("hashchange", CF.router.render);
  try { await CF.db.open(); await CF.emailTemplates.migrate(); await CF.emailTemplates.seedStarters(); await CF.sync.init(); await CF.db.log("Application opened", "system"); await CF.router.render(); }
  catch(error) { console.error(error); document.getElementById("view").innerHTML = '<article class="card"><h2>Database unavailable</h2><p>Please allow browser storage and reload the application.</p></article>'; CF.toast("Could not open local database.", "error"); }
});
