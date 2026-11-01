import React from 'react';
import { PowerStatus } from '../../types';

interface StatusIndicatorProps {
  status: PowerStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  showLabel = false,
  size = 'md',
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'ONLINE':
        return {
          dotClass: 'bg-emerald-400 shadow-glow-emerald',
          pingClass: 'bg-emerald-400',
          label: 'Online',
          textColor: 'text-emerald-400',
        };
      case 'IN_SESSION':
        return {
          dotClass: 'bg-amber-400 shadow-glow-amber',
          pingClass: 'bg-amber-400',
          label: 'Dalam Sesi',
          textColor: 'text-amber-400',
        };
      case 'OFFLINE':
        return {
          dotClass: 'bg-rose-500 shadow-glow-rose',
          pingClass: '',
          label: 'Offline',
          textColor: 'text-rose-400',
        };
      default:
        return {
          dotClass: 'bg-slate-500',
          pingClass: '',
          label: 'Tidak Terjangkau',
          textColor: 'text-slate-400',
        };
    }
  };

  const style = getStatusStyles();
  const sizeMap = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span className="relative flex">
{/* Indikator dot stabil tanpa kedipan berlebih */}
        <span
          className={`relative inline-flex rounded-full ${sizeMap[size]} ${style.dotClass}`}
        />
      </span>
      {showLabel && (
        <span className={`text-xs font-medium tracking-wide ${style.textColor}`}>
          {style.label}
        </span>
      )}
    </div>
  );
};
