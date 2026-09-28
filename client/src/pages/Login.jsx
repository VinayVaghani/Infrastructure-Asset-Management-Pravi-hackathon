import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DEMO_CREDENTIALS } from '../utils/constants';
import Button from '../components/Button';
import Input from '../components/Input';
import { Landmark, ShieldCheck, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('superadmin@infratrack.gov.in');
  const [password, setPassword] = useState('Password@123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      addToast({
        type: 'success',
        title: 'Authentication Successful',
        message: `Welcome, ${result.user?.name} (${result.user?.role})`,
      });
      navigate(from, { replace: true });
    } else {
      setErrorMessage(result.message);
      addToast({
        type: 'error',
        title: 'Authentication Failed',
        message: result.message,
      });
    }
  };

  const selectDemoUser = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Grid */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Emblem / Government Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-700 text-white shadow-lg border border-blue-500/40 mb-3">
            <Landmark className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            InfraTrack
          </h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-blue-300 font-semibold">
            Government Infrastructure Asset Lifecycle Management
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Official Government Portal | Gujarat State Gateway</span>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4">
        {/* Login Card */}
        <div className="bg-white py-8 px-6 shadow-2xl rounded-xl sm:px-10 border border-slate-200">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {errorMessage}
              </div>
            )}

            <Input
              label="Official Email Address"
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@infratrack.gov.in"
              icon={Mail}
            />

            <Input
              label="Password / Security PIN"
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              icon={Lock}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="gov"
                className="w-full py-2.5"
                isLoading={isLoading}
                icon={ArrowRight}
                iconPosition="right"
              >
                Sign In to Government Portal
              </Button>
            </div>
          </form>

          {/* Quick Demo Credentials Panel for Hackathon Evaluation */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                Select Role to Test:
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Password: Password@123</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {DEMO_CREDENTIALS.map((demo) => {
                const isSelected = email === demo.email;
                return (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => selectDemoUser(demo.email)}
                    className={`p-2 text-left rounded-md border text-xs transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 font-semibold text-blue-900 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-[11px] truncate">
                        {demo.designation}
                      </span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200/80 text-slate-700">
                        {demo.role.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
                      {demo.email}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          InfraTrack Security Compliance • 256-bit Encrypted Session • Audit Logged
        </p>
      </div>
    </div>
  );
};

export default Login;
