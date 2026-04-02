# ✦ facul.notes

App colaborativo de anotações para grupos de estudos universitários.  
Login com usuário + senha, notas compartilhadas em tempo real, assistente de IA integrado.

---

## 🗂 Estrutura do projeto

```
facul-notes/
├── src/
│   ├── App.jsx          ← app principal
│   ├── firebase.js      ← configuração do Firebase
│   └── main.jsx         ← entrada do React
├── netlify/
│   └── functions/
│       └── ai.js        ← função serverless que chama a API da Anthropic
├── index.html
├── vite.config.js
├── netlify.toml
├── .env.example         ← modelo das variáveis de ambiente
└── package.json
```

---

## 🚀 Passo a passo para subir no Netlify

### ETAPA 1 — Criar o projeto Firebase (banco de dados gratuito)

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**, dê um nome (ex: `facul-notes`) e crie
3. No menu lateral, clique em **"Firestore Database"**
4. Clique em **"Criar banco de dados"**
5. Escolha **"Iniciar no modo de teste"** (por enquanto) → avançar → criar
6. No menu lateral, clique em **"Visão geral do projeto"** (ícone de casa)
7. Clique no ícone **`</>`** (Web) para adicionar um app web
8. Dê um nome qualquer e clique em **"Registrar app"**
9. Você vai ver um bloco com `firebaseConfig` — copie os valores:
   ```
   apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
   ```

### ETAPA 2 — Criar a chave da API da Anthropic (para a IA funcionar)

1. Acesse [console.anthropic.com](https://console.anthropic.com)
2. Vá em **"API Keys"** → **"Create Key"**
3. Copie a chave (começa com `sk-ant-...`)
4. ⚠️ Guarde bem — ela só aparece uma vez

### ETAPA 3 — Subir o código no GitHub

1. Crie uma conta em [github.com](https://github.com) se não tiver
2. Clique em **"New repository"**, nome: `facul-notes`, crie
3. No seu computador, dentro da pasta do projeto, rode:
   ```bash
   git init
   git add .
   git commit -m "primeiro commit"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/facul-notes.git
   git push -u origin main
   ```

### ETAPA 4 — Configurar e fazer deploy no Netlify

1. Acesse [app.netlify.com](https://app.netlify.com) e faça login
2. Clique em **"Add new site"** → **"Import an existing project"**
3. Conecte ao **GitHub** e selecione o repositório `facul-notes`
4. As configurações de build já vêm preenchidas pelo `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Antes de fazer o deploy, vá em **"Environment variables"** e adicione:

   | Variável | Valor |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | valor do Firebase |
   | `VITE_FIREBASE_AUTH_DOMAIN` | valor do Firebase |
   | `VITE_FIREBASE_PROJECT_ID` | valor do Firebase |
   | `VITE_FIREBASE_STORAGE_BUCKET` | valor do Firebase |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | valor do Firebase |
   | `VITE_FIREBASE_APP_ID` | valor do Firebase |
   | `ANTHROPIC_API_KEY` | sua chave `sk-ant-...` |

6. Clique em **"Deploy site"** — em ~2 minutos seu app estará no ar! 🎉

### ETAPA 5 — Adicionar seu domínio Netlify nas permissões do Firebase

Depois do deploy, o Netlify vai te dar uma URL tipo `https://meu-app.netlify.app`.  
Você precisa liberar ela no Firebase:

1. No console do Firebase → **"Authentication"** → **"Settings"** → **"Authorized domains"**
2. Adicione a URL do seu site Netlify

---

## 🔒 Segurança do Firestore (importante!)

Quando o banco está em "modo de teste", qualquer um pode ler/escrever.  
Para proteger depois que estiver rodando, vá em **Firestore → Rules** e cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if true;
    }
    match /notes/{noteId} {
      allow read, write: if true;
    }
    match /subjects/{subjectId} {
      allow read, write: if true;
    }
  }
}
```

(Por ora "true" libera pra todos com o link — suficiente para uso entre amigos.)

---

## 💡 Dicas

- **Deploy automático**: toda vez que você fizer `git push`, o Netlify refaz o deploy sozinho
- **URL personalizada**: no painel do Netlify você pode mudar o nome da URL (ex: `facul-turma.netlify.app`)
- **Gratuito**: Firebase Spark (grátis) suporta até 50.000 leituras/dia — mais que suficiente para um grupo de amigos
