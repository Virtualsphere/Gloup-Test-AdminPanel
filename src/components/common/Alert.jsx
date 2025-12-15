import React from 'react';

export const Alert = ({ className, children }) => {
  return (
    <div className={`p-4 rounded-lg ${className}`}>
      {children}
    </div>
  );
};

export const AlertDescription = ({ children }) => {
  return <div className="text-sm">{children}</div>;
};

export default Alert;