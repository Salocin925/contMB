// Carrega as variáveis de ambiente do arquivo .env
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const conectarBanco = require("./config/database");
const Usuario = require("./models/User");

// ─────────────────────────────────────────────
// Inicialização do app Express
// ─────────────────────────────────────────────
const app = express();

// ─────────────────────────────────────────────
// Middlewares globais
// ─────────────────────────────────────────────

// Permite que o frontend (React) faça requisições para esta API
// Em produção, substitua "*" pela URL real do seu frontend
app.use(cors({ origin: "*" }));

// Permite que o Express leia JSON no corpo das requisições
app.use(express.json());

// ─────────────────────────────────────────────
// Rota de verificação (health check)
// Útil para confirmar que a API está no ar
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    sucesso: true,
    mensagem: "API funcionando! 🚀",
    versao: "1.0.0",
  });
});

// ─────────────────────────────────────────────
// Rotas da aplicação
// ─────────────────────────────────────────────
const usuarioRoutes = require("./routes/userRoutes");
app.use("/api/usuarios", usuarioRoutes);

// ─────────────────────────────────────────────
// Tratamento de rota não encontrada (404)
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    mensagem: `Rota "${req.method} ${req.url}" não encontrada.`,
  });
});

// ─────────────────────────────────────────────
// Inicializa o servidor
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

const iniciar = async () => {
  // Primeiro conecta ao banco, depois sobe o servidor
  await conectarBanco();
  await garantirAdministradorInicial();

  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📋 Documentação: http://localhost:${PORT}/api/docs`);
  });
};

const garantirAdministradorInicial = async () => {
  const nome = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_PASSWORD;

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET deve ter pelo menos 32 caracteres.");
  }

  if (!nome || !email || !senha) {
    throw new Error(
      "Configure ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD para inicializar o administrador."
    );
  }

  if (senha.length < 12) {
    throw new Error("ADMIN_PASSWORD deve ter pelo menos 12 caracteres.");
  }

  const existente = await Usuario.findOne({ email });
  if (existente) {
    if (existente.role !== "admin") {
      existente.nome = nome;
      existente.senha = senha;
      existente.role = "admin";
      existente.ativo = true;
      await existente.save();
      console.log(`✅ Conta promovida a administrador: ${email}`);
    }
    return;
  }

  if (await Usuario.exists({ role: "admin" })) {
    return;
  }

  await Usuario.create({ nome, email, senha, role: "admin" });
  console.log(`✅ Administrador inicial criado: ${email}`);
};

iniciar().catch((erro) => {
  console.error("❌ Não foi possível iniciar a API:", erro.message);
  process.exit(1);
});

// Exporta o app para o Vercel poder usar como serverless function
module.exports = app;
