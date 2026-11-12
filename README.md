# Arrival

Planeje sua viagem conversando com a **Ari**, uma agente de viagens com IA. Ela busca voos, hospedagem, restaurantes e experiências reais dentro do seu orçamento e monta um roteiro salvo para consultar depois.

## Tecnologias

| Parte             | O que usamos                                        |
| ----------------- | --------------------------------------------------- |
| Front-end         | HTML, CSS e JavaScript puro (módulos), em `public/` |
| Back-end          | Funções da Vercel em JavaScript, em `api/`          |
| IA                | Gemini (Google) pelo AI SDK                         |
| Ferramentas da IA | Servidor MCP próprio com dados da SerpApi           |
| Banco e login     | Supabase (PostgreSQL, Auth, Storage e RLS)          |
| Hospedagem        | Vercel                                              |

## Estrutura

```
arrival/
├── public/              tudo o que o navegador abre
│   ├── *.html           as 7 telas
│   ├── css/             base.css (cores, fontes, tema) e componentes.css
│   ├── js/              um módulo por responsabilidade (auth, chat, cards...)
│   └── assets/          imagens e ícones
├── api/                 back-end (funções da Vercel): chat, mcp, admin, keep-alive
├── mcp/
│   ├── tools/           ferramentas de busca da Ari (voos, hotéis, restaurantes, experiências)
│   └── mocks/           dados de exemplo, para desenvolver sem gastar cota
├── supabase/schema.sql  tabelas, regras de segurança e limites dos planos
├── vercel.json          cron que mantém o Supabase acordado
├── .env.example         variáveis de ambiente (sem valores)
└── package.json         dependências do back-end
```

## Telas

| Tela                     | Arquivo                 | Precisa de login?          |
| ------------------------ | ----------------------- | -------------------------- |
| Início com o chat da Ari | `public/index.html`     | Navegar não; conversar sim |
| Login                    | `public/login.html`     | Não                        |
| Cadastro                 | `public/cadastro.html`  | Não                        |
| Histórico de roteiros    | `public/historico.html` | Sim                        |
| Perfil                   | `public/perfil.html`    | Sim                        |
| Admin                    | `public/admin.html`     | Sim, e ser admin           |
| Planos                   | `public/planos.html`    | Não                        |

## Planos

|          | Gratuito                              | Pro                                      | Crew                                   |
| -------- | ------------------------------------- | ---------------------------------------- | -------------------------------------- |
| Preço    | R$ 0                                  | R$ 19,90/mês                             | R$ 39,90/mês                           |
| Roteiros | 4 por mês                             | 8 por mês                                | 16 por mês                             |
| Buscas   | 40 por mês                            | 100 por mês                              | 12 por dia                             |
| Pessoas  | 1                                     | 1                                        | Até 4 contas (titular + 3 convidados)  |
| Extras   | Chat, buscas em tempo real, histórico | + agenda, PDF, revisar roteiro com a Ari | + adicionar membros do Crew ao roteiro |

Os limites ficam no banco (`limites_do_plano()` em `supabase/schema.sql`) e o mês é o do calendário, no horário de Brasília. Para mostrar o uso da conta no site: `supabase.rpc('meu_uso')`.

**Crew (como um plano família):** cada pessoa tem a própria conta e os próprios limites. O titular convida pelo e-mail; o convidado vê o convite ao entrar e aceita. Um roteiro só aparece no histórico de quem foi adicionado a ele. Se o titular deixar o plano Crew, os membros voltam para o próprio plano.

Os termos de uso não têm tela própria: o aceite fica no cadastro e o texto abre em modal ou card expandido no perfil.

## Rodar no seu computador

Pré-requisitos: **Node.js 22+**, **Git** e uma conta na **Vercel**.

```bash
git clone https://github.com/arrival-proa/arrival.git
cd arrival
npm install
npm install -g vercel
vercel login
vercel link                     # cria um projeto na SUA conta, só para rodar localmente
cp .env.example .env.local      # PowerShell: copy .env.example .env.local
# preencha o .env.local com as chaves recebidas no gerenciador de senhas
vercel dev
```

Abra http://localhost:3000.

No dia a dia, deixe `USE_MOCK=true` no `.env.local`: as ferramentas de busca usam os dados de `mcp/mocks/` e não gastam a cota da SerpApi.

## Como contribuir

1. Pegue um card no Trello e mova para "Em andamento".
2. Crie uma branch a partir da `main` atualizada:
   ```bash
   git checkout main && git pull
   git checkout -b feat/nome-da-tarefa     # ou fix/... ou docs/...
   ```
3. Faça commits curtos: `feat: tela de login`, `fix: card sem foto`, `style: ...`, `docs: ...`, `chore: ...`.
4. `git push -u origin feat/nome-da-tarefa` e abra um pull request para a `main`.
5. A Vercel cria um link de preview no PR. Cole esse link no card do Trello.
6. Precisa de 1 aprovação para entrar na `main`.

Regras: nunca subir `.env.local`; nunca usar `innerHTML` com texto vindo de fora; nenhuma chave secreta no código.

## Equipe

| Pessoa             | Papel                                             |
| ------------------ | ------------------------------------------------- |
| Eduarda Santos     | PO, back-end MCP, dados e login, Tech Lead/DevOps |
| Murilo Silva       | Scrum Master, dados e login, Tech Lead/DevOps     |
| Maria Clara        | UX/UI e front-end telas                           |
| João Pedro         | UX/UI e dados e login                             |
| Geovana Nascimento | Front-end telas                                   |
| Gabriela           | Front-end telas                                   |
| Gabriel Lucas      | Front-end JavaScript e dados e login              |
| Ryan               | Front-end JavaScript                              |
