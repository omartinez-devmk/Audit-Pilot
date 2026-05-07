const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../models/db");

const router = express.Router();

function isAdmin(req) {
  return req.headers["x-user-role"] === "admin";
}

async function contarAdmins() {
  const result = await pool.query(
    "select count(*)::int as total from users where role = 'admin'"
  );

  return result.rows[0].total;
}

router.get("/users", async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Acceso no autorizado" });
    }

    const result = await pool.query(
      `select id, email, role, created_at
       from users
       order by created_at desc`
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
});

router.post("/users", async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Acceso no autorizado" });
    }

    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    const existing = await pool.query(
      "select id from users where email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "El usuario ya existe" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const validRoles = ["admin", "editor"];
    const userRole = validRoles.includes(role) ? role : "editor";

    const result = await pool.query(
      `insert into users (email, password_hash, role)
       values ($1, $2, $3)
       returning id, email, role, created_at`,
      [email, passwordHash, userRole]
    );

    res.status(201).json({
      message: "Usuario creado correctamente",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error creando usuario:", error);
    res.status(500).json({ error: "Error creando usuario" });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Acceso no autorizado" });
    }

    const userId = req.params.id;
    const { role } = req.body;

    if (!["admin", "editor"].includes(role)) {
      return res.status(400).json({ error: "Rol no válido" });
    }

    const currentUserResult = await pool.query(
      "select id, role from users where id = $1",
      [userId]
    );

    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const currentUser = currentUserResult.rows[0];

    if (currentUser.role === "admin" && role !== "admin") {
      const totalAdmins = await contarAdmins();

      if (totalAdmins <= 1) {
        return res.status(400).json({
          error: "Debe existir al menos un administrador",
        });
      }
    }

    const result = await pool.query(
      `update users
       set role = $1
       where id = $2
       returning id, email, role, created_at`,
      [role, userId]
    );

    res.json({
      message: "Usuario actualizado correctamente",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    res.status(500).json({ error: "Error actualizando usuario" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Acceso no autorizado" });
    }

    const userId = req.params.id;
    const currentUserId = req.headers["x-user-id"];

    if (userId === currentUserId) {
      return res.status(400).json({
        error: "No puedes eliminar tu propio usuario",
      });
    }

    const userToDeleteResult = await pool.query(
      "select id, role from users where id = $1",
      [userId]
    );

    if (userToDeleteResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const userToDelete = userToDeleteResult.rows[0];

    if (userToDelete.role === "admin") {
      const totalAdmins = await contarAdmins();

      if (totalAdmins <= 1) {
        return res.status(400).json({
          error: "No puedes eliminar el último administrador",
        });
      }
    }

    const result = await pool.query(
      `delete from users
       where id = $1
       returning id`,
      [userId]
    );

    res.json({
      message: "Usuario eliminado correctamente",
      userId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Error eliminando usuario:", error);
    res.status(500).json({ error: "Error eliminando usuario" });
  }
});

module.exports = router;