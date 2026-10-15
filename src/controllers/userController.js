const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Usuario = require("../models/User");
const { enviarEmailRedefinicao } = require("../utils/email");

// ─────────────────────────────────────────────
// Função auxiliar: gera um token JWT para o usuário
// ─────────────────────────────────────────────
const gerarToken = (id) => {
  return jwt.sign(
    { id }, // payload: dados que ficam "dentro" do token
    process.env.JWT_SECRET, // chave secreta para assinar
    { expiresIn: process.env.JWT_EXPIRES_IN } // tempo de validade
  );
};

// ─────────────────────────────────────────────
// POST /api/usuarios/cadastrar
// Cria um novo usuário no banco de dados
// ─────────────────────────────────────────────
const cadastrar = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    // Validação básica dos campos obrigatórios
    if (
      typeof nome !== "string" ||
      !nome.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof senha !== "string" ||
      senha.length < 6
    ) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          "Nome e e-mail são obrigatórios; a senha deve ter pelo menos 6 caracteres.",
      });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const emailJaCadastrado = await Usuario.findOne({
      email: emailNormalizado,
    });
    if (emailJaCadastrado) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Este e-mail já está cadastrado.",
      });
    }

    // O papel enviado pelo cliente nunca é aceito; novos registros são usuários.
    const usuario = await Usuario.create({
      nome: nome.trim(),
      email: emailNormalizado,
      senha,
      role: "user",
    });

    return res.status(201).json({
      sucesso: true,
      mensagem: "Usuário cadastrado com sucesso!",
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
      },
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: erro.message,
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/usuarios/login
// Autentica o usuário e retorna um token JWT
// ─────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof senha !== "string" ||
      !senha
    ) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "E-mail e senha são obrigatórios.",
      });
    }

    // Busca o usuário pelo e-mail E inclui o campo senha (que é select: false no Model)
    const usuario = await Usuario.findOne({
      email: email.trim().toLowerCase(),
      ativo: true,
      role: "admin",
    }).select("+senha");

    // Verifica se o usuário existe E se a senha está correta
    // (verificamos os dois juntos por segurança, para não revelar qual está errado)
    if (!usuario || !(await usuario.senhaCorreta(senha))) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "E-mail ou senha inválidos.",
      });
    }

    const token = gerarToken(usuario._id);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Login realizado com sucesso!",
      token,
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
      },
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: erro.message,
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/usuarios/perfil
// Retorna os dados do usuário logado (rota protegida)
// ─────────────────────────────────────────────
const perfil = async (req, res) => {
  // req.usuario é preenchido pelo middleware de autenticação
  const usuario = req.usuario;

  return res.status(200).json({
    sucesso: true,
    usuario: {
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      criadoEm: usuario.createdAt,
    },
  });
};

// ─────────────────────────────────────────────
// GET /api/usuarios
// Lista todos os usuários (rota administrativa)
// ─────────────────────────────────────────────
const listar = async (req, res) => {
  try {
    const usuarios = await Usuario.find().sort({ createdAt: -1 });

    return res.status(200).json({
      sucesso: true,
      total: usuarios.length,
      usuarios: usuarios.map((u) => ({
        id: u._id,
        nome: u.nome,
        email: u.email,
        role: u.role,
        ativo: u.ativo,
        criadoEm: u.createdAt,
      })),
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: erro.message,
    });
  }
};


// ─────────────────────────────────────────────
// PUT /api/usuarios/:id
// Atualiza nome e/ou e-mail de um usuário
// ─────────────────────────────────────────────
const editar = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID de usuário inválido.",
      });
    }

    const { nome, email } = req.body;

    // Monta apenas os campos que foram enviados
    const dadosAtualizados = {};
    if (nome !== undefined) {
      if (typeof nome !== "string" || !nome.trim()) {
        return res.status(400).json({
          sucesso: false,
          mensagem: "O nome deve ser um texto não vazio.",
        });
      }
      dadosAtualizados.nome = nome.trim();
    }
    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          sucesso: false,
          mensagem: "O e-mail deve ser um texto não vazio.",
        });
      }
      dadosAtualizados.email = email.trim().toLowerCase();
    }

    if (Object.keys(dadosAtualizados).length === 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe ao menos um campo para atualizar (nome ou e-mail).",
      });
    }

    // Verifica se o novo e-mail já pertence a outro usuário
    if (dadosAtualizados.email) {
      const emailEmUso = await Usuario.findOne({
        email: dadosAtualizados.email,
        _id: { $ne: req.params.id },
      });
      if (emailEmUso) {
        return res.status(400).json({
          sucesso: false,
          mensagem: "Este e-mail já está em uso por outro usuário.",
        });
      }
    }

    // Atualiza o usuário selecionado pelo administrador.
    const usuarioAtualizado = await Usuario.findByIdAndUpdate(
      req.params.id,
      dadosAtualizados,
      { new: true, runValidators: true } // new: true → retorna o doc atualizado
    );

    if (!usuarioAtualizado) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Usuário não encontrado.",
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: "Dados atualizados com sucesso!",
      usuario: {
        id: usuarioAtualizado._id,
        nome: usuarioAtualizado.nome,
        email: usuarioAtualizado.email,
        role: usuarioAtualizado.role,
      },
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: erro.message,
    });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/usuarios/:id
