// frontend/src/pages/admin/StaffManagement.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarDaysIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PlusIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: 'active',
    qualification: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [qualifications, setQualifications] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    loadStaff();
    loadQualifications();
    loadStatistics();
  }, [filters, pagination.page]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.qualification && { qualification: filters.qualification })
      });

      const response = await api.get(`/staff?${params}`);
      
      setStaff(response.data.staff);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiter:', error);
      toast.error('Mitarbeiter konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadQualifications = async () => {
    try {
      const response = await api.get('/settings/qualifications');
      setQualifications(response.data.qualifications.filter(q => q.is_active));
    } catch (error) {
      console.error('Fehler beim Laden der Qualifikationen:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await api.get('/staff/statistics');
      setStatistics(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleStaffStatus = async (staffId, currentStatus) => {
    try {
      await api.patch(`/staff/${staffId}/status`, {
        is_active: !currentStatus
      });
      
      toast.success(`Mitarbeiter ${!currentStatus ? 'aktiviert' : 'deaktiviert'}`);
      loadStaff();
    } catch (error) {
      console.error('Fehler beim Ändern des Status:', error);
      toast.error('Status konnte nicht geändert werden');
    }
  };

  const exportStaffList = () => {
    // In einer echten Implementierung würde hier ein API-Call zum Export erfolgen
    toast.success('Export wird erstellt...');
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ios-green/10 text-ios-green">
        <CheckCircleIcon className="w-3 h-3 mr-1" />
        Aktiv
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ios-red/10 text-ios-red">
        <XCircleIcon className="w-3 h-3 mr-1" />
        Inaktiv
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ios-gray-900">Personal</h1>
          <p className="text-ios-gray-600">Verwalten Sie Ihre Mitarbeiter</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="ios-button-secondary"
          >
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            Statistiken
          </button>
          <button
            onClick={exportStaffList}
            className="ios-button-secondary"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Exportieren
          </button>
        </div>
      </div>

      {/* Statistics Panel */}
      {showStats && statistics && (
        <div className="mb-6 ios-card p-6">
          <h3 className="text-lg font-semibold text-ios-gray-900 mb-4">Personalstatistiken</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-ios-gray-600">Gesamt</p>
              <p className="text-2xl font-bold text-ios-gray-900">{statistics.totalStats.total_staff}</p>
            </div>
            <div>
              <p className="text-sm text-ios-gray-600">Aktiv</p>
              <p className="text-2xl font-bold text-ios-green">{statistics.totalStats.active_staff}</p>
            </div>
            <div>
              <p className="text-sm text-ios-gray-600">Admins</p>
              <p className="text-2xl font-bold text-ios-purple">{statistics.totalStats.admin_count}</p>
            </div>
            <div>
              <p className="text-sm text-ios-gray-600">Ø Betriebszugehörigkeit</p>
              <p className="text-2xl font-bold text-ios-gray-900">
                {Math.round(statistics.totalStats.avg_tenure_years || 0)} Jahre
              </p>
            </div>
          </div>

          {/* Top Workers */}
          {statistics.topWorkers && statistics.topWorkers.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-ios-gray-700 mb-3">Top Mitarbeiter (nach Arbeitsstunden)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {statistics.topWorkers.slice(0, 6).map((worker, index) => (
                  <div key={worker.id} className="flex items-center justify-between p-3 bg-ios-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-ios-gray-400">#{index + 1}</span>
                      <div>
                        <p className="font-medium text-ios-gray-900">{worker.name}</p>
                        <p className="text-xs text-ios-gray-500">{worker.personal_code}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-ios-blue">{worker.total_hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Qualification Distribution */}
          {statistics.qualificationStats && statistics.qualificationStats.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-ios-gray-700 mb-3">Qualifikationsverteilung</h4>
              <div className="space-y-2">
                {statistics.qualificationStats.map((qual) => (
                  <div key={qual.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: qual.color }}
                      />
                      <span className="text-sm text-ios-gray-700">{qual.name}</span>
                    </div>
                    <span className="text-sm font-medium text-ios-gray-900">{qual.staff_count} Mitarbeiter</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters and Search */}
      <div className="ios-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-ios-gray-500" />
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, status: e.target.value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="ios-input py-2"
            >
              <option value="">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </div>

          {/* Qualification Filter */}
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-5 w-5 text-ios-gray-500" />
            <select
              value={filters.qualification}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, qualification: e.target.value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="ios-input py-2"
            >
              <option value="">Alle Qualifikationen</option>
              {qualifications.map(qual => (
                <option key={qual.id} value={qual.id}>{qual.name}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ios-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Name, E-Mail oder Personal-Code suchen..."
                className="ios-input pl-10 py-2"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Staff List */}
      <div className="ios-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ios-blue mx-auto"></div>
            <p className="mt-4 text-ios-gray-600">Mitarbeiter werden geladen...</p>
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center">
            <UsersIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
            <p className="text-ios-gray-500">Keine Mitarbeiter gefunden</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ios-gray-50 border-b border-ios-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Mitarbeiter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Kontakt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Personal-Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Qualifikationen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Einsätze
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Aktionen</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-ios-gray-200">
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-ios-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {member.profile_image_url ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={member.profile_image_url}
                              alt=""
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-ios-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-ios-gray-600">
                                {member.first_name[0]}{member.last_name[0]}
                              </span>
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-ios-gray-900">
                              {member.first_name} {member.last_name}
                            </div>
                            <div className="text-sm text-ios-gray-500">
                              {member.role === 'admin' && (
                                <span className="text-ios-purple font-medium">Admin • </span>
                              )}
                              {member.city}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <a href={`mailto:${member.email}`} className="text-ios-blue hover:underline">
                            {member.email}
                          </a>
                        </div>
                        <div className="text-sm text-ios-gray-500">
                          <a href={`tel:${member.phone}`} className="hover:underline">
                            {member.phone}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-ios-gray-900">
                          {member.personal_code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-ios-gray-900 max-w-xs truncate">
                          {member.qualifications || <span className="text-ios-gray-400">Keine</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(member.is_active)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ios-gray-900">
                        <div>
                          <span className="font-medium">{member.total_shifts || 0}</span> gesamt
                        </div>
                        <div className="text-ios-gray-500">
                          <span className="text-ios-green">{member.confirmed_shifts || 0}</span> bestätigt
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => toggleStaffStatus(member.id, member.is_active)}
                            className={`p-1 rounded-lg ${
                              member.is_active 
                                ? 'text-ios-red hover:bg-ios-red/10' 
                                : 'text-ios-green hover:bg-ios-green/10'
                            }`}
                            title={member.is_active ? 'Deaktivieren' : 'Aktivieren'}
                          >
                            {member.is_active ? (
                              <XCircleIcon className="h-5 w-5" />
                            ) : (
                              <CheckCircleIcon className="h-5 w-5" />
                            )}
                          </button>
                          <Link
                            to={`/admin/staff/${member.id}`}
                            className="p-1 rounded-lg text-ios-blue hover:bg-ios-blue/10"
                            title="Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="lg:hidden divide-y divide-ios-gray-200">
              {staff.map((member) => (
                <Link
                  key={member.id}
                  to={`/admin/staff/${member.id}`}
                  className="block p-4 hover:bg-ios-gray-50"
                >
                  <div className="flex items-start space-x-3">
                    {member.profile_image_url ? (
                      <img
                        className="h-12 w-12 rounded-full object-cover"
                        src={member.profile_image_url}
                        alt=""
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-ios-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-ios-gray-600">
                          {member.first_name[0]}{member.last_name[0]}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-ios-gray-900 truncate">
                          {member.first_name} {member.last_name}
                          {member.role === 'admin' && (
                            <span className="ml-2 text-xs text-ios-purple">(Admin)</span>
                          )}
                        </p>
                        {getStatusBadge(member.is_active)}
                      </div>
                      <p className="text-sm text-ios-gray-500 truncate">{member.email}</p>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-ios-gray-500">
                        <span className="font-mono font-medium">{member.personal_code}</span>
                        <span>{member.city}</span>
                        <span>{member.total_shifts || 0} Einsätze</span>
                      </div>
                      {member.qualifications && (
                        <p className="mt-1 text-xs text-ios-gray-600 truncate">
                          {member.qualifications}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-ios-gray-50 px-4 py-3 flex items-center justify-between border-t border-ios-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="ios-button-secondary"
                  >
                    Zurück
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="ios-button-secondary"
                  >
                    Weiter
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-ios-gray-700">
                      Zeige{' '}
                      <span className="font-medium">
                        {(pagination.page - 1) * pagination.limit + 1}
                      </span>{' '}
                      bis{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      von{' '}
                      <span className="font-medium">{pagination.total}</span>{' '}
                      Mitarbeitern
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-ios-gray-300 bg-white text-sm font-medium text-ios-gray-500 hover:bg-ios-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-ios-gray-300 bg-white text-sm font-medium text-ios-gray-700">
                        Seite {pagination.page} von {pagination.pages}
                      </span>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-ios-gray-300 bg-white text-sm font-medium text-ios-gray-500 hover:bg-ios-gray-50 disabled:opacity-50"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StaffManagement;



