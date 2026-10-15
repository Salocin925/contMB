const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Usuario = require("../models/User");

/**
 * Middleware de Autenticação JWT.
 *
 * Protege rotas que exigem login. Antes de acessar a rota,
 * o usuário precisa enviar um token JWT válido no header:
 *   Authorization: Bearer <token>
 */
const autenticar = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Acesso negado. Faça login para continuar.",
    });
  }

  let payload;
  try {
    const token = authHeader.slice("Bearer ".length);
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (erro) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Token inválido ou expirado. Faça login novamente.",
    });
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !mongoose.isValidObjectId(payload.id)
  ) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Token inválido ou expirado. Faça login novamente.",
    });
  }

  let usuario;
  try {
    usuario = await Usuario.findById(payload.id);
  } catch (erro) {
    console.error("Erro ao validar o usuário autenticado:", erro.message);
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao validar o usuário.",
    });
  }

  if (!usuario || !usuario.ativo) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Usuário não encontrado ou inativo.",
    });
  }

  req.usuario = usuario;
  next();
};

const somenteAdministrador = (req, res, next) => {
  if (req.usuario.role !== "admin") {
    return res.status(403).json({
      sucesso: false,
      mensagem: "Acesso permitido somente para administradores.",
    });
  }

  next();
};

module.exports = { autenticar, somenteAdministrador };
