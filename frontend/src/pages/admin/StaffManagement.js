
// frontend/src/pages/admin/StaffManagement.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import StaffDetailModal from '../../components/StaffDetailModal';

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [qualificationFilter, setQualificationFilter] = useState('');
  const [qualifications, setQualifications] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchQualifications();
  }, [searchTerm, statusFilter, qualificationFilter]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      
      let filteredStaff = response.data || [];
      
      // Client-side filtering
      if (searchTerm) {
        filteredStaff = filteredStaff.filter(member =>
          `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.personal_code?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (statusFilter !== 'all') {
        filteredStaff = filteredStaff.filter(member => 
          statusFilter === 'active' ? member.is_active : !member.is_active
        );
      }
      
      setStaff(filteredStaff);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Fehler beim Laden der Mitarbeiter');
    } finally {
      setLoading(false);
    }
  };

  const fetchQualifications = async () => {
    try {
      const response = await api.get('/qualifications');
      setQualifications(response.data);
    } catch (error) {
      console.error('Error fetching qualifications:', error);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await api.patch(`/users/${userId}/toggle-active`);
      toast.success(currentStatus ? 'Mitarbeiter deaktiviert' : 'Mitarbeiter aktiviert');
      fetchStaff();
    } catch (error) {
      toast.error('Fehler beim Ändern des Status');
    }
  };

  const handleViewDetails = (staffMember) => {
    setSelectedStaff(staffMember);
    setModalOpen(true);
  };

  const getQualificationBadges = (staffMember) => {
    // This would need to be implemented in the backend
    return [];
  };

  // Icons
  const UserIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  const PhoneIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );

  const MailIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  const CheckCircleIcon = () => (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const XCircleIcon = () => (
    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mitarbeiterverwaltung</h1>
          <p className="text-sm text-gray-600 mt-1">
            {staff.length} Mitarbeiter insgesamt
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportieren
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Mitarbeiter hinzufügen
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Suche nach Name, E-Mail oder Personal-Code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
          <select
            value={qualificationFilter}
            onChange={(e) => setQualificationFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Alle Qualifikationen</option>
            {qualifications.map(qual => (
              <option key={qual.id} value={qual.id}>{qual.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Mitarbeiter...</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <UserIcon />
          <p className="mt-2 text-gray-600">Keine Mitarbeiter gefunden</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => handleViewDetails(member)}
            >
              <div className="p-6">
                {/* Header with Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {member.first_name?.[0]}{member.last_name?.[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {member.first_name} {member.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {member.personal_code}
                      </p>
                    </div>
                  </div>
                  {member.is_active ? <CheckCircleIcon /> : <XCircleIcon />}
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MailIcon />
                    <span className="ml-2 truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <PhoneIcon />
                    <span className="ml-2">{member.phone || 'Keine Nummer'}</span>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${member.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}
                  `}>
                    {member.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Seit {formatDate(member.created_at)}
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(member.id, member.is_active);
                    }}
                    className={`text-sm font-medium ${
                      member.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'
                    }`}
                  >
                    {member.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(member);
                    }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Details →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff Detail Modal */}
      {selectedStaff && (
        <StaffDetailModal
          staff={selectedStaff}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedStaff(null);
          }}
          onUpdate={() => {
            fetchStaff();
            setModalOpen(false);
            setSelectedStaff(null);
          }}
        />
      )}
    </div>
  );
};

export default StaffManagement;
