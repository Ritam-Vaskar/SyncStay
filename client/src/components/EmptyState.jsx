import React from 'react';

export const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4 text-gray-400 dark:text-gray-600">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};
