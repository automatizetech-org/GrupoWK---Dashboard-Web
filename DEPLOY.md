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
   |------|--------|------------|
   | `DASHBOARD_ACCESS_PASSWORD` | **sua senha de acesso** | Quem tiver essa senha pode entrar. Escolha uma senha forte e envie só para o cliente/pessoas autorizadas. |
   | `NEXT_PUBLIC_SUPABASE_URL` | (igual ao seu `.env` local) | URL do projeto Supabase. |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (igual ao seu `.env` local) | Chave anônima do Supabase. |
   | `SUPABASE_SERVICE_ROLE_KEY` | (igual ao seu `.env` local) | Chave de service role do Supabase (para API de contas a pagar). |

   Depois de salvar, faça um **Redeploy** do projeto (Deployments → ⋮ no último deploy → Redeploy).

5. **Pronto**  
   O site ficará em um endereço como:  
   `https://dashboard-system-xxxx.vercel.app`  
   (você pode configurar um domínio próprio depois em **Settings** → **Domains**).

---

## 2. Controle de acesso (permissão)

O dashboard já está com **proteção por senha**:

- Quem acessar o link da Vercel cai na **tela de login**.
- Só entra quem digitar a **senha** que você definiu em `DASHBOARD_ACCESS_PASSWORD`.
- A senha fica guardada em cookie por **7 dias**; depois a pessoa precisa digitar de novo.
- No canto superior direito há o botão **Sair** para encerrar o acesso naquele navegador.

**Como dar acesso ao cliente (ou outras pessoas):**

1. Defina uma senha forte em `DASHBOARD_ACCESS_PASSWORD` na Vercel.  
2. Envie para o cliente (por e-mail, WhatsApp, etc.):  
   - O **link** do site (ex.: `https://seu-projeto.vercel.app`).  
   - A **senha** de acesso.  
3. Ele abre o link, digita a senha uma vez e usa o dashboard.  
4. Se quiser trocar a senha depois, altere `DASHBOARD_ACCESS_PASSWORD` na Vercel e faça **Redeploy**; a nova senha vale para todos.

**Desenvolvimento local:**  
Se você **não** definir `DASHBOARD_ACCESS_PASSWORD` no `.env` local, o middleware deixa todo mundo entrar (sem tela de login). Assim você desenvolve sem precisar logar. Em **produção** na Vercel, **sempre** defina essa variável para manter o acesso restrito.

---

## 3. Resumo

| O que | Como |
|-------|------|
| Subir na internet de graça | Vercel (conta grátis, deploy pelo GitHub). |
| Cliente acessar | Enviar o link do site + a senha. |
| Permissão / segurança | Só quem tem a senha (`DASHBOARD_ACCESS_PASSWORD`) entra. |
| Trocar senha | Alterar a variável na Vercel e dar Redeploy. |
| Sair do dashboard | Botão **Sair** no canto superior direito. |

Se quiser no futuro **login por usuário** (cada pessoa com seu e-mail e senha), dá para integrar **Supabase Auth** e uma tela de login; a proteção por uma senha única já resolve para “só quem eu autorizar acessa”.
