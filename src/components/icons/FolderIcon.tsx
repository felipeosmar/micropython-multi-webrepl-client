import React from 'react';

interface IconProps {
  className?: string;
}

export const FolderIcon: React.FC<IconProps> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  </svg>
);