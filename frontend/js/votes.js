// votes.js — Boutons upvote / downvote avec mise à jour en temps réel.
const Votes = (() => {
  function bind(spotId) {
    ["vote-up", "vote-down"].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener("click", async () => {
        if (!API.getToken()) { location.hash = "#login"; return; }
        try {
          const r = await API.post(`/spots/${spotId}/vote`, { value: parseInt(btn.dataset.v) });
          document.getElementById("detail-score").textContent = r.score;
          document.getElementById("vote-up").classList.toggle("active", r.user_vote === 1);
          document.getElementById("vote-down").classList.toggle("active", r.user_vote === -1);
          toast("Vote enregistré");
          MapView.loadSpots();
        } catch (err) {
          toast(err.message);
        }
      });
    });
  }
  return { bind };
})();
