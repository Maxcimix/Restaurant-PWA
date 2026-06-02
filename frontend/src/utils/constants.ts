/**
 * Formatea un número como pesos colombianos (COP).
 * Ejemplo: 12000 → "$ 12.000"
 */
export const formatCOP = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};