import React from 'react';

interface IconProps {
  className?: string;
}

export const FolderPlusIcon: React.FC<IconProps> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm6 4a1 1 0 011-1h1V8a1 1 0 112 0v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H9a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);