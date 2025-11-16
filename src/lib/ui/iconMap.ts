/**
 * Icon utilities so that ships, buildings and technologies share consistent glyphs.
 */

import { ShipBlueprint } from '@/types';

const SHIP_ROLE_ICONS: Record<ShipBlueprint['role'], string> = {
  Aufklärung: '*',
  Transport: '>>',
  Angriff: '!!',
  Unterstützung: '[]',
  Kolonisation: '##',
};

const BUILDING_ICONS: Record<string, string> = {
  orichalkumSchmelze: 'OR',
  kristallKondensator: 'KR',
  vitrolDestille: 'VT',
  dampfkraftwerk: 'DK',
  energiespeicher: 'EN',
  lagerhaus: 'LG',
  forschungslabor: 'FO',
  werft: 'WF',
  rathaus: 'RH',
  marktplatz: 'MP',
};

const RESEARCH_ICONS: Record<string, string> = {
  aetherdynamik: 'AD',
  kolbenAntrieb: 'KA',
  dampfjet: 'DJ',
  aethermotor: 'AM',
  kesseldruckOptimierung: 'KO',
  differenzmaschinenKalkuel: 'DK',
  observatoriumsnetz: 'OB',
  panzerungstechnik: 'PT',
  teslaSpulenForschung: 'TS',
  lichtbogenIngenieurwesen: 'LI',
  pulverProjektilkunde: 'PP',
  magnetfeldBarrieren: 'MB',
  aetherplasmaEntladungen: 'AE',
  spionagetechnologie: 'SP',
  rumpfverstaerkungsLegierungen: 'RL',
};

/**
 * Returns a glyph for a given ship role.
 *
 * @param role - Blueprint role string.
 */
export const getShipRoleIcon = (role: ShipBlueprint['role']): string => {
  return SHIP_ROLE_ICONS[role] ?? '⚙';
};

/**
 * Returns a glyph that represents the supplied building id.
 *
 * @param buildingId - Identifier from BUILDINGS map.
 */
export const getBuildingIcon = (buildingId: string): string => {
  return BUILDING_ICONS[buildingId] ?? '⚙';
};

/**
 * Returns a glyph for a research technology id.
 *
 * @param researchId - Identifier from RESEARCH map.
 */
export const getResearchIcon = (researchId: string): string => {
  return RESEARCH_ICONS[researchId] ?? '⚙';
};
