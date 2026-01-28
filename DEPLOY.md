# Como colocar o dashboard na internet (grátis) e dar acesso ao cliente

## 1. Hospedagem grátis na Vercel

A Vercel é a plataforma oficial do Next.js e tem plano **grátis** (Hobby). O cliente (e qualquer pessoa com a senha) acessa por um link, por exemplo: `https://seu-projeto.vercel.app`.

### Passo a passo

1. **Crie uma conta na Vercel**  
   Acesse [vercel.com](https://vercel.com) e faça login com GitHub (recomendado).

2. **Suba o projeto no GitHub** (se ainda não estiver):
   - Crie um repositório no GitHub.
   - No seu computador, na pasta do projeto:

     ```bash
     git init
     git add .
     git commit -m "Deploy dashboard"
     git branch -M main
     git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
     git push -u origin main
     ```

3. **Importe o projeto na Vercel**  
   - No dashboard da Vercel: **Add New** → **Project**.  
   - Conecte o GitHub e escolha o repositório do dashboard.  
   - Clique em **Deploy** (pode deixar as opções padrão).

4. **Configure as variáveis de ambiente**  
   No projeto na Vercel: **Settings** → **Environment Variables** e adicione:

   | Nome | Valor | Observação |
   | --- | --- | --- |
   | `SESSION_SECRET` | **um segredo forte** | Necessário para assinar o cookie de sessão (login). Use 32+ caracteres aleatórios. |
   | `NEXT_PUBLIC_SUPABASE_URL` | (igual ao seu `.env` local) | URL do projeto Supabase. |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (igual ao seu `.env` local) | Chave anônima do projeto Supabase. |
   | `SUPABASE_SERVICE_ROLE_KEY` | (igual ao seu `.env` local) | Chave de service role do Supabase (para API de contas a pagar). |

   Depois de salvar, faça um **Redeploy** do projeto (Deployments → ⋮ no último deploy → Redeploy).

5. **Pronto**  
   O site ficará em um endereço como:  
   `https://dashboard-system-xxxx.vercel.app`  
   (você pode configurar um domínio próprio depois em **Settings** → **Domains**).

---

## 2. Controle de acesso (permissão)

O dashboard agora está com **tela de login (usuário/senha)**:

- Quem acessar o link da Vercel cai na **tela de login**.
- Só entra quem tiver usuário/senha cadastrados no Supabase.
- A sessão fica guardada em cookie por **7 dias**; depois a pessoa precisa logar de novo.
- No canto superior direito há o botão **Sair** para encerrar o acesso naquele navegador.

**Como dar acesso ao cliente (ou outras pessoas):**

1. No próprio dashboard existe a opção **Cadastrar novo usuário** (exige credenciais de ADM).  
2. Envie para o cliente:  
   - O **link** do site (ex.: `https://seu-projeto.vercel.app`).  
   - O **usuário** e **senha** criados para ele.

**Desenvolvimento local:**  
Você precisa configurar `SESSION_SECRET` + variáveis do Supabase no `.env` local (ou `.env` no Vercel).

---

## 3. Resumo

| O que | Como |
| --- | --- |
| Subir na internet de graça | Vercel (conta grátis, deploy pelo GitHub). |
| Cliente acessar | Enviar o link do site + usuário/senha. |
| Permissão / segurança | Login por usuário/senha (armazenados no Supabase). |
| Trocar senha | Alterar a senha do usuário no Supabase (ou criar outro usuário). |
| Sair do dashboard | Botão **Sair** no canto superior direito. |

Se quiser no futuro, dá para evoluir para **Supabase Auth** (login por e-mail, recuperação de senha, etc.).
