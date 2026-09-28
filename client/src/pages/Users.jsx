import React from 'react';
import PageHeader from '../components/PageHeader';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import { Card, CardHeader, CardBody } from '../components/Card';
import { DEMO_CREDENTIALS } from '../utils/constants';
import { Users as UsersIcon, Shield, Check, X } from 'lucide-react';

const usersData = [
  {
    _id: '1',
    name: 'Dr. Rajeshwar Sharma, IAS',
    email: 'superadmin@infratrack.gov.in',
    role: 'SUPER_ADMIN',
    department: 'State Apex Secretariat',
    designation: 'Principal Secretary & State Chief Admin',
    status: 'ACTIVE',
    lastLogin: 'Today, 12:03 PM',
  },
  {
    _id: '2',
    name: 'Kavita Dave, CE',
    email: 'pwd.admin@infratrack.gov.in',
    role: 'DEPARTMENT_ADMIN',
    department: 'Public Works Department (PWD)',
    designation: 'Chief Engineer & Head of PWD',
    status: 'ACTIVE',
    lastLogin: 'Yesterday, 04:15 PM',
  },
  {
    _id: '3',
    name: 'Suresh Patel, SE',
    email: 'engineer.patel@infratrack.gov.in',
    role: 'ENGINEER',
    department: 'Public Works Department (PWD)',
    designation: 'Executive Engineer (Bridges & Roads)',
    status: 'ACTIVE',
    lastLogin: '28 Sep 2026',
  },
  {
    _id: '4',
    name: 'Anjali Verma',
    email: 'inspector.sharma@infratrack.gov.in',
    role: 'INSPECTOR',
    department: 'Water Resources & Municipal Supply',
    designation: 'Senior Infrastructure Quality Inspector',
    status: 'ACTIVE',
    lastLogin: '27 Sep 2026',
  },
  {
    _id: '5',
    name: 'Vikram Mehta',
    email: 'finance.mehta@infratrack.gov.in',
    role: 'FINANCE_OFFICER',
    department: 'Finance & Accounts Division',
    designation: 'Senior Accounts Officer (Capital Assets)',
    status: 'ACTIVE',
    lastLogin: '26 Sep 2026',
  },
  {
    _id: '6',
    name: 'Mahesh Solanki',
    email: 'contractor.apex@infratrack.gov.in',
    role: 'CONTRACTOR',
    department: 'Apex Infrastructure Ltd',
    designation: 'Project Director',
    status: 'ACTIVE',
    lastLogin: '28 Sep 2026',
  },
  {
    _id: '7',
    name: 'Bhavna Desai, CAG',
    email: 'auditor.desai@infratrack.gov.in',
    role: 'AUDITOR',
    department: 'State Public Accounts Directorate',
    designation: 'State Public Accounts Auditor',
    status: 'ACTIVE',
    lastLogin: '25 Sep 2026',
  },
];

const permissionsMatrix = [
  { module: 'Dashboard & Metrics', super: true, dept: true, eng: true, insp: true, fin: true, ctr: true, aud: true },
  { module: 'Asset Registration & Edits', super: true, dept: true, eng: true, insp: false, fin: false, ctr: false, aud: false },
  { module: 'GIS Spatial Mapping', super: true, dept: true, eng: true, insp: true, fin: true, ctr: true, aud: true },
  { module: 'Conduct Inspections', super: true, dept: true, eng: true, insp: true, fin: false, ctr: false, aud: false },
  { module: 'Rehabilitation & Work Orders', super: true, dept: true, eng: true, insp: false, fin: false, ctr: true, aud: false },
  { module: 'Financial Records & Disbursements', super: true, dept: true, eng: false, insp: false, fin: true, ctr: false, aud: false },
  { module: 'Audit Trail Access', super: true, dept: false, eng: false, insp: false, fin: false, ctr: false, aud: true },
  { module: 'User Role Administration', super: true, dept: true, eng: false, insp: false, fin: false, ctr: false, aud: false },
];

const Users = () => {
  const columns = [
    {
      header: 'Officer Name',
      key: 'name',
      render: (r) => (
        <div>
          <div className="font-semibold text-slate-800 text-xs">{r.name}</div>
          <div className="text-[11px] text-slate-500">{r.email}</div>
        </div>
      ),
    },
    {
      header: 'Security Clearance Role',
      key: 'role',
      render: (r) => <StatusBadge role={r.role} type="role" />,
    },
    {
      header: 'Department / Organization',
      key: 'department',
      render: (r) => <span className="text-xs text-slate-700">{r.department}</span>,
    },
    {
      header: 'Designation',
      key: 'designation',
      render: (r) => <span className="text-xs text-slate-600">{r.designation}</span>,
    },
    {
      header: 'Account Status',
      key: 'status',
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          {r.status}
        </span>
      ),
    },
    {
      header: 'Last Authentication',
      key: 'lastLogin',
      render: (r) => <span className="text-xs text-slate-500 font-mono">{r.lastLogin}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Department Personnel & Role-Based Access Control (RBAC)"
        subtitle="Cryptographically verified government user profiles and role privilege matrices"
        breadcrumbs={[{ label: 'Users' }]}
      />

      <Table columns={columns} data={usersData} className="mb-8" />

      {/* RBAC Privileges Matrix */}
      <Card>
        <CardHeader
          title="Official Role Privileges & Entitlement Matrix"
          subtitle="Strict separation of duties per State Governance Guidelines"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-600">
              <tr>
                <th className="py-3 px-4 text-left">Functional Module</th>
                <th className="py-3 px-2 text-center">Super Admin</th>
                <th className="py-3 px-2 text-center">Dept Admin</th>
                <th className="py-3 px-2 text-center">Engineer</th>
                <th className="py-3 px-2 text-center">Inspector</th>
                <th className="py-3 px-2 text-center">Finance</th>
                <th className="py-3 px-2 text-center">Contractor</th>
                <th className="py-3 px-2 text-center">Auditor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {permissionsMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{row.module}</td>
                  <td className="py-2.5 px-2 text-center">{row.super ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-2.5 px-2 text-center">{row.dept ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-2.5 px-2 text-center">{row.eng ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-2.5 px-2 text-center">{row.insp ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-2.5 px-2 text-center">{row.fin ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-2.5 px-2 text-center">{row.ctr ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-2.5 px-2 text-center">{row.aud ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Users;
