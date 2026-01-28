-- Script para criar a tabela accounts_payable_pdf_data no Supabase
-- Execute este script no SQL Editor do Supabase

-- Tabela para dados estruturados de PDFs de Contas a Pagar
-- Armazena clientes em estrutura JSONB para evitar muitas linhas
-- NÃO usa company_id - trabalha diretamente com clientes
CREATE TABLE IF NOT EXISTS accounts_payable_pdf_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id TEXT REFERENCES automations(id),
  pdf_upload_date DATE NOT NULL,
  clients_data JSONB NOT NULL, -- Estrutura: [{"client_code": "001", "client_name": "Nome", "amount": 1000.00, "paid_amount": 500.00, "pending_amount": 500.00, "titles": [...]}, ...]
  total_clients INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  is_new BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_accounts_payable_pdf_upload_date ON accounts_payable_pdf_data(pdf_upload_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_pdf_is_new ON accounts_payable_pdf_data(is_new);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_pdf_clients_data ON accounts_payable_pdf_data USING GIN(clients_data);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_pdf_automation ON accounts_payable_pdf_data(automation_id);

-- Verificar se a tabela foi criada
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'accounts_payable_pdf_data'
ORDER BY ordinal_position;
