import React, { useEffect } from 'react';
import { formatSystemCoordinate } from '@/lib/hex';
import SystemDetailContent, { type SystemDetailContentProps } from '@/components/galaxy/SystemDetailContent';

/**
 * Detailed modal for a galaxy system, listing every slot and contextual actions.
 */
const SystemModal: React.FC<SystemDetailContentProps> = ({ system, onClose, ...rest }) => {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={`System ${formatSystemCoordinate(system)}`}
    >
      <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-yellow-800/40 bg-black/85 p-6 text-sm shadow-2xl">
        <div className="h-full overflow-y-auto" data-scrollable="true">
          <SystemDetailContent system={system} onClose={onClose} {...rest} />
        </div>
      </div>
    </div>
  );
};

export default SystemModal;
