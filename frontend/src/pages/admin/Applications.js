// frontend/src/pages/admin/Applications.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0,
    total: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadApplications();
  }, [filters.status, filters.search, pagination.page]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      });

      const response = await api.get(`/applications?${params}`);
      
      setApplications(response.data.applications);
      setPagination(response.data.pagination);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Fehler beim Laden der Bewerbungen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ios-orange/10 text-ios-orange">
            <ClockIcon className="w-3 h-3 mr-1" />
            Offen
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ios-green/10 text-ios-green">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Angenommen
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ios-red/10 text-ios-red">
            <XCircleIcon className="w-3 h-3 mr-1" />
            Abgelehnt
          </span>
        );
      default:
        return null;
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="ios-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ios-gray-600">{title}</p>
          <p className="mt-1 text-2xl font-bold text-ios-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-xl bg-${color}/10`}>
          <Icon className={`h-6 w-6 text-${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ios-gray-900">Bewerbungen</h1>
        <p className="text-ios-gray-600">Verwalten Sie eingehende Bewerbungen</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Gesamt"
          value={stats.total}
          icon={UserGroupIcon}
          color="ios-blue"
        />
        <StatCard
          title="Offen"
          value={stats.pending}
          icon={ClockIcon}
          color="ios-orange"
        />
        <StatCard
          title="Angenommen"
          value={stats.accepted}
          icon={CheckCircleIcon}
          color="ios-green"
        />
        <StatCard
          title="Abgelehnt"
          value={stats.rejected}
          icon={XCircleIcon}
          color="ios-red"
        />
      </div>

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
              <option value="pending">Offen</option>
              <option value="accepted">Angenommen</option>
              <option value="rejected">Abgelehnt</option>
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
                placeholder="Name oder E-Mail suchen..."
                className="ios-input pl-10 py-2"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Applications Table */}
      <div className="ios-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ios-blue mx-auto"></div>
            <p className="mt-4 text-ios-gray-600">Bewerbungen werden geladen...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
            <p className="text-ios-gray-500">Keine Bewerbungen gefunden</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ios-gray-50 border-b border-ios-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Bewerber
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Kontakt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Ort
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Aktionen</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-ios-gray-200">
                  {applications.map((application) => (
                    <tr key={application.id} className="hover:bg-ios-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {application.profile_image_url ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={application.profile_image_url}
                              alt=""
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-ios-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-ios-gray-600">
                                {application.first_name[0]}{application.last_name[0]}
                              </span>
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-ios-gray-900">
                              {application.first_name} {application.last_name}
                            </div>
                            <div className="text-sm text-ios-gray-500">
                              {format(parseISO(application.birth_date), 'dd.MM.yyyy')} ({
                                new Date().getFullYear() - new Date(application.birth_date).getFullYear()
                              } Jahre)
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-ios-gray-900">{application.email}</div>
                        <div className="text-sm text-ios-gray-500">{application.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-ios-gray-900">
                          {application.postal_code} {application.city}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ios-gray-500">
                        {format(parseISO(application.created_at), 'dd.MM.yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(application.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/admin/applications/${application.id}`}
                          className="text-ios-blue hover:text-blue-600"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden divide-y divide-ios-gray-200">
              {applications.map((application) => (
                <Link
                  key={application.id}
                  to={`/admin/applications/${application.id}`}
                  className="block p-4 hover:bg-ios-gray-50"
                >
                  <div className="flex items-start space-x-3">
                    {application.profile_image_url ? (
                      <img
                        className="h-12 w-12 rounded-full object-cover"
                        src={application.profile_image_url}
                        alt=""
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-ios-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-ios-gray-600">
                          {application.first_name[0]}{application.last_name[0]}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-ios-gray-900 truncate">
                          {application.first_name} {application.last_name}
                        </p>
                        {getStatusBadge(application.status)}
                      </div>
                      <p className="text-sm text-ios-gray-500 truncate">{application.email}</p>
                      <p className="text-sm text-ios-gray-500">
                        {application.city} • {format(parseISO(application.created_at), 'dd.MM.yyyy')}
                      </p>
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
                      Ergebnissen
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
                      {[...Array(pagination.pages)].map((_, index) => (
                        <button
                          key={index + 1}
                          onClick={() => setPagination(prev => ({ ...prev, page: index + 1 }))}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pagination.page === index + 1
                              ? 'z-10 bg-ios-blue border-ios-blue text-white'
                              : 'bg-white border-ios-gray-300 text-ios-gray-700 hover:bg-ios-gray-50'
                          }`}
                        >
                          {index + 1}
                        </button>
                      ))}
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

export default Applications;



