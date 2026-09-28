export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  DEPARTMENT_ADMIN: 'DEPARTMENT_ADMIN',
  ENGINEER: 'ENGINEER',
  INSPECTOR: 'INSPECTOR',
  FINANCE_OFFICER: 'FINANCE_OFFICER',
  CONTRACTOR: 'CONTRACTOR',
  AUDITOR: 'AUDITOR',
};

export const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Administrator',
  DEPARTMENT_ADMIN: 'Department Administrator',
  ENGINEER: 'Executive Engineer',
  INSPECTOR: 'Quality Inspector',
  FINANCE_OFFICER: 'Finance Officer',
  CONTRACTOR: 'Registered Contractor',
  AUDITOR: 'State Auditor',
};

export const ASSET_CATEGORIES = [
  'TRANSPORT',
  'BUILDINGS',
  'WATER',
  'ENERGY',
  'LAND',
];

export const ASSET_STATUS = {
  PLANNED: 'PLANNED',
  UNDER_CONSTRUCTION: 'UNDER_CONSTRUCTION',
  COMMISSIONED: 'COMMISSIONED',
  OPERATIONAL: 'OPERATIONAL',
  UNDER_MAINTENANCE: 'UNDER_MAINTENANCE',
  TEMPORARILY_CLOSED: 'TEMPORARILY_CLOSED',
  RETIRED: 'RETIRED',
  DECOMMISSIONED: 'DECOMMISSIONED',
};

export const ASSET_CONDITION = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  MODERATE: 'MODERATE',
  POOR: 'POOR',
  CRITICAL: 'CRITICAL',
};

export const LIFECYCLE_EVENTS = {
  PROJECT_CREATED: 'Project Created',
  CONSTRUCTION_STARTED: 'Construction Started',
  CONSTRUCTION_COMPLETED: 'Construction Completed',
  ASSET_CREATED: 'Asset Registered',
  ASSET_COMMISSIONED: 'Commissioned & Inaugurated',
  INSPECTION_COMPLETED: 'Inspection Completed',
  ISSUE_REPORTED: 'Issue Flagged',
  MAINTENANCE_STARTED: 'Maintenance Initiated',
  MAINTENANCE_COMPLETED: 'Maintenance Resolved',
  ASSET_TRANSFERRED: 'Asset Transferred',
  ASSET_RETIRED: 'Asset Retired',
};

// Demo quick-logins for hackathon evaluation
export const DEMO_CREDENTIALS = [
  {
    role: ROLES.SUPER_ADMIN,
    name: 'Dr. Rajeshwar Sharma, IAS',
    designation: 'Principal Secretary',
    email: 'superadmin@infratrack.gov.in',
    badge: 'Full Platform Access',
  },
  {
    role: ROLES.DEPARTMENT_ADMIN,
    name: 'Kavita Dave, CE',
    designation: 'Chief Engineer (PWD)',
    email: 'pwd.admin@infratrack.gov.in',
    badge: 'Dept Management',
  },
  {
    role: ROLES.ENGINEER,
    name: 'Suresh Patel, SE',
    designation: 'Executive Engineer',
    email: 'engineer.patel@infratrack.gov.in',
    badge: 'Asset Operations',
  },
  {
    role: ROLES.INSPECTOR,
    name: 'Anjali Verma',
    designation: 'Senior QC Inspector',
    email: 'inspector.sharma@infratrack.gov.in',
    badge: 'Audits & Inspections',
  },
  {
    role: ROLES.FINANCE_OFFICER,
    name: 'Vikram Mehta',
    designation: 'Accounts Officer',
    email: 'finance.mehta@infratrack.gov.in',
    badge: 'Financial Records',
  },
  {
    role: ROLES.CONTRACTOR,
    name: 'Mahesh Solanki',
    designation: 'Project Director (Apex)',
    email: 'contractor.apex@infratrack.gov.in',
    badge: 'Assigned Work Orders',
  },
  {
    role: ROLES.AUDITOR,
    name: 'Bhavna Desai, CAG',
    designation: 'State Public Auditor',
    email: 'auditor.desai@infratrack.gov.in',
    badge: 'Read-Only Audit Trail',
  },
];
