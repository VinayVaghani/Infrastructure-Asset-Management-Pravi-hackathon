import React from 'react';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { Shield, Server, Database, Cloud } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        title="Platform Configuration & Gateway Settings"
        subtitle="Department preferences, storage abstractions, and security credentials"
        breadcrumbs={[{ label: 'Settings' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Identity Card */}
        <Card>
          <CardHeader title="Authenticated Officer Profile" />
          <CardBody className="space-y-4 text-xs">
            <Input label="Full Name" value={user?.name || ''} disabled />
            <Input label="Email Address" value={user?.email || ''} disabled />
            <Input label="Government Clearance Role" value={user?.role || ''} disabled />
            <Input label="Designation" value={user?.designation || ''} disabled />
          </CardBody>
        </Card>

        {/* System & Storage Environment */}
        <Card>
          <CardHeader title="System & Storage Telemetry" />
          <CardBody className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-800">State MongoDB Database</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                CONNECTED
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-800">Digital Asset Storage Layer</span>
              </div>
              <span className="font-mono text-[11px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-bold">
                CLOUDINARY / LOCAL FALLBACK
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-slate-800">Cryptographic Standard</span>
              </div>
              <span className="font-mono text-[11px] text-slate-700 bg-slate-200 px-2 py-0.5 rounded font-bold">
                JWT / BCRYPT-10
              </span>
            </div>

            <div className="pt-2">
              <p className="text-slate-500 leading-relaxed text-[11px]">
                To update system environment parameters or link production Cloudinary credentials, update the server <code className="bg-slate-200 px-1 py-0.5 rounded">.env</code> configuration file.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
