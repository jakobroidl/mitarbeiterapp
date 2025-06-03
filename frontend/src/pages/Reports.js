// frontend/src/pages/Reports.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reports?period=${period}`);
      setReports(response.data);
    } catch (error) {
      console.error('Fehler beim Abrufen der Berichte:', error);
      toast.error('Fehler beim Laden der Berichte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Berichte</h1>
      <div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="week">Woche</option>
          <option value="month">Monat</option>
        </select>
      </div>
      {loading ? (
        <div>Lade Berichte...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Mitarbeiter</th>
              <th>Datum</th>
              <th>Stunden</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td>{report.staff_name}</td>
                <td>
                  {period === 'week'
                    ? `KW ${format(new Date(report.date), 'w', { locale: de })}`
                    : format(new Date(report.date), 'MMM yyyy', { locale: de })}
                </td>
                <td>{report.hours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Reports;
