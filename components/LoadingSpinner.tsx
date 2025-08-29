
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-orange-500"></div>
      <p className="text-orange-400 font-orbitron tracking-widest">GENERATING SCENE...</p>
    </div>
  );
};

export default LoadingSpinner;
