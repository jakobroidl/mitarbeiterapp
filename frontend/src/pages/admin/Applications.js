import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {format} from 'date-fns';
import {de} from 'date-fns/locale';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, [searchTerm, statusFilter]);

  const fetchApplications = async (page = 1) => {
    try {
      setLoading(true);
      console.log('📡 Fetching applications...');
      
      const params = {
        page,
        limit: 20,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
      };

      const response = await api.get('/applications', { params });
      console.log('✅ Applications response:', response.data);
      
      setApplications(response.data.applications || []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('❌ Error fetching applications:', error);
      toast.error('Fehler beim Laden der Bewerbungen');
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Offen' },
      accepted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Angenommen' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Abgelehnt' },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const handleAccept = async (id) => {
    try {
      await api.post(`/applications/${id}/accept`);
      toast.success('Bewerbung angenommen');
      fetchApplications();
    } catch (error) {
      toast.error('Fehler beim Annehmen der Bewerbung');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Möchten Sie diese Bewerbung wirklich ablehnen?')) return;
    
    try {
      await api.post(`/applications/${id}/reject`);
      toast.success('Bewerbung abgelehnt');
      fetchApplications();
    } catch (error) {
      toast.error('Fehler beim Ablehnen der Bewerbung');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Bewerbungen</h1>
        <div className="flex space-x-3">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50">
            Filter
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700">
            Exportieren
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Suche nach Name oder E-Mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Alle Status</option>
            <option value="pending">Offen</option>
            <option value="accepted">Angenommen</option>
            <option value="rejected">Abgelehnt</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Bewerbungen...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-gray-600">Keine Bewerbungen gefunden</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bewerber
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-Mail
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold">
                            {app.first_name?.[0]}{app.last_name?.[0]}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {app.first_name} {app.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        Ansehen
                      </button>
                      {app.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleAccept(app.id)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Annehmen
                          </button>
                          <button 
                            onClick={() => handleReject(app.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Ablehnen
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Seite {pagination.page} von {pagination.pages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => fetchApplications(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zurück
                </button>
                <button
                  onClick={() => fetchApplications(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Applications;
