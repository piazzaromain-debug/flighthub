// auth.js — Gestion des formulaires login / register et mise à jour de l'UI selon le rôle.
const Auth = (() => {
  let mode = "login";

  function render(m) {
    mode = m;
    document.getElementById("auth-title").textContent = mode === "login" ? "Connexion" : "Créer un compte";
    document.getElementById("auth-username").hidden = mode === "login";
    document.getElementById("auth-username").required = mode === "register";
    document.getElementById("auth-submit").textContent = mode === "login" ? "Se connecter" : "Créer le compte";
    document.getElementById("auth-toggle").innerHTML = mode === "login"
      ? '<a href="#register">Créer un compte</a>'
      : '<a href="#login">J\'ai déjà un compte</a>';
    document.getElementById("auth-error").textContent = "";
  }

  async function submit(e) {
    e.preventDefault();
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;
    const username = document.getElementById("auth-username").value;
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login" ? { email, password } : { email, password, username };
      const data = await API.post(path, body);
      API.setToken(data.access_token);
      API.setUser(data.user);
      updateNav();
      location.hash = "#map";
      toast(`Bienvenue ${data.user.username} !`);
    } catch (err) {
      document.getElementById("auth-error").textContent = err.message;
    }
  }

  function updateNav() {
    const user = API.getUser();
    const roleHierarchy = { lecteur: 1, contributeur: 2, admin: 3 };
    const myLevel = user ? roleHierarchy[user.role] || 0 : 0;
    document.querySelectorAll("[data-role]").forEach(el => {
      const needed = roleHierarchy[el.dataset.role] || 99;
      el.hidden = myLevel < needed;
    });
    document.getElementById("user-info").textContent = user ? `${user.username} (${user.role})` : "";
    document.getElementById("login-link").hidden = !!user;
    document.getElementById("logout-link").hidden = !user;
  }

  function logout() {
    API.clearAuth();
    updateNav();
    location.hash = "#login";
  }

  function init() {
    document.getElementById("auth-form").addEventListener("submit", submit);
    document.getElementById("logout-link").addEventListener("click", (e) => { e.preventDefault(); logout(); });
    updateNav();
  }

  return { render, init, updateNav, logout };
})();
