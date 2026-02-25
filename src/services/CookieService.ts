export interface CookieConsent {
  technical: boolean;
  analytics: boolean;
  marketing: boolean;
}

const STORAGE_KEY = 'cookie-consent-v1';

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
