-- Script para adicionar políticas RLS (Row Level Security) à tabela accounts_payable_pdf_data
-- Execute este script no SQL Editor do Supabase

-- ============================================================================
-- HABILITAR RLS
-- ============================================================================
ALTER TABLE accounts_payable_pdf_data ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS RLS - ACCOUNTS_PAYABLE_PDF_DATA
-- ============================================================================

-- Política: Qualquer um pode ler dados de PDF (público para dashboard)
CREATE POLICY "accounts_payable_pdf_select_public"
ON accounts_payable_pdf_data FOR SELECT
USING (true);

-- Política: Apenas service role pode inserir dados (via automação/API)
CREATE POLICY "accounts_payable_pdf_insert_service_role"
ON accounts_payable_pdf_data FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Política: Apenas service role pode atualizar dados
CREATE POLICY "accounts_payable_pdf_update_service_role"
ON accounts_payable_pdf_data FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Política: Apenas service role pode deletar dados
CREATE POLICY "accounts_payable_pdf_delete_service_role"
ON accounts_payable_pdf_data FOR DELETE
USING (auth.role() = 'service_role');

-- ============================================================================
-- NOTAS DE SEGURANÇA
-- ============================================================================
-- 
-- RLS (Row Level Security) está habilitado para proteger os dados:
-- 
-- 1. SELECT (Leitura):
--    - Qualquer um pode ler (público) - necessário para o dashboard funcionar
--    - Isso permite que o frontend acesse os dados sem autenticação
-- 
-- 2. INSERT/UPDATE/DELETE (Escrita):
--    - Apenas service_role pode escrever - protege contra inserções maliciosas
--    - O código Next.js usa SUPABASE_SERVICE_ROLE_KEY para autenticar
--    - Usuários anônimos NÃO podem modificar dados
-- 
-- IMPORTANTE: 
-- - Nunca exponha a SERVICE_ROLE_KEY no frontend
-- - Use apenas no backend (API routes do Next.js)
-- - A anon key é segura para o frontend (só permite leitura)
