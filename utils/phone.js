// Zimbabwe phone number helpers, shared by the phone-login flow.
// Mirrors the normalization already used client-side in the web app's RegisterPage.

const normalizePhone = (raw) => {
  let s = String(raw || '').replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (s.startsWith('07') || s.startsWith('08')) s = '+263' + s.slice(1);
  else if (/^[78]/.test(s)) s = '+263' + s;
  else if (s.startsWith('263') && !s.startsWith('+')) s = '+' + s;
  return s;
};

// Existing accounts may have their phone stored in any of these shapes
// (web normalizes to +263..., mobile app sends the raw user input as-is).
const phoneLookupCandidates = (raw) => {
  const trimmed = String(raw || '').trim();
  const e164 = normalizePhone(trimmed);
  const candidates = new Set([trimmed, e164]);

  if (e164.startsWith('+263')) {
    const digits = e164.slice(1); // 263771234567
    const local = '0' + e164.slice(4); // 0771234567
    candidates.add(digits);
    candidates.add(local);
  }

  return Array.from(candidates).filter(Boolean);
};

// SMS gateway expects the destination without the leading '+'.
const toGatewayFormat = (e164) => String(e164 || '').replace(/^\+/, '');

module.exports = { normalizePhone, phoneLookupCandidates, toGatewayFormat };
