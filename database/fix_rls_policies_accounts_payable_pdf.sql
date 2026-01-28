-- Script para CORRIGIR políticas RLS (Row Level Security) da tabela accounts_payable_pdf_data
-- Execute este script no SQL Editor do Supabase
-- Este script remove políticas antigas e cria novas corretamente

-- ============================================================================
-- REMOVER POLÍTICAS ANTIGAS (se existirem)
-- ============================================================================
DROP POLICY IF EXISTS "accounts_payable_pdf_select_public" ON accounts_payable_pdf_data;
DROP POLICY IF EXISTS "accounts_payable_pdf_insert_service_role" ON accounts_payable_pdf_data;
DROP POLICY IF EXISTS "accounts_payable_pdf_update_service_role" ON accounts_payable_pdf_data;
DROP POLICY IF EXISTS "accounts_payable_pdf_delete_service_role" ON accounts_payable_pdf_data;

-- ============================================================================
-- GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================
ALTER TABLE accounts_payable_pdf_data ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CRIAR POLÍTICAS RLS CORRETAS
-- ============================================================================

-- Política: Qualquer um pode ler dados de PDF (público para dashboard)
-- IMPORTANTE: Esta política permite leitura SEM autenticação (anon key)
CREATE POLICY "accounts_payable_pdf_select_public"
ON accounts_payable_pdf_data 
FOR SELECT
TO public
USING (true);

-- Política: Apenas service role pode inserir dados (via automação/API)
CREATE POLICY "accounts_payable_pdf_insert_service_role"
ON accounts_payable_pdf_data 
FOR INSERT
TO service_role
WITH CHECK (true);

-- Política: Apenas service role pode atualizar dados
CREATE POLICY "accounts_payable_pdf_update_service_role"
ON accounts_payable_pdf_data 
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Política: Apenas service role pode deletar dados
CREATE POLICY "accounts_payable_pdf_delete_service_role"
ON accounts_payable_pdf_data 
FOR DELETE
TO service_role
USING (true);

-- ============================================================================
-- VERIFICAR POLÍTICAS CRIADAS
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'accounts_payable_pdf_data'
ORDER BY policyname;

-- ============================================================================
-- TESTE DE LEITURA (deve retornar dados se RLS estiver correto)
-- ============================================================================
-- Execute esta query para testar se a leitura pública funciona:
-- SELECT COUNT(*) FROM accounts_payable_pdf_data;
