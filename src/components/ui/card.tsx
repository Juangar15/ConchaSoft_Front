import React from 'react';

type CardProps = React.PropsWithChildren<{ className?: string }>

export const Card: React.FC<CardProps> = ({ className = '', children }) => (
  <div className={`rounded-2xl border border-gray-400 bg-gray-100 p-5 dark:border-gray-800 dark:bg-white/[0.03] ${className}`}>{children}</div>
);

export const CardHeader: React.FC<CardProps> = ({ className = '', children }) => (
  <div className={`flex flex-row items-center justify-between space-y-0 pb-2 ${className}`}>{children}</div>
);

export const CardContent: React.FC<CardProps> = ({ className = '', children }) => (
  <div className={className}>{children}</div>
);

export const CardTitle: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = '', children }) => (
  <h3 className={`text-sm font-medium ${className}`}>{children}</h3>
);

export default Card;




