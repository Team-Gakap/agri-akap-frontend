function stapleCrop(value: string): 'rice' | 'corn' | null {
  const key = value.trim().toLowerCase();
  const compact = key.replace(/[\s/_-]+/g, '');
  if (!compact) return null;
  if (compact === 'rice' || compact === 'palay' || compact === 'ricepalay') return 'rice';
  if (key.includes('rice') && key.includes('palay')) return 'rice';
  if (compact === 'corn' || compact === 'maize' || compact === 'mais' || compact === 'cornmaize') return 'corn';
  return null;
}

export function plotMatchesCrop(plotCommodity: string, crop: string): boolean {
  const plotStaple = stapleCrop(plotCommodity);
  const cropStaple = stapleCrop(crop);
  if (plotStaple && cropStaple) return plotStaple === cropStaple;
  return plotCommodity.trim().toLowerCase() === crop.trim().toLowerCase();
}
