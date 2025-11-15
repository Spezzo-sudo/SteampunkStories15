import React from 'react';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';

interface RequirementBadgeProps {
  name: string;
  required: string; // e.g., "Level 3", "1 required", "Stufe 2"
  met: boolean;
  blocked?: boolean; // Special case for energy blocking
  compact?: boolean;
}

/**
 * Displays a requirement status badge indicating whether a prerequisite is met.
 *
 * Usage:
 * ```tsx
 * <RequirementBadge
 *   name="Forschungslabor"
 *   required="Level 2"
 *   met={buildings['forschungslabor'] >= 2}
 * />
 * ```
 *
 * @param name - Display name of the requirement (building, research, etc.)
 * @param required - Human-readable requirement text (e.g., "Level 3", "Stufe 2")
 * @param met - Whether the requirement is currently met
 * @param blocked - Optional flag for hard blocks like energy (shows differently from unmet)
 * @param compact - If true, uses smaller styling for inline display
 */
export const RequirementBadge: React.FC<RequirementBadgeProps> = ({
  name,
  required,
  met,
  blocked = false,
  compact = false,
}) => {
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          met
            ? 'bg-green-100 text-green-700'
            : blocked
              ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'
        }`}
      >
        {met ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : blocked ? (
          <AlertCircle className="w-3 h-3" />
        ) : (
          <Lock className="w-3 h-3" />
        )}
        <span>
          {name} {required}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border-l-4 transition-colors ${
        met
          ? 'bg-green-50 border-l-green-500 text-green-900'
          : blocked
            ? 'bg-red-50 border-l-red-500 text-red-900'
            : 'bg-amber-50 border-l-amber-500 text-amber-900'
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">
        {met ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : blocked ? (
          <AlertCircle className="w-5 h-5 text-red-600" />
        ) : (
          <Lock className="w-5 h-5 text-amber-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{name}</div>
        <div className="text-xs opacity-75 mt-0.5">{required}</div>
      </div>
      {met && <div className="text-xs font-semibold text-green-600">✓</div>}
    </div>
  );
};

export default RequirementBadge;
