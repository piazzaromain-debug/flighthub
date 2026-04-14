// spots.js — Liste des spots dans le drawer, formulaire de création et vue détail.
const Spots = (() => {
  function renderList(spots) {
    const ul = document.getElementById("spot-list");
    ul.innerHTML = "";
    spots.forEach(s => {
      const li = document.createElement("li");
      const scoreClass = s.score > 0 ? "pos" : s.score < 0 ? "neg" : "";
      li.innerHTML = `
        <div class="spot-title">${escapeHtml(s.title)} <span class="spot-score ${scoreClass}">${s.score > 0 ? "+" : ""}${s.score}</span></div>
        <div class="spot-meta">${escapeHtml(s.category)} · ${escapeHtml(s.city)}, ${escapeHtml(s.country)}</div>
      `;
      li.addEventListener("click", () => {
        MapView.focusOn(s.lat, s.lng, 15);
        location.hash = `#spot/${s.id}`;
      });
      ul.appendChild(li);
    });
  }

  function applyFilters() {
    const filters = {};
    const c = document.getElementById("filter-country").value.trim();
    const ci = document.getElementById("filter-city").value.trim();
    const cat = document.getElementById("filter-category").value;
    if (c) filters.country = c;
    if (ci) filters.city = ci;
    if (cat) filters.category = cat;
    MapView.loadSpots(filters);
  }

  function openCreateModal() {
    const modal = document.getElementById("modal");
    const body = document.getElementById("modal-body");
    body.innerHTML = `
      <h3>Nouveau spot</h3>
      <form id="spot-form">
        <label>Titre<input id="s-title" required maxlength="255"></label>
        <label>Catégorie
          <select id="s-category" required>
            <option value="restaurant">Restaurant</option>
            <option value="hotel">Hôtel</option>
            <option value="activite">Activité</option>
            <option value="transport">Transport</option>
            <option value="info_locale">Info locale</option>
            <option value="danger">Danger</option>
            <option value="astuce">Astuce</option>
          </select>
        </label>
        <label>Pays<input id="s-country" required></label>
        <label>Ville<input id="s-city" required></label>
        <label>Description<textarea id="s-desc" rows="3"></textarea></label>
        <label>Position
          <button type="button" id="s-pick">📍 Choisir sur la carte</button>
          <span id="s-coords" style="margin-left:0.5rem;color:#8a7a66;font-size:0.85rem;"></span>
        </label>
        <p class="error" id="s-error"></p>
        <button type="submit" class="btn-primary">Créer</button>
      </form>
    `;
    modal.hidden = false;
    let lat = null, lng = null;
    document.getElementById("s-pick").addEventListener("click", () => {
      modal.hidden = true;
      MapView.pickPoint((ll) => {
        lat = ll.lat; lng = ll.lng;
        document.getElementById("s-coords").textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        modal.hidden = false;
      });
    });
    document.getElementById("spot-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (lat === null) {
        document.getElementById("s-error").textContent = "Position requise";
        return;
      }
      try {
        await API.post("/spots", {
          title: document.getElementById("s-title").value,
          description: document.getElementById("s-desc").value,
          category: document.getElementById("s-category").value,
          country: document.getElementById("s-country").value,
          city: document.getElementById("s-city").value,
          lat, lng,
        });
        modal.hidden = true;
        toast("Spot créé !");
        MapView.loadSpots();
      } catch (err) {
        document.getElementById("s-error").textContent = err.message;
      }
    });
  }

  async function showDetail(id) {
    const container = document.getElementById("spot-detail");
    container.innerHTML = "Chargement…";
    try {
      const s = await API.get(`/spots/${id}`);
      const user = API.getUser();
      const canEdit = user && (user.role === "admin" || user.id === s.author_id);
      container.innerHTML = `
        <h2>${escapeHtml(s.title)}</h2>
        <p><strong>${escapeHtml(s.category)}</strong> · ${escapeHtml(s.city)}, ${escapeHtml(s.country)}</p>
        <p>${escapeHtml(s.description || "")}</p>
        <p>Score : <span id="detail-score">${s.score}</span>
           <span class="vote-btns">
             <button data-v="1" id="vote-up">👍 +1</button>
             <button data-v="-1" id="vote-down">👎 -1</button>
           </span>
        </p>
        <p><small>Position : ${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}</small></p>
        ${canEdit ? `<button id="delete-spot" style="background:#c44;color:white;border:none;padding:0.5rem 1rem;border-radius:4px;cursor:pointer;">Supprimer</button>` : ""}
      `;
      Votes.bind(id);
      if (canEdit) {
        document.getElementById("delete-spot").addEventListener("click", async () => {
          if (!confirm("Supprimer ce spot ?")) return;
          await API.del(`/spots/${id}`);
          toast("Spot supprimé");
          location.hash = "#map";
        });
      }
    } catch (err) {
      container.innerHTML = `<p class="error">${err.message}</p>`;
    }
  }

  function escapeHtml(s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function init() {
    document.getElementById("filter-apply").addEventListener("click", applyFilters);
    document.getElementById("btn-new-spot").addEventListener("click", () => {
      if (!API.getToken()) { location.hash = "#login"; return; }
      openCreateModal();
    });
    document.getElementById("modal-close").addEventListener("click", () => {
      document.getElementById("modal").hidden = true;
    });
    document.getElementById("drawer-toggle").addEventListener("click", () => {
      document.getElementById("drawer").classList.toggle("collapsed");
    });
  }

  return { init, renderList, showDetail, openCreateModal, escapeHtml };
})();
