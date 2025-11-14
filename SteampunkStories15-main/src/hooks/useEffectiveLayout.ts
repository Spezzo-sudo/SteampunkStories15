import { useUiStore } from '@/store/uiStore';
import { useBreakpoint } from './useBreakpoint';

export type EffectiveLayout = 'mobile' | 'desktop';

/**
 * Resolves the currently active layout mode, combining user preference overrides with viewport breakpoints.
 */
export const useEffectiveLayout = (): EffectiveLayout => {
  const preference = useUiStore((state) => state.layoutPref);
  const isDesktop = useBreakpoint('(min-width: 768px)');

  if (preference === 'mobile') {
    return 'mobile';
  }
  if (preference === 'desktop') {
    return 'desktop';
  }
  return isDesktop ? 'desktop' : 'mobile';
};
