export interface CookieConsent {
  technical: boolean;
  analytics: boolean;
  marketing: boolean;
}

const STORAGE_KEY = 'cookie-consent-v1';

/**
 * Se dispara cada vez que la familia decide.
 *
 * La eleccion vivia solo en localStorage y nadie la leia: la analitica arrancaba
 * desde el index.html antes de que el banner apareciera siquiera. Con el evento,
 * quien dependa del consentimiento se entera en el momento y no en la siguiente
 * recarga.
 */
export const CONSENT_EVENT = 'afa:cookie-consent';

export const CookieService = {
  getConsent(): CookieConsent | null {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  },

  setConsent(consent: CookieConsent): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
  },

  /** Unica puerta de la analitica: sin un si explicito, no se carga nada. */
  hasAnalyticsConsent(): boolean {
    return this.getConsent()?.analytics === true;
  },

  acceptAll(): void {
    this.setConsent({
      technical: true,
      analytics: true,
      marketing: true
    });
  },

  declineAll(): void {
    this.setConsent({
      technical: true,
      analytics: false,
      marketing: false
    });
  },

  hasConsent(): boolean {
    return this.getConsent() !== null;
  }
};
