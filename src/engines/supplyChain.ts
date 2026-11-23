import type { SupplyCategory, SupplyChainScoreResult, SupplyIntelSku } from '../types/schema';

export function classifyPppMii(
  miiPercent: number
): SupplyChainScoreResult['pppMiiClass'] {
  if (miiPercent >= 50) return 'Class-I Local Supplier';
  if (miiPercent >= 20) return 'Class-II Local Supplier';
  return 'Non-Local Supplier';
}

/**
 * Evaluates the Make-in-India (MII %) local content score across the active India OEM SKU
 * catalog (weighted by unit price proxy), PPP-MII Class-I/II eligibility, and longest lead time.
 */
export function computeSupplyChainScore(skus: SupplyIntelSku[]): SupplyChainScoreResult {
  if (!skus.length) {
    return {
      weightedMiiPercent: 0,
      pppMiiClass: 'Non-Local Supplier',
      totalSkusEvaluated: 0,
      longestLeadTimeWeeks: 0,
      criticalPathSku: 'N/A',
      categoryBreakdown: []
    };
  }

  let totalWeight = 0;
  let weightedMiiSum = 0;
  let longestLeadTimeWeeks = 0;
  let criticalPathSku = skus[0].name;

  const byCat = new Map<SupplyCategory, SupplyIntelSku[]>();

  for (const sku of skus) {
    const weight = Math.max(1, sku.unitPriceInrLakhs);
    totalWeight += weight;
    weightedMiiSum += weight * sku.miiPercent;

    if (sku.leadTimeWeeks > longestLeadTimeWeeks) {
      longestLeadTimeWeeks = sku.leadTimeWeeks;
      criticalPathSku = `${sku.skuId} — ${sku.name}`;
    }

    const list = byCat.get(sku.category) ?? [];
    list.push(sku);
    byCat.set(sku.category, list);
  }

  const weightedMiiPercent = Number((weightedMiiSum / Math.max(1, totalWeight)).toFixed(1));

  const categoryBreakdown = Array.from(byCat.entries()).map(([category, list]) => {
    const avgMiiPercent = Number(
      (list.reduce((sum, s) => sum + s.miiPercent, 0) / list.length).toFixed(1)
    );
    const maxLeadWeeks = Math.max(...list.map((s) => s.leadTimeWeeks));
    return {
      category,
      skuCount: list.length,
      avgMiiPercent,
      maxLeadWeeks
    };
  });

  return {
    weightedMiiPercent,
    pppMiiClass: classifyPppMii(weightedMiiPercent),
    totalSkusEvaluated: skus.length,
    longestLeadTimeWeeks,
    criticalPathSku,
    categoryBreakdown
  };
}
