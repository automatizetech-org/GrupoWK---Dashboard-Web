-- Execute este script no SQL Editor do Supabase
--
-- Objetivo: ter UM ÚNICO arquivo que, ao rodar em um projeto novo do Supabase,
-- cria TODAS as tabelas e estruturas necessárias para o dashboard web atual.

-- Extensão para UUID (normalmente já habilitada no Supabase, mas não custa garantir)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Empresas
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  city TEXT,
  state TEXT,
  region TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Departamentos
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Automações
CREATE TABLE IF NOT EXISTS automations (
  id TEXT PRIMARY KEY,
  department_id TEXT REFERENCES departments(id),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Dados Fiscais (XML, NF, NFC)
CREATE TABLE IF NOT EXISTS tax_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  automation_id TEXT REFERENCES automations(id),
  xml_count INTEGER DEFAULT 0,
  nf_count INTEGER DEFAULT 0,
  nfc_count INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  period TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, automation_id, period)
);

-- Tabela de Contas a Pagar
CREATE TABLE IF NOT EXISTS accounts_payable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  automation_id TEXT REFERENCES automations(id),
  invoice_number TEXT NOT NULL,
  supplier TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
  category TEXT,
  period TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para dados estruturados de PDFs de Contas a Pagar
-- Armazena clientes em estrutura JSONB para evitar muitas linhas
-- NÃO usa company_id - trabalha diretamente com clientes
CREATE TABLE IF NOT EXISTS accounts_payable_pdf_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id TEXT REFERENCES automations(id),
  pdf_upload_date DATE NOT NULL,
  clients_data JSONB NOT NULL, -- Estrutura: [{"client_code": "001", "client_name": "Nome", "amount": 1000.00, "titles": [...]}, ...]
  total_clients INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  is_new BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para accounts_payable_pdf_data
CREATE INDEX IF NOT EXISTS idx_accounts_payable_pdf_upload_date ON accounts_payable_pdf_data(pdf_upload_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_pdf_is_new ON accounts_payable_pdf_data(is_new);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_pdf_clients_data ON accounts_payable_pdf_data USING GIN(clients_data);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_pdf_automation ON accounts_payable_pdf_data(automation_id);

-- RLS para accounts_payable_pdf_data
-- Leitura pública; escrita somente com service_role (usada pelo backend do dashboard)
ALTER TABLE accounts_payable_pdf_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounts_payable_pdf_select_public" ON accounts_payable_pdf_data;
CREATE POLICY "accounts_payable_pdf_select_public"
ON accounts_payable_pdf_data
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "accounts_payable_pdf_insert_service_role" ON accounts_payable_pdf_data;
CREATE POLICY "accounts_payable_pdf_insert_service_role"
ON accounts_payable_pdf_data
FOR INSERT
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "accounts_payable_pdf_update_service_role" ON accounts_payable_pdf_data;
CREATE POLICY "accounts_payable_pdf_update_service_role"
ON accounts_payable_pdf_data
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "accounts_payable_pdf_delete_service_role" ON accounts_payable_pdf_data;
CREATE POLICY "accounts_payable_pdf_delete_service_role"
ON accounts_payable_pdf_data
FOR DELETE
USING (auth.role() = 'service_role');

-- Tabela de Folha de Pagamento
CREATE TABLE IF NOT EXISTS payroll_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  automation_id TEXT REFERENCES automations(id),
  employee_count INTEGER DEFAULT 0,
  total_salary DECIMAL(10,2) DEFAULT 0,
  benefits DECIMAL(10,2) DEFAULT 0,
  taxes DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) DEFAULT 0,
  period TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, automation_id, period)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tax_data_company ON tax_data(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_data_period ON tax_data(period);
CREATE INDEX IF NOT EXISTS idx_tax_data_date ON tax_data(date);

CREATE INDEX IF NOT EXISTS idx_accounts_payable_company ON accounts_payable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due_date ON accounts_payable(due_date);

CREATE INDEX IF NOT EXISTS idx_payroll_data_company ON payroll_data(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_data_period ON payroll_data(period);
CREATE INDEX IF NOT EXISTS idx_payroll_data_date ON payroll_data(date);

-- Tabela de autenticação - administradores (login do dashboard)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de autenticação - usuários comuns
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Tabela de dados consolidados de automação XML (usada por getTaxData e pelo script Python)
CREATE TABLE IF NOT EXISTS automation_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  automation_id TEXT NOT NULL REFERENCES automations(id),
  date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Contadores genéricos (para compatibilidade com versões antigas)
  count_1 INTEGER DEFAULT 0,
  count_2 INTEGER DEFAULT 0,
  count_3 INTEGER DEFAULT 0,
  -- Valores financeiros genéricos
  amount_1 DECIMAL(10,2) DEFAULT 0,
  amount_2 DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_data_company_id ON automation_data(company_id);
CREATE INDEX IF NOT EXISTS idx_automation_data_automation_id ON automation_data(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_data_date ON automation_data(date);
CREATE INDEX IF NOT EXISTS idx_automation_data_updated_at ON automation_data(updated_at);

-- Dados iniciais (opcional)
INSERT INTO departments (id, name, description) VALUES
  ('fiscal', 'Fiscal', 'Departamento Fiscal - Gestão de documentos fiscais'),
  ('financeiro', 'Financeiro', 'Departamento Financeiro'),
  ('rh', 'Recursos Humanos', 'Departamento de Recursos Humanos')
ON CONFLICT (id) DO NOTHING;

INSERT INTO automations (id, department_id, name, description, type) VALUES
  -- IMPORTANTE: o dashboard e o script Python usam automation_id = 'xml-sefaz'
  ('xml-sefaz', 'fiscal', 'XML SEFAZ', 'Automação para processamento de XML do SEFAZ', 'xml_processing'),
  ('contas-pagar', 'financeiro', 'Contas a Pagar', 'Automação de contas a pagar', 'accounts_payable'),
  ('folha-pagamento', 'rh', 'Folha de Pagamento', 'Automação de folha de pagamento', 'payroll')
ON CONFLICT (id) DO NOTHING;

-- Row Level Security (RLS) - Configure conforme sua necessidade de segurança
-- Por padrão, desabilitamos RLS para facilitar a integração
-- Você pode habilitar e criar políticas específicas depois

-- ALTER TABLE tax_data ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payroll_data ENABLE ROW LEVEL SECURITY;


-- Exemplo de política para leitura pública (ajuste conforme necessário)
-- CREATE POLICY "Permitir leitura pública de tax_data"
-- ON tax_data FOR SELECT
-- USING (true);
