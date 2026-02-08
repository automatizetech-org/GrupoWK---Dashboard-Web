# Dashboard Web — Grupo WK

<p align="center">
  <img src="public/images/logo.png" alt="Logo Grupo WK" width="200" />
</p>

<p align="center">
  <strong>Plataforma de automações e visão unificada para Fiscal, Financeiro e RH</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-em%20desenvolvimento-yellow" alt="Status: em desenvolvimento" />
</p>

---

## Sobre o projeto

Este repositório contém o **Dashboard Web** desenvolvido para o **Grupo WK**. Trata-se de uma aplicação web que centraliza o acompanhamento de automações por departamento (Fiscal, Financeiro e Recursos Humanos), com login controlado, gráficos, tabelas e mapa de empresas.

> **Projeto em andamento.** O dashboard está em evolução contínua: conforme novas automações são desenvolvidas, elas são integradas aqui. A lista de automações e funcionalidades tende a crescer ao longo do tempo.

O sistema permite:

- **Visualizar indicadores** por empresa e por período  
- **Acessar dashboards específicos** de cada automação (Sefaz XML, Contas a Pagar, Folha de Pagamento)  
- **Consultar dados** vindos do Supabase (empresas, documentos fiscais, contas a pagar, folha)  
- **Controlar acesso** por usuário e senha (com área de administração para cadastro de usuários)

---

## Automações disponíveis

O dashboard é pensado para receber **novas automações** à medida que forem sendo criadas. Atualmente estão integradas:

| Departamento   | Automação            | Descrição                                              |
|----------------|----------------------|--------------------------------------------------------|
| **Fiscal**     | Sefaz XML            | Processamento e visão de XMLs do Sefaz (NF, NFC-e, totais) |
| **Financeiro** | Contas a Pagar       | Contas a pagar por empresa, período e status (pendente/pago/vencido) |
| **RH**         | Folha de Pagamento   | Dados de folha por empresa e período (funcionários, salários, benefícios) |

Cada automação possui seu próprio dashboard com filtros, tabelas e gráficos (Recharts), além de integração com o mapa de localização das empresas quando aplicável. Novas automações serão adicionadas à medida que forem desenvolvidas.

---

## Tecnologias

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS  
- **UI:** Recharts, Leaflet (mapas), Lucide React (ícones)  
- **Backend / dados:** Supabase (PostgreSQL, API)  
- **Autenticação:** Sessão via cookie (login com usuário/senha armazenados no Supabase)

---

## Como rodar localmente

### Pré-requisitos

- Node.js 18+  
- Conta e projeto no [Supabase](https://supabase.com) (banco e variáveis configurados)

### Passos

1. **Clonar o repositório**

   ```bash
   git clone <url-do-repositorio>
   cd "dashboard web"
   ```

2. **Instalar dependências**

   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente**

   Crie um arquivo `.env` na raiz do projeto (nunca commite esse arquivo — ele já está no `.gitignore`) com:

   | Variável                      | Descrição                                |
   |------------------------------|------------------------------------------|
   | `SESSION_SECRET`             | Segredo para assinatura do cookie (32+ caracteres) |
   | `NEXT_PUBLIC_SUPABASE_URL`   | URL do projeto Supabase                  |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase             |
   | `SUPABASE_SERVICE_ROLE_KEY`  | Chave de service role (ex.: API contas a pagar) |

4. **Subir o banco (Supabase)**

   Execute o script SQL em `database/schema.sql` no SQL Editor do seu projeto Supabase.

5. **Iniciar o servidor de desenvolvimento**

   ```bash
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000). A tela de login será exibida; use um usuário cadastrado no Supabase (ou crie via área de administração, se disponível).

---

## Scripts disponíveis

| Comando        | Descrição                |
|----------------|--------------------------|
| `npm run dev`  | Servidor de desenvolvimento (Next.js) |
| `npm run build`| Build de produção        |
| `npm run start`| Servidor de produção     |
| `npm run lint` | Executar ESLint          |

---

## Estrutura resumida do projeto

```
├── app/                    # Rotas e páginas (Next.js App Router)
│   ├── api/                 # Rotas de API (login, Supabase, etc.)
│   ├── login/               # Página de login
│   ├── admin/               # Área administrativa (usuários)
│   └── page.tsx             # Página inicial (dashboard)
├── components/              # Componentes React
│   ├── automations/         # Dashboards por automação (XML, Contas a Pagar, Folha)
│   ├── charts/              # Gráficos (Recharts)
│   ├── tables/              # Tabelas de dados
│   └── ...                  # Layout, sidebar, mapa, etc.
├── lib/                     # Lógica compartilhada (auth, Supabase, dados, PDF)
├── database/                # schema.sql para Supabase
├── public/
│   └── images/
│       └── logo.png         # Logo Grupo WK
└── DEPLOY.md                # Instruções para deploy (ex.: Vercel)
```

---

## Deploy e acesso ao cliente

Para colocar o dashboard na internet (ex.: Vercel) e dar acesso ao cliente com usuário/senha, siga o guia **[DEPLOY.md](DEPLOY.md)**.

---

## Licença

Consulte o arquivo [LICENSE](LICENSE) deste repositório.

---

<p align="center">
  Desenvolvido para <strong>Grupo WK</strong>
</p>
