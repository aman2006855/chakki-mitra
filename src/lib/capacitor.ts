export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const Capacitor = (window as any).Capacitor;
  return Capacitor?.isNativePlatform?.() === true;
}

export function getPlatform(): string {
  if (typeof window === 'undefined') return 'web';
  const Capacitor = (window as any).Capacitor;
  return Capacitor?.getPlatform?.() || 'web';
}
