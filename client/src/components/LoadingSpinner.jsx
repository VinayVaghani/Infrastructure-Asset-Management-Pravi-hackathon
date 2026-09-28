import React from 'react';

const LoadingSpinner = ({ size = 'md', color = 'current', text = '' }) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  const colorMap = {
    current: 'border-current border-t-transparent',
    white: 'border-white border-t-transparent',
    slate: 'border-slate-600 border-t-transparent',
    gov: 'border-blue-700 border-t-transparent',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={`rounded-full animate-spin ${sizeMap[size] || sizeMap.md} ${
          colorMap[color] || colorMap.current
        }`}
        role="status"
        aria-label="loading"
      />
      {text && <span className="text-sm text-slate-500 font-medium">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
