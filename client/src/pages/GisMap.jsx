import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import assetService from '../services/assetService';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/formatters';
import { ASSET_CATEGORIES, ASSET_STATUS, ASSET_CONDITION } from '../utils/constants';
import {
  MapPin,
  Search,
  Filter,
  RotateCcw,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Eye,
  Maximize2,
} from 'lucide-react';

// Custom condition-colored Leaflet pin creator
const createMarkerIcon = (condition, isSelected = false) => {
  const colorMap = {
    EXCELLENT: '#059669',
    GOOD: '#2563eb',
    MODERATE: '#d97706',
    POOR: '#e11d48',
    CRITICAL: '#be123c',
  };

  const bg = colorMap[condition] || '#1e293b';
  const size = isSelected ? 36 : 28;
  const anchor = isSelected ? 18 : 14;

  return L.divIcon({
    className: 'gis-marker-pin',
    html: `
      <div style="
        background-color: ${bg};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <div style="
          width: ${isSelected ? 10 : 8}px;
          height: ${isSelected ? 10 : 8}px;
          background: #ffffff;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [anchor, size],
    popupAnchor: [0, -size],
  });
};

// Component to dynamically fit map bounds when assets change
const MapBoundsHandler = ({ assets, selectedAsset }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedAsset && selectedAsset.location?.latitude && selectedAsset.location?.longitude) {
      map.flyTo([selectedAsset.location.latitude, selectedAsset.location.longitude], 15, {
        duration: 1.2,
      });
      return;
    }

    const validCoords = assets
      .filter((a) => a.location?.latitude && a.location?.longitude)
      .map((a) => [a.location.latitude, a.location.longitude]);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [assets, selectedAsset, map]);

  return null;
};

const GisMap = () => {
  const navigate = useNavigate();

  const [assets, setAssets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Selected asset for zoom
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Sidebar panel collapse toggle
  const [panelOpen, setPanelOpen] = useState(true);

  // Load assets & departments
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [assetRes, deptRes] = await Promise.all([
          assetService.getAssets({ limit: 100 }),
          assetService.getDepartments(),
        ]);
        if (assetRes.success) setAssets(assetRes.data || []);
        if (deptRes.success) setDepartments(deptRes.data || []);
      } catch (err) {
        console.error('Failed to load map data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtered Assets logic
  const { mappedAssets, unmappedAssets } = useMemo(() => {
    const mapped = [];
    const unmapped = [];

    assets.forEach((asset) => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matches =
          asset.name?.toLowerCase().includes(term) ||
          asset.assetId?.toLowerCase().includes(term) ||
          asset.location?.city?.toLowerCase().includes(term) ||
          asset.location?.district?.toLowerCase().includes(term);
        if (!matches) return;
      }

      if (selectedCategory && asset.category !== selectedCategory) return;
      if (selectedType && asset.assetType !== selectedType) return;
      if (selectedDept && asset.department?._id !== selectedDept && asset.department !== selectedDept) return;
      if (selectedCondition && asset.condition !== selectedCondition) return;
      if (selectedStatus && asset.status !== selectedStatus) return;

      const hasValidGps =
        asset.location?.latitude !== undefined &&
        asset.location?.latitude !== null &&
        asset.location?.longitude !== undefined &&
        asset.location?.longitude !== null &&
        !isNaN(asset.location.latitude) &&
        !isNaN(asset.location.longitude);

      if (hasValidGps) {
        mapped.push(asset);
      } else {
        unmapped.push(asset);
      }
    });

    return { mappedAssets: mapped, unmappedAssets: unmapped };
  }, [assets, searchTerm, selectedCategory, selectedType, selectedDept, selectedCondition, selectedStatus]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedDept('');
    setSelectedCondition('');
    setSelectedStatus('');
    setSelectedAsset(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="GIS Spatial Infrastructure Map"
        subtitle="Geographic asset distribution with real-time condition health, spatial telemetry, and digital passports"
        breadcrumbs={[{ label: 'GIS Map' }]}
      />

      {/* Main Map Container with Left Floating Filter Panel */}
      <div className="relative h-[720px] rounded-xl overflow-hidden border border-slate-300 shadow-sm bg-slate-100 flex">
        {/* Left Filter & Asset List Panel */}
        <div
          className={`h-full bg-white/95 backdrop-blur-md border-r border-slate-200 z-20 flex flex-col transition-all duration-300 shadow-lg ${
            panelOpen ? 'w-80 sm:w-96' : 'w-0 overflow-hidden'
          }`}
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-700" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Spatial Filters & Assets
              </span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              title="Reset Filters"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          {/* Filters Form Area */}
          <div className="p-4 border-b border-slate-100 space-y-3 overflow-y-auto max-h-72">
            <Input
              placeholder="Search Name or Asset ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...ASSET_CATEGORIES.map((c) => ({ value: c, label: c })),
                ]}
              />

              <Select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                options={[
                  { value: '', label: 'All Conditions' },
                  ...Object.keys(ASSET_CONDITION).map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                options={[
                  { value: '', label: 'All Departments' },
                  ...departments.map((d) => ({ value: d._id, label: d.code })),
                ]}
              />

              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  ...Object.keys(ASSET_STATUS).map((s) => ({ value: s, label: s.replace('_', ' ') })),
                ]}
              />
            </div>

            {/* Condition Legend Chips */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Condition Legend:</span>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Good
                </span>
                <span className="flex items-center gap-0.5 text-amber-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span> Mod
                </span>
                <span className="flex items-center gap-0.5 text-rose-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span> Crit
                </span>
              </div>
            </div>
          </div>

          {/* Mapped Assets List in Panel */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
            <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Matching Assets ({mappedAssets.length})</span>
              {unmappedAssets.length > 0 && (
                <span className="text-amber-700 flex items-center gap-0.5" title="Assets missing GPS coordinates">
                  <AlertCircle className="w-3 h-3" /> {unmappedAssets.length} No GPS
                </span>
              )}
            </div>

            {mappedAssets.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No mapped assets match current filter selection.
              </div>
            ) : (
              mappedAssets.map((asset) => {
                const isSelected = selectedAsset?._id === asset._id;
                return (
                  <div
                    key={asset._id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`p-2.5 rounded-lg transition-colors cursor-pointer text-xs mb-1 ${
                      isSelected
                        ? 'bg-blue-50/80 border border-blue-300'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[11px] font-bold text-blue-900 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                        {asset.assetId}
                      </span>
                      <StatusBadge condition={asset.condition} type="condition" />
                    </div>
                    <div className="font-semibold text-slate-800 mt-1 truncate">{asset.name}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                      <span>{asset.assetType} • {asset.category}</span>
                      <span className="font-bold text-slate-700">{asset.healthScore}% Health</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/80 text-[11px] text-slate-500 text-center">
            Click an asset to center camera & open details
          </div>
        </div>

        {/* Toggle Panel Button Floating on Map */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="absolute left-2 top-3 z-30 p-2 bg-white/95 backdrop-blur-md rounded-md shadow-md border border-slate-200 text-slate-700 hover:text-slate-900 transition-all hover:bg-slate-50"
          style={{ left: panelOpen ? '328px' : '16px' }}
          title={panelOpen ? 'Collapse Filter Panel' : 'Expand Filter Panel'}
        >
          {panelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Leaflet Map Canvas */}
        <div className="flex-1 h-full relative">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-slate-50">
              <LoadingSpinner size="lg" text="Loading GIS Spatial Infrastructure Coordinates..." />
            </div>
          ) : (
            <MapContainer
              center={[21.1824, 72.8225]}
              zoom={12}
              scrollWheelZoom={true}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapBoundsHandler assets={mappedAssets} selectedAsset={selectedAsset} />

              {mappedAssets.map((asset) => {
                const lat = asset.location.latitude;
                const lng = asset.location.longitude;
                const isSelected = selectedAsset?._id === asset._id;
                const markerIcon = createMarkerIcon(asset.condition, isSelected);

                return (
                  <Marker
                    key={asset._id}
                    position={[lat, lng]}
                    icon={markerIcon}
                    eventHandlers={{
                      click: () => setSelectedAsset(asset),
                    }}
                  >
                    <Popup className="gis-asset-popup">
                      <div className="p-1 min-w-[240px]">
                        {/* Popup Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
                          <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {asset.assetId}
                          </span>
                          <StatusBadge status={asset.status} />
                        </div>

                        {/* Asset Title & Type */}
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{asset.name}</h4>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {asset.assetType} • {asset.category}
                        </div>

                        {/* Metrics */}
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Condition:</span>
                            <StatusBadge condition={asset.condition} type="condition" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Health Score:</span>
                            <span className="font-bold text-emerald-700">{asset.healthScore}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Valuation:</span>
                            <span className="font-semibold text-slate-800">{formatCurrency(asset.acquisitionCost)}</span>
                          </div>
                        </div>

                        {/* Open Passport Button */}
                        <div className="mt-3 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => navigate(`/assets/${asset._id}`)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition-colors"
                          >
                            <span>Open Digital Passport</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default GisMap;
