// Simple E.164 normalizer with default country code if missing
// Note: This does not validate carrier or region, only formats digits

export function normalizePhoneNumber(raw: string, defaultCountryCode: string): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  // If starts with +, keep digits and plus
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/[^0-9+]/g, '');
    return digits.length > 4 ? digits : null;
  }
  // Remove non-digits
  let digitsOnly = trimmed.replace(/\D/g, '');
  // Drop leading zeros
  digitsOnly = digitsOnly.replace(/^0+/, '');
  if (!digitsOnly) return null;
  const code = defaultCountryCode && defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode || ''}`;
  const formatted = `${code}${digitsOnly}`;
  return formatted.length > code.length ? formatted : null;
}


