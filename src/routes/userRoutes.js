const express = require("express");
const router = express.Router();

const {
  cadastrar,
  login,
  perfil,
  listar,
  editar,
  desativar,
  esqueciSenha,
  redefinirSenha,
} = require("../controllers/userController");
const {
  autenticar,
  somenteAdministrador,
} = require("../middleware/auth");

router.post("/login", login);
router.post("/esqueci-senha", esqueciSenha);
router.post("/redefinir-senha", redefinirSenha);

router.use(autenticar, somenteAdministrador);

router.post("/cadastrar", cadastrar);
router.get("/", listar);
router.get("/perfil", perfil);
router.put("/:id", editar);
router.delete("/:id", desativar);

module.exports = router;
