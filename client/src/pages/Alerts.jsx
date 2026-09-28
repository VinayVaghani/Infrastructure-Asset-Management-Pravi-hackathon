import React from 'react';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { AlertTriangle, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const alerts = [
  {
    id: 1,
    assetId: 'BR-GJ-SRT-000045',
    assetName: 'Old Tapi Causeway Low-Level Barrage',
    severity: 'CRITICAL',
    title: 'Severe Substructure Scour & Foundation Instability',
    message: 'Pier #4 bed scour exceeded maximum hydraulic safe depth by 1.8m following monsoon flood surge. Health score dropped to 36%. Immediate traffic closure in effect.',
    date: '2024-08-03 11:00 AM',
    actionLink: '/work-orders',
    actionText: 'Review Emergency Micro-Piling Work Order',
  },
  {
    id: 2,
    assetId: 'RD-GJ-SRT-000512',
    assetName: 'Ring Road Express Corridor Phase II',
    severity: 'HIGH',
    title: 'Pavement Depression & Heavy Wheel Rutting',
    message: 'Continuous heavy container movement caused 40mm subsidence near Sahara Gate junction. Milling operations underway.',
    date: '2024-09-05 08:00 AM',
    actionLink: '/maintenance',
    actionText: 'Track Milling Progress',
  },
  {
    id: 3,
    assetId: 'WT-GJ-SRT-000089',
    assetName: 'Adajan 15 MLD Water Treatment Plant',
    severity: 'MEDIUM',
    title: 'Biannual Membrane Filtration Quality Audit Due',
    message: 'Statutory 6-month microbiological water safety and reverse osmosis audit scheduled for 15-Oct-2024.',
    date: '2024-09-20 09:30 AM',
    actionLink: '/inspections',
    actionText: 'View Scheduled Inspection',
  },
];

const Alerts = () => {
  return (
    <div>
      <PageHeader
        title="Active Infrastructure Alerts & Anomalies"
        subtitle="Automated condition degradation triggers, threshold breaches, and emergency safety notifications"
        breadcrumbs={[{ label: 'Alerts' }]}
      />

      <div className="space-y-4">
        {alerts.map((alert) => (
          <Card
            key={alert.id}
            className={`border-l-4 ${
              alert.severity === 'CRITICAL'
                ? 'border-l-rose-600 bg-rose-50/10'
                : alert.severity === 'HIGH'
                ? 'border-l-amber-500 bg-amber-50/10'
                : 'border-l-blue-600 bg-blue-50/10'
            }`}
          >
            <CardBody className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`p-1.5 rounded-full ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-700'
                        : alert.severity === 'HIGH'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {alert.assetId}
                  </span>
                  <StatusBadge condition={alert.severity} type="condition" />
                </div>
              </div>

              <div className="text-xs text-slate-500 font-semibold mb-1">
                Asset: {alert.assetName} • Logged: {alert.date}
              </div>

              <p className="text-xs text-slate-700 leading-relaxed max-w-4xl mb-3">
                {alert.message}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  Priority Directive: Chief Engineer & Quality Control Division
                </span>
                <Link
                  to={alert.actionLink}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                >
                  {alert.actionText} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Alerts;
