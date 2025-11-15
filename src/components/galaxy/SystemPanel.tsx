import React from 'react';
import SystemDetailContent, { type SystemDetailContentProps } from '@/components/galaxy/SystemDetailContent';
import { GalaxySystem } from '@/types';

interface SystemPanelProps extends Omit<SystemDetailContentProps, 'system'> {
  system: GalaxySystem | null;
  variant?: 'desktop' | 'mobile';
}

/**
 * Container that adapts system details for desktop side panel or mobile bottom sheet usage.
 */
const SystemPanel: React.FC<SystemPanelProps> = ({ system, variant = 'desktop', ...rest }) => {
  if (!system) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-sm text-gray-400">
        <p className="text-xs uppercase tracking-wide text-yellow-300">Kein System gewählt</p>
        <p className="text-center text-sm text-gray-400">
          Klicke oder tippe auf ein Hexfeld, um Details einzublenden.
        </p>
      </div>
    );
  }

  const padding = variant === 'desktop' ? 'p-4' : 'p-2';

  return (
    <div className={`flex h-full flex-col ${padding}`}>
      <div className="flex-1 overflow-y-auto" data-scrollable="true">
        <SystemDetailContent system={system} {...rest} />
      </div>
    </div>
  );
};

export default React.memo(SystemPanel);
