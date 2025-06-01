import React from 'react';

const Massages = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Veranstaltungen</h1>
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="max-w-md mx-auto">
          <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Veranstaltungsverwaltung</h2>
          <p className="text-gray-600">Hier werden bald alle Veranstaltungen angezeigt und verwaltet.</p>
        </div>
      </div>
    </div>
  );
};

export default Massages;
