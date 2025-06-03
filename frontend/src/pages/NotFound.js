import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-ios-gray-200">404</h1>
        <h2 className="text-2xl font-semibold text-ios-gray-900 mt-4">
          Seite nicht gefunden
        </h2>
        <p className="text-ios-gray-600 mt-2 mb-8">
          Die gesuchte Seite existiert nicht oder wurde verschoben.
        </p>
        <Link to="/" className="ios-button-primary inline-flex items-center">
          <HomeIcon className="h-5 w-5 mr-2" />
          Zur Startseite
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
