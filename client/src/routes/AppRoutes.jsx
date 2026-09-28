import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleProtectedRoute from './RoleProtectedRoute';
import AppLayout from '../layouts/AppLayout';

// Pages
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Assets from '../pages/Assets';
import AssetPassport from '../pages/AssetPassport';
import GisMap from '../pages/GisMap';
import Inspections from '../pages/Inspections';
import InspectionForm from '../pages/InspectionForm';
import Issues from '../pages/Issues';
import Maintenance from '../pages/Maintenance';
import WorkOrders from '../pages/WorkOrders';
import Projects from '../pages/Projects';
import Contractors from '../pages/Contractors';
import Documents from '../pages/Documents';
import Financials from '../pages/Financials';
import Analytics from '../pages/Analytics';
import Alerts from '../pages/Alerts';
import AuditLogs from '../pages/AuditLogs';
import Users from '../pages/Users';
import Settings from '../pages/Settings';
import Unauthorized from '../pages/Unauthorized';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Enterprise Portal */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="assets" element={<Assets />} />
        <Route path="assets/:id" element={<AssetPassport />} />
        <Route path="assets/:id/inspect" element={<InspectionForm />} />
        <Route path="map" element={<GisMap />} />
        <Route path="gis-map" element={<Navigate to="/map" replace />} />
        <Route path="inspections" element={<Inspections />} />
        <Route path="inspections/new" element={<InspectionForm />} />
        <Route path="issues" element={<Issues />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="work-orders" element={<WorkOrders />} />
        <Route path="projects" element={<Projects />} />
        <Route path="contractors" element={<Contractors />} />
        <Route path="documents" element={<Documents />} />
        <Route path="financials" element={<Financials />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route
          path="users"
          element={
            <RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'DEPARTMENT_ADMIN']}>
              <Users />
            </RoleProtectedRoute>
          }
        />
        <Route path="settings" element={<Settings />} />
        <Route path="unauthorized" element={<Unauthorized />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
