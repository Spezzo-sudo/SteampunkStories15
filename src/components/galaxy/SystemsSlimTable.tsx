import React, { useMemo } from 'react';
import VirtualList from '@/lib/virtualList';
import OwnerChips from '@/components/galaxy/OwnerChips';

interface TableRow {
  id: string;
  coordinate: string;
  systemName: string;
  owners: { id: string; label: string; color: string }[];
  freeSlots: number;
  biomeName?: string;
  biomeAccent?: string;
}

interface SystemsSlimTableProps {
  rows: TableRow[];
  selectedId: string | null;
  onSelect: (row: TableRow) => void;
  height: number;
}

const SystemsSlimTable: React.FC<SystemsSlimTableProps> = ({ rows, selectedId, onSelect, height }) => (
  <div className="rounded-2xl border border-yellow-800/40 bg-black/50">
    <div className="sticky top-0 z-10 grid grid-cols-[140px_1fr_200px] gap-4 border-b border-yellow-800/30 bg-black/70 px-4 py-2 text-xs uppercase tracking-wide text-yellow-100">
      <span>Koordinate</span>
      <span>System</span>
      <span>Besitz</span>
    </div>
    <VirtualList itemCount={rows.length} itemSize={56} height={height}>
      {({ index, style }) => {
        const row = rows[index];
        const isSelected = row.id === selectedId;
        return (
          <button
            type="button"
            key={row.id}
            style={style}
            onClick={() => onSelect(row)}
            className={`grid w-full grid-cols-[140px_1fr_200px] items-center gap-4 px-4 text-left transition-colors ${
              isSelected ? 'bg-yellow-900/30 text-yellow-100' : 'hover:bg-yellow-800/20 text-gray-200'
            }`}
          >
            <span className="font-cinzel text-sm">{row.coordinate}</span>
            <div className="truncate text-sm">
              <span>{row.systemName}</span>
              {row.biomeName && (
                <span
                  className="ml-2 rounded-full border px-2 py-0.5 text-[0.6rem] uppercase tracking-wide"
                  style={{
                    borderColor: row.biomeAccent ?? 'rgba(234,179,8,0.5)',
                    color: row.biomeAccent ?? '#facc15',
                  }}
                >
                  {row.biomeName}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <OwnerChips owners={row.owners} extraCount={Math.max(0, row.owners.length - 3)} />
              <span className="rounded-md bg-black/40 px-2 py-1 text-yellow-200">Frei: {row.freeSlots}</span>
            </div>
          </button>
        );
      }}
    </VirtualList>
  </div>
);

export default SystemsSlimTable;

