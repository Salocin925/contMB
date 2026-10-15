# Backend API — Curso Técnico em Informática

API RESTful educacional construída com **Node.js**, **Express** e **MongoDB Atlas**.  
Autenticação com **JWT**. Deploy na **Vercel**.

---

## Sumário

1. [Tecnologias utilizadas](#tecnologias-utilizadas)
2. [Estrutura de pastas](#estrutura-de-pastas)
3. [Pré-requisitos](#pré-requisitos)
4. [Configuração do ambiente](#configuração-do-ambiente)
5. [Como rodar localmente](#como-rodar-localmente)
6. [Rotas da API](#rotas-da-api)
7. [Como fazer Deploy na Vercel](#como-fazer-deploy-na-vercel)
8. [Conceitos abordados](#conceitos-abordados)

---

## Tecnologias utilizadas

| Tecnologia   | Para que serve                              |
|--------------|---------------------------------------------|
| Node.js      | Ambiente de execução do JavaScript          |
| Express      | Framework para criar o servidor e as rotas  |
| MongoDB Atlas| Banco de dados na nuvem (NoSQL)             |
| Mongoose     | Biblioteca para modelar os dados do MongoDB |
| JWT          | Autenticação stateless via token            |
| bcryptjs     | Criptografia de senhas                      |
| Nodemailer   | Envio de e-mails (recuperação de senha)     |
| dotenv       | Leitura de variáveis de ambiente            |
| CORS         | Permite requisições do frontend             |

---

## Estrutura de pastas

```
backend/
├── src/
│   ├── config/
│   │   └── database.js       # Conexão com o MongoDB Atlas
│   ├── controllers/
│   │   └── userController.js # Lógica de cada endpoint
│   ├── middleware/
│   │   └── auth.js           # Verificação do token JWT
│   ├── models/
│   │   └── User.js           # Schema/modelo do usuário
│   ├── routes/
│   │   └── userRoutes.js     # Definição das rotas
│   ├── utils/
│   │   └── email.js          # Envio de e-mail
│   └── app.js                # Ponto de entrada da aplicação
├── .env.example              # Modelo das variáveis de ambiente
├── .gitignore
├── package.json
├── vercel.json               # Configuração para deploy na Vercel
└── README.md
```

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) versão 18 ou superior
- Conta no [MongoDB Atlas](https://cloud.mongodb.com/) (gratuita)
- Conta na [Vercel](https://vercel.com/) (gratuita)
- Conta de e-mail para envio (Gmail recomendado)

---

## Configuração do ambiente

### 1. Clone o repositório e entre na pasta do backend

```bash
git clone <url-do-repositorio>
cd backend
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha com seus dados:

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Abra o arquivo `.env` e preencha cada variável:

Se você já tiver um `.env`, preserve os valores existentes e acrescente as
variáveis `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

```env
MONGODB_URI=mongodb+srv://...    # URL do MongoDB Atlas
JWT_SECRET=<chave-aleatoria-longa>
JWT_EXPIRES_IN=7d
PORT=3001
ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@exemplo.com
ADMIN_PASSWORD=<senha-com-pelo-menos-12-caracteres>
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seuemail@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx   # Senha de app do Gmail
FRONTEND_URL=http://localhost:5173
```

### 4. Configurando o MongoDB Atlas

1. Acesse [cloud.mongodb.com](https://cloud.mongodb.com/) e crie uma conta
2. Crie um **Cluster gratuito** (M0)
3. Em **Database Access**: crie um usuário com senha
4. Em **Network Access**: adicione `0.0.0.0/0` (permite acesso de qualquer IP)
5. Em **Connect → Drivers**: copie a string de conexão e cole no `.env`

### 5. Configurando o Gmail para envio de e-mails

1. Ative a **verificação em duas etapas** na sua conta Google
2. Acesse: Conta Google → Segurança → **Senhas de app**
3. Gere uma senha de app para "Email" → "Outro (nome personalizado)"
4. Use essa senha de 16 dígitos no campo `EMAIL_PASS` do `.env`

---

## Como rodar localmente

```bash
npm run dev
```

O servidor estará disponível em: `http://localhost:3001`

Teste se está funcionando acessando `http://localhost:3001` no navegador.

---

## Rotas da API

Base URL local: `http://localhost:3001`  
Base URL produção: `https://sua-api.vercel.app`

### Rotas públicas

| Método | Rota                              | Descrição                         |
|--------|-----------------------------------|-----------------------------------|
| POST   | `/api/usuarios/login`             | Autentica o administrador         |
| POST   | `/api/usuarios/esqueci-senha`     | Solicita recuperação do administrador |
| POST   | `/api/usuarios/redefinir-senha`   | Redefine senha com token por e-mail |

### Rotas administrativas (JWT de administrador obrigatório)

| Método | Rota                              | Descrição                         |
|--------|-----------------------------------|-----------------------------------|
| POST   | `/api/usuarios/cadastrar`         | Cadastra um usuário no banco      |
| GET    | `/api/usuarios`                   | Lista todos os usuários           |
| GET    | `/api/usuarios/perfil`            | Retorna o perfil do administrador |
| PUT    | `/api/usuarios/:id`               | Atualiza nome e/ou e-mail         |
| DELETE | `/api/usuarios/:id`               | Desativa um usuário (soft delete) |

O primeiro administrador é criado no primeiro início da API usando `ADMIN_NAME`,
`ADMIN_EMAIL` e `ADMIN_PASSWORD`. A senha deve ter pelo menos 12 caracteres e
`JWT_SECRET`, pelo menos 32. Se `ADMIN_EMAIL` já existir no banco como usuário,
essa conta será promovida a administrador e receberá a senha configurada.
Novos cadastros sempre recebem o papel `user`; não existe cadastro público nem
promoção de usuários a administrador pela API. As rotas de recuperação só aceitam
contas com papel `admin`.

### Como enviar o token nas rotas administrativas

Envie o JWT recebido no login no header `Authorization` no formato
`Bearer <token>`:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Exemplos de corpo (body) das requisições

#### Cadastrar (administrador autenticado)
```json
POST /api/usuarios/cadastrar
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "senha": "senha123"
}
```

#### Login
```json
POST /api/usuarios/login
{
  "email": "joao@email.com",
  "senha": "senha123"
}
```

#### Editar um usuário (administrador autenticado)
```json
PUT /api/usuarios/ID_DO_USUARIO
{
  "nome": "João Santos"
}
```

#### Esqueci a senha
```json
POST /api/usuarios/esqueci-senha
{
  "email": "joao@email.com"
}
```

#### Redefinir senha
```json
POST /api/usuarios/redefinir-senha
{
  "token": "abc123...",
  "novaSenha": "novaSenha456"
}
```

---

## Como fazer Deploy na Vercel

### 1. Instale a CLI da Vercel (opcional, mas facilita)

```bash
npm install -g vercel
```

### 2. Faça login

```bash
vercel login
```

### 3. Publique o projeto

Dentro da pasta `backend`:

```bash
vercel
```

Siga as instruções no terminal. Na primeira vez, ele vai criar o projeto.

### 4. Configure as variáveis de ambiente na Vercel

No painel da Vercel ([vercel.com/dashboard](https://vercel.com/dashboard)):

1. Acesse seu projeto → **Settings** → **Environment Variables**
2. Adicione todas as variáveis do seu `.env` (uma por uma)
3. Clique em **Save**
4. Vá em **Deployments** → clique nos três pontos → **Redeploy**

> ⚠️ **Importante:** Nunca suba o arquivo `.env` para o GitHub. Ele já está no `.gitignore`.

---

## Conceitos abordados

### REST API
Arquitetura onde cada rota representa um recurso e usa os métodos HTTP:
- `GET` → buscar dados
- `POST` → criar dados
- `PUT` → atualizar dados
- `DELETE` → remover dados

### JWT (JSON Web Token)
Token gerado no login que o cliente envia em toda requisição autenticada.  
Estrutura: `header.payload.signature` — não precisa salvar no banco!

### Soft Delete
Em vez de apagar o registro do banco (`DELETE`), apenas marcamos como inativo (`ativo: false`).  
Vantagens: mantém histórico, permite reativação, não quebra relações.

### Hash de senha
Nunca salvamos senhas em texto puro. O `bcryptjs` transforma a senha em um hash irreversível.  
Na hora do login, comparamos o hash, não a senha original.

### Middleware
Função que executa entre a requisição e a resposta. Usamos para verificar o JWT antes de permitir acesso às rotas protegidas.

### Variáveis de ambiente
Dados sensíveis (senhas, chaves de API) ficam no `.env` e nunca vão para o repositório público.
