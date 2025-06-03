// frontend/src/components/layouts/KioskLayout.js
import React from 'react';

const KioskLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ios-blue via-ios-purple to-ios-pink">
      <div className="min-h-screen backdrop-blur-sm bg-white/10">
        {children}
      </div>
    </div>
  );
};

export default KioskLayout;
