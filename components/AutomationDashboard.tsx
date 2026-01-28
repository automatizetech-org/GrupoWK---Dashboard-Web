'use client'

import { type Automation, type Department } from '@/lib/data'
import XmlAutomationDashboard from './automations/XmlAutomationDashboard'
import AccountsPayableDashboard from './automations/AccountsPayableDashboard'
import PayrollDashboard from './automations/PayrollDashboard'

interface AutomationDashboardProps {
  automation: Automation
  department: Department
  onBack: () => void
}

export default function AutomationDashboard({ automation, department, onBack }: AutomationDashboardProps) {
  // Route to the correct automation dashboard based on type
  switch (automation.type) {
    case 'xml_processing':
      return <XmlAutomationDashboard automation={automation} department={department} onBack={onBack} />
    case 'accounts_payable':
      return <AccountsPayableDashboard automation={automation} department={department} onBack={onBack} />
    case 'payroll':
      return <PayrollDashboard automation={automation} department={department} onBack={onBack} />
    default:
      return <XmlAutomationDashboard automation={automation} department={department} onBack={onBack} />
  }
}
