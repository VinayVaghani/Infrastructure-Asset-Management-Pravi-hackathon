import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { ShieldX, ArrowLeft } from 'lucide-react';

const Unauthorized = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 mb-4 shadow-sm">
        <ShieldX className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">
        Access Restricted: Insufficient Clearance
      </h2>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        Your current role (<span className="font-semibold text-slate-800">{user?.role}</span>) does not possess the administrative privileges required to access this government resource.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="gov" size="md" icon={ArrowLeft}>
            Return to Command Center
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
