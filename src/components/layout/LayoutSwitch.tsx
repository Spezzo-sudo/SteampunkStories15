import React from 'react';
import { useUiStore, type LayoutPreference } from '@/store/uiStore';

/**
 * Dropdown control allowing players to override the responsive galaxy layout.
 */
const LayoutSwitch: React.FC = () => {
  const preference = useUiStore((state) => state.layoutPref);
  const setPreference = useUiStore((state) => state.setLayoutPref);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPreference(event.target.value as LayoutPreference);
  };

  return (
    <label className="inline-flex items-center gap-2 text-xs text-gray-300">
      <span className="uppercase tracking-wide text-yellow-300">Layout</span>
      <select
        value={preference}
        onChange={handleChange}
        className="rounded border border-yellow-800/40 bg-black/40 px-2 py-1 text-yellow-100"
      >
        <option value="auto">Auto</option>
        <option value="mobile">Mobile</option>
        <option value="desktop">Desktop</option>
      </select>
    </label>
  );
};

export default React.memo(LayoutSwitch);
