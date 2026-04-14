// app.js — Routeur hash-based : aiguille vers les vues login, register, map, spot, admin, presence.
(function () {
  const views = {
    map: "view-map",
    auth: "view-auth",
    admin: "view-admin",
    spot: "view-spot",
  };

  function show(viewId) {
    Object.values(views).forEach(id => {
      document.getElementById(id).hidden = id !== viewId;
    });
  }

  function route() {
    const hash = location.hash || "#map";
    const user = API.getUser();

    if (hash === "#login") { Auth.render("login"); show("view-auth"); return; }
    if (hash === "#register") { Auth.render("register"); show("view-auth"); return; }
    if (hash === "#admin") {
      if (!user || user.role !== "admin") { location.hash = "#login"; return; }
      show("view-admin"); Admin.render(); return;
    }
    if (hash === "#presence") {
      if (!user) { location.hash = "#login"; return; }
      show("view-map");
      setTimeout(() => { MapView.init(); Presences.openModal(); }, 50);
      return;
    }
    if (hash.startsWith("#spot/")) {
      const id = hash.split("/")[1];
      show("view-spot"); Spots.showDetail(id); return;
    }
    // default : map
    show("view-map");
    setTimeout(() => {
      MapView.init();
      setTimeout(() => { if (window.MapView) { /* already initialised */ } }, 0);
    }, 0);
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("DOMContentLoaded", () => {
    Auth.init();
    Spots.init();
    route();
    // Tente de rafraîchir l'utilisateur si token présent
    if (API.getToken()) {
      API.get("/auth/me").then(u => { API.setUser(u); Auth.updateNav(); }).catch(() => {});
    }
  });
})();
