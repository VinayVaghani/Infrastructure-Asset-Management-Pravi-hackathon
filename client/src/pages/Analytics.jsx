import React from 'react';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { formatCurrency } from '../utils/formatters';

const financialTrend = [
  { year: '2021-22', capex: 820000000, opex: 24000000 },
  { year: '2022-23', capex: 1450000000, opex: 38000000 },
  { year: '2023-24', capex: 2130000000, opex: 54000000 },
  { year: '2024-25', capex: 1850000000, opex: 65000000 },
  { year: '2025-26 (Est)', capex: 950000000, opex: 72000000 },
];

const departmentAssets = [
  { name: 'Roads & Bridges (PWD)', count: 3, value: 2594000000 },
  { name: 'Water Resources (WRD)', count: 2, value: 570000000 },
  { name: 'Energy Board', count: 1, value: 310000000 },
  { name: 'Health Infrastructure', count: 1, value: 980000000 },
];

const Analytics = () => {
  return (
    <div>
      <PageHeader
        title="Asset Lifecycle Analytics & Financial Telemetry"
        subtitle="Capital expenditure, operational maintenance projections, and depreciation modeling"
        breadcrumbs={[{ label: 'Analytics' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* CAPEX vs OPEX Trend */}
        <Card>
          <CardHeader
            title="CAPEX vs OPEX Multi-Year Expenditure Trend"
            subtitle="Comparing capital acquisition vs recurring maintenance expenditure"
          />
          <CardBody className="p-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialTrend}>
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 10000000}Cr`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="capex" name="Capital Expenditure (CAPEX)" stroke="#1e3a8a" fill="#3b82f6" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="opex" name="Maintenance Expenditure (OPEX)" stroke="#b91c1c" fill="#f87171" fillOpacity={0.4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Department Asset Allocation */}
        <Card>
          <CardHeader
            title="Department Infrastructure Portfolio Valuation"
            subtitle="Capital assets book value under each municipal and state department"
          />
          <CardBody className="p-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentAssets} layout="vertical" margin={{ left: 30, right: 20 }}>
                  <XAxis type="number" tickFormatter={(v) => `₹${v / 10000000}Cr`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="value" name="Total Valuation" fill="#0f172a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
