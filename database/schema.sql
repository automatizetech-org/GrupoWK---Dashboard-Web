-- Schema do banco de dados Supabase para o Dashboard System
-- Execute este script no SQL Editor do Supabase

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

-- Dados iniciais (opcional)
INSERT INTO departments (id, name, description) VALUES
  ('fiscal', 'Fiscal', 'Departamento Fiscal - Gestão de documentos fiscais'),
  ('financeiro', 'Financeiro', 'Departamento Financeiro'),
  ('rh', 'Recursos Humanos', 'Departamento de Recursos Humanos')
ON CONFLICT (id) DO NOTHING;

INSERT INTO automations (id, department_id, name, description, type) VALUES
  ('xml-siefiaz', 'fiscal', 'XML e CFiles - S-E-F-I-A-Z', 'Automação para processamento de XML e CFiles do sistema S-E-F-I-A-Z', 'xml_processing'),
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
