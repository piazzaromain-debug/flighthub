// presences.js — Formulaire "Je suis là" avec sélection de point sur la carte.
const Presences = (() => {
  function openModal() {
    const modal = document.getElementById("modal");
    const body = document.getElementById("modal-body");
    const now = new Date();
    const later = new Date(now.getTime() + 3 * 3600 * 1000);
    body.innerHTML = `
      <h3>Je suis là 👋</h3>
      <form id="presence-form">
        <label>Message<input id="p-msg" maxlength="500" placeholder="Dispo pour un café !"></label>
        <label>Début<input id="p-start" type="datetime-local" value="${toLocal(now)}" required></label>
        <label>Fin<input id="p-end" type="datetime-local" value="${toLocal(later)}" required></label>
        <label>Position
          <button type="button" id="p-pick">📍 Choisir sur la carte</button>
          <span id="p-coords" style="margin-left:0.5rem;color:#8a7a66;font-size:0.85rem;"></span>
        </label>
        <p class="error" id="p-error"></p>
        <button type="submit" class="btn-primary">Valider</button>
      </form>
    `;
    modal.hidden = false;
    let lat = null, lng = null;
    document.getElementById("p-pick").addEventListener("click", () => {
      modal.hidden = true;
      MapView.pickPoint((ll) => {
        lat = ll.lat; lng = ll.lng;
        document.getElementById("p-coords").textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        modal.hidden = false;
      });
    });
    document.getElementById("presence-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (lat === null) { document.getElementById("p-error").textContent = "Position requise"; return; }
      try {
        await API.post("/presences", {
          lat, lng,
          message: document.getElementById("p-msg").value,
          starts_at: new Date(document.getElementById("p-start").value).toISOString(),
          ends_at: new Date(document.getElementById("p-end").value).toISOString(),
        });
        modal.hidden = true;
        toast("Présence enregistrée !");
        MapView.loadPresences();
      } catch (err) {
        document.getElementById("p-error").textContent = err.message;
      }
    });
  }

  function toLocal(d) {
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  return { openModal };
})();
