import React from 'react';
import Badge from './Badge';

const StatusBadge = ({ status, condition, priority, role, type = 'status', className = '' }) => {
  if (type === 'condition' || condition) {
    const val = condition || status;
    const map = {
      EXCELLENT: { variant: 'emerald', label: 'Excellent' },
      GOOD: { variant: 'blue', label: 'Good' },
      MODERATE: { variant: 'amber', label: 'Moderate' },
      POOR: { variant: 'rose', label: 'Poor' },
      CRITICAL: { variant: 'rose', label: 'Critical Alert' },
    };
    const cfg = map[val] || { variant: 'slate', label: val || 'Unknown' };
    return <Badge variant={cfg.variant} dot className={className}>{cfg.label}</Badge>;
  }

  if (type === 'priority' || priority) {
    const val = priority || status;
    const map = {
      LOW: { variant: 'slate', label: 'Low' },
      MEDIUM: { variant: 'blue', label: 'Medium' },
      HIGH: { variant: 'amber', label: 'High' },
      URGENT: { variant: 'rose', label: 'Urgent' },
    };
    const cfg = map[val] || { variant: 'slate', label: val || 'Normal' };
    return <Badge variant={cfg.variant} className={className}>{cfg.label}</Badge>;
  }

  if (type === 'role' || role) {
    const val = role || status;
    const map = {
      SUPER_ADMIN: { variant: 'purple', label: 'Super Admin' },
      DEPARTMENT_ADMIN: { variant: 'indigo', label: 'Dept Admin' },
      ENGINEER: { variant: 'blue', label: 'Engineer' },
      INSPECTOR: { variant: 'cyan', label: 'Inspector' },
      FINANCE_OFFICER: { variant: 'emerald', label: 'Finance Officer' },
      CONTRACTOR: { variant: 'amber', label: 'Contractor' },
      AUDITOR: { variant: 'slate', label: 'Auditor' },
    };
    const cfg = map[val] || { variant: 'slate', label: val || 'User' };
    return <Badge variant={cfg.variant} className={className}>{cfg.label}</Badge>;
  }

  // Default: Asset status
  const map = {
    PLANNED: { variant: 'slate', label: 'Planned' },
    UNDER_CONSTRUCTION: { variant: 'amber', label: 'Under Construction' },
    COMMISSIONED: { variant: 'cyan', label: 'Commissioned' },
    OPERATIONAL: { variant: 'emerald', label: 'Operational' },
    UNDER_MAINTENANCE: { variant: 'amber', label: 'Under Maintenance' },
    TEMPORARILY_CLOSED: { variant: 'rose', label: 'Temporarily Closed' },
    RETIRED: { variant: 'slate', label: 'Retired' },
    DECOMMISSIONED: { variant: 'slate', label: 'Decommissioned' },
  };

  const cfg = map[status] || { variant: 'slate', label: status || 'Unknown' };
  return <Badge variant={cfg.variant} dot className={className}>{cfg.label}</Badge>;
};

export default StatusBadge;
