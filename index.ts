import type { DealConfig, FullEngineeringOutput, SupplyIntelSku } from '../types/schema';
import { computeCivilPlinth } from './civilPlinth';
import { computeElectricalSld } from './electricalSld';
import { computeMepCooling } from './mepCooling';
import { computeSupplyChainScore } from './supplyChain';
import { computeCommercialTco } from './tcoEngine';

export { computeCivilPlinth } from './civilPlinth';
export { computeElectricalSld, resolveElectricalStandards } from './electricalSld';
export { computeMepCooling } from './mepCooling';
export { computeSupplyChainScore, classifyPppMii } from './supplyChain';
export { computeCommercialTco } from './tcoEngine';
export { fetchOpenMeteoEra5Climate, lookupIs1893SeismicZone } from './climateSeismic';

export function computeSiteEngineering(
  deal: DealConfig,
  supplyIntel: SupplyIntelSku[]
): FullEngineeringOutput {
  const mep = computeMepCooling(deal);
  const civil = computeCivilPlinth(deal, mep);
  const electrical = computeElectricalSld(deal, mep);
  const supplyChain = computeSupplyChainScore(supplyIntel);
  const commercial = computeCommercialTco(deal, mep, civil, electrical, supplyIntel);

  return {
    mep,
    civil,
    electrical,
    supplyChain,
    commercial
  };
}
