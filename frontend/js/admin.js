// admin.js — Panel admin : liste utilisateurs, changement de rôle, suppression.
const Admin = (() => {
  async function render() {
    const tbody = document.querySelector("#users-table tbody");
    tbody.innerHTML = "<tr><td colspan='5'>Chargement…</td></tr>";
    try {
      const users = await API.get("/admin/users");
      tbody.innerHTML = "";
      users.forEach(u => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${u.id}</td>
          <td>${Spots.escapeHtml(u.email)}</td>
          <td>${Spots.escapeHtml(u.username)}</td>
          <td>
            <select data-uid="${u.id}" class="role-select">
              <option value="lecteur" ${u.role==='lecteur'?'selected':''}>lecteur</option>
              <option value="contributeur" ${u.role==='contributeur'?'selected':''}>contributeur</option>
              <option value="admin" ${u.role==='admin'?'selected':''}>admin</option>
            </select>
          </td>
          <td><button data-uid="${u.id}" class="del-user" style="background:#c44;color:white;border:none;padding:0.3rem 0.6rem;border-radius:4px;cursor:pointer;">Supprimer</button></td>
        `;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll(".role-select").forEach(sel => {
        sel.addEventListener("change", async (e) => {
          try {
            await API.put(`/admin/users/${sel.dataset.uid}/role`, { role: sel.value });
            toast("Rôle mis à jour");
          } catch (err) { toast(err.message); }
        });
      });
      tbody.querySelectorAll(".del-user").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (!confirm("Supprimer cet utilisateur ?")) return;
          try {
            await API.del(`/admin/users/${btn.dataset.uid}`);
            toast("Utilisateur supprimé");
            render();
          } catch (err) { toast(err.message); }
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan='5' class='error'>${err.message}</td></tr>`;
    }
  }
  return { render };
})();