// Desativa um usuário (soft delete)
// O registro permanece no banco, apenas ativo=false
// ─────────────────────────────────────────────
const desativar = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID de usuário inválido.",
      });
    }

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Usuário não encontrado.",
      });
    }

    if (usuario.role === "admin") {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Contas de administrador não podem ser desativadas por esta rota.",
      });
    }

    usuario.ativo = false;
    await usuario.save();

    return res.status(200).json({
      sucesso: true,
      mensagem: "Conta desativada com sucesso.",
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: erro.message,
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/usuarios/esqueci-senha
// Envia e-mail com link para redefinir a senha
// ─────────────────────────────────────────────
const esqueciSenha = async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe o e-mail cadastrado.",
      });
    }

    const usuario = await Usuario.findOne({
      email: email.trim().toLowerCase(),
      ativo: true,
      role: "admin",
    });

    // Por segurança, retornamos a mesma mensagem mesmo se o e-mail não existir
    // (para não revelar quais e-mails estão cadastrados no sistema)
    if (!usuario) {
      return res.status(200).json({
        sucesso: true,
        mensagem:
          "Se este e-mail estiver cadastrado, você receberá as instruções em breve.",
      });
    }

    // Gera um token aleatório seguro (32 bytes em hexadecimal = 64 caracteres)
    const token = crypto.randomBytes(32).toString("hex");

    // Salva o token e define expiração de 1 hora a partir de agora
    usuario.tokenRedefinicaoSenha = token;
    usuario.tokenRedefinicaoExpira = new Date(Date.now() + 60 * 60 * 1000); // +1 hora
    await usuario.save({ validateBeforeSave: false });

    // Envia o e-mail com o link de redefinição
    await enviarEmailRedefinicao(usuario.email, usuario.nome, token);

    return res.status(200).json({
      sucesso: true,
      mensagem:
        "Se este e-mail estiver cadastrado, você receberá as instruções em breve.",
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao enviar e-mail. Tente novamente.",
      erro: erro.message,
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/usuarios/redefinir-senha
// Redefine a senha usando o token recebido por e-mail
// ─────────────────────────────────────────────
const redefinirSenha = async (req, res) => {
  try {
    const { token, novaSenha } = req.body;

    if (
      typeof token !== "string" ||
      !token ||
      typeof novaSenha !== "string" ||
      novaSenha.length < 12
    ) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          "Token e nova senha de pelo menos 12 caracteres são obrigatórios.",
      });
    }

    // Busca o usuário pelo token E verifica se ainda não expirou
    const usuario = await Usuario.findOne({
      tokenRedefinicaoSenha: token,
      tokenRedefinicaoExpira: { $gt: Date.now() }, // $gt = "greater than" (maior que agora)
      role: "admin",
    }).select("+tokenRedefinicaoSenha +tokenRedefinicaoExpira +senha");

    if (!usuario) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Token inválido ou expirado. Solicite um novo link.",
      });
    }

    // Atualiza a senha e limpa os campos de token
    usuario.senha = novaSenha;
    usuario.tokenRedefinicaoSenha = undefined;
    usuario.tokenRedefinicaoExpira = undefined;
    await usuario.save(); // o pre-save vai fazer o hash da nova senha automaticamente

    // Gera um novo token JWT para o usuário já ficar logado
    const jwtToken = gerarToken(usuario._id);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Senha redefinida com sucesso!",
      token: jwtToken,
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: erro.message,
    });
  }
};

module.exports = {
  cadastrar,
  login,
  perfil,
  listar, // novo
  editar,
  desativar,
  esqueciSenha,
  redefinirSenha,
};