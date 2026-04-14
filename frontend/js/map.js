// map.js — Initialisation de la carte Leaflet, chargement des spots et présences.
const MapView = (() => {
  let map, spotLayer, presenceLayer;
  let pickMode = false;
  let pickCallback = null;

  const categoryIcons = {
    restaurant: "🍽️", hotel: "🏨", activite: "🎯",
    transport: "🚆", info_locale: "ℹ️", danger: "⚠️", astuce: "💡",
  };

  function init() {
    if (map) return;
    map = L.map("map").setView([48.8566, 2.3522], 3);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    spotLayer = L.layerGroup().addTo(map);
    presenceLayer = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      if (pickMode && pickCallback) {
        pickCallback(e.latlng);
        pickMode = false;
        pickCallback = null;
        document.body.style.cursor = "";
      }
    });

    loadSpots();
    loadPresences();
  }

  function markerFor(spot) {
    const emoji = categoryIcons[spot.category] || "📍";
    const color = spot.score > 0 ? "#4a9d5f" : spot.score < 0 ? "#c44" : "#1f3a5f";
    const html = `<div style="background:${color};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.3);">${emoji}</div>`;
    return L.divIcon({ html, className: "spot-marker", iconSize: [32, 32], iconAnchor: [16, 16] });
  }

  async function loadSpots(filters = {}) {
    try {
      const qs = new URLSearchParams(filters).toString();
      const spots = await API.get("/spots" + (qs ? "?" + qs : ""));
      spotLayer.clearLayers();
      Spots.renderList(spots);
      spots.forEach(s => {
        const m = L.marker([s.lat, s.lng], { icon: markerFor(s) })
          .bindPopup(`<b>${s.title}</b><br>${s.category} · score: ${s.score}<br><a href="#spot/${s.id}">Voir détail</a>`);
        spotLayer.addLayer(m);
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function loadPresences() {
    try {
      const center = map.getCenter();
      const ps = await API.get(`/presences/active?lat=${center.lat}&lng=${center.lng}&radius=500000`);
      presenceLayer.clearLayers();
      ps.forEach(p => {
        const icon = L.divIcon({
          html: `<div class="presence-pulse" title="${p.username}: ${p.message || ''}"></div>`,
          className: "", iconSize: [20, 20],
        });
        const m = L.marker([p.lat, p.lng], { icon })
          .bindPopup(`<b>${p.username}</b><br>${p.message || "(pas de message)"}<br>Jusqu'au ${new Date(p.ends_at).toLocaleString()}`);
        presenceLayer.addLayer(m);
      });
    } catch (err) {
      console.error(err);
    }
  }

  function pickPoint(cb) {
    pickMode = true; pickCallback = cb;
    document.body.style.cursor = "crosshair";
    toast("Clique sur la carte pour choisir le point");
  }

  function focusOn(lat, lng, zoom = 15) {
    if (map) map.setView([lat, lng], zoom);
  }

  return { init, loadSpots, loadPresences, pickPoint, focusOn };
})();
