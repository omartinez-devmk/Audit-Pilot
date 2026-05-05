const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://TU-BACKEND.onrender.com";

const user = JSON.parse(localStorage.getItem("user") || "{}");

if (user.role !== "admin") {
  window.location.href = "./projects.html";
}

const usersTable = document.getElementById("usersTable");

const createUserModal = document.getElementById("createUserModal");
const editRoleModal = document.getElementById("editRoleModal");
const deleteUserModal = document.getElementById("deleteUserModal");

document.getElementById("addUserBtn").addEventListener("click", () => {
  createUserModal.classList.remove("hidden");
});

document.getElementById("closeCreateUserModal").addEventListener("click", () => {
  createUserModal.classList.add("hidden");
});

document.getElementById("closeEditRoleModal").addEventListener("click", () => {
  editRoleModal.classList.add("hidden");
});

document.getElementById("cancelDeleteUser").addEventListener("click", () => {
  deleteUserModal.classList.add("hidden");
});

async function cargarUsuarios() {
  try {
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user.id,
        "x-user-role": user.role,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error cargando usuarios");
    }

    pintarUsuarios(data.users || []);
    pintarResumen(data.users || []);
  } catch (err) {
    console.error(err);
  }
}

function pintarResumen(users) {
  document.getElementById("totalUsers").textContent = users.length;
  document.getElementById("totalAdmins").textContent = users.filter(u => u.role === "admin").length;
  document.getElementById("totalNormal").textContent = users.filter(u => u.role !== "admin").length;
}

function pintarUsuarios(users) {
  usersTable.innerHTML = "";

  users.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-white/5 hover:bg-white/[0.02]";

    tr.innerHTML = `
      <td class="px-6 py-4 text-slate-300">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-teal-400 border border-teal-400/20">
            ${getInitials(item.email)}
          </div>
          <span>${item.email}</span>
        </div>
      </td>

      <td class="px-6 py-4">
        <span class="px-2 py-1 text-xs rounded-full ${getRoleClass(item.role)}">
          ${item.role}
        </span>
      </td>

      <td class="px-6 py-4 text-right">
        <div class="flex justify-end gap-3">
          <button class="edit-role-btn text-amber-400 hover:text-amber-300" title="Editar rol">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>

          <button class="delete-user-btn text-red-400 hover:text-red-300" title="Eliminar usuario">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    `;

    tr.querySelector(".edit-role-btn").addEventListener("click", () => {
      document.getElementById("editUserId").value = item.id;
      document.getElementById("editUserEmail").textContent = item.email;
      document.getElementById("editRole").value = item.role;
      editRoleModal.classList.remove("hidden");
    });

    tr.querySelector(".delete-user-btn").addEventListener("click", () => {
      document.getElementById("deleteUserId").value = item.id;
      document.getElementById("deleteUserEmail").textContent = item.email;
      deleteUserModal.classList.remove("hidden");
    });

    usersTable.appendChild(tr);
  });

  lucide.createIcons();
}

document.getElementById("createUserForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("createEmail").value.trim();
  const password = document.getElementById("createPassword").value.trim();
  const role = document.getElementById("createRole").value;

  try {
    const res = await fetch(`${API_URL}/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user.id,
        "x-user-role": user.role,
      },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error creando usuario");
    }

    e.target.reset();
    createUserModal.classList.add("hidden");
    await cargarUsuarios();
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("editRoleForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const userId = document.getElementById("editUserId").value;
  const role = document.getElementById("editRole").value;

  try {
    const res = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user.id,
        "x-user-role": user.role,
      },
      body: JSON.stringify({ role }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error actualizando usuario");
    }

    editRoleModal.classList.add("hidden");
    await cargarUsuarios();
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("confirmDeleteUser").addEventListener("click", async () => {
  const userId = document.getElementById("deleteUserId").value;

  try {
    const res = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user.id,
        "x-user-role": user.role,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error eliminando usuario");
    }

    deleteUserModal.classList.add("hidden");
    await cargarUsuarios();
  } catch (error) {
    alert(error.message);
  }
});

function getRoleClass(role) {
  if (role === "admin") return "bg-teal-400/10 text-teal-400 border border-teal-400/20";
  if (role === "editor") return "bg-indigo-400/10 text-indigo-400 border border-indigo-400/20";
  return "bg-slate-500/10 text-slate-400 border border-slate-500/20";
}

function getInitials(email = "") {
  return email.slice(0, 2).toUpperCase();
}

cargarUsuarios();
lucide.createIcons();