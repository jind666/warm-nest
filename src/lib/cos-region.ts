export function normalizeCosRegion(region: string | undefined) {
  const trimmedRegion = region?.trim();

  if (!trimmedRegion) {
    return undefined;
  }

  return trimmedRegion.startsWith("cos.") ? trimmedRegion.slice(4) : trimmedRegion;
}