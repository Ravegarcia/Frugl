const SCAM_PHRASES = [
  // Off-platform payment
  'pay outside',
  'pay via gcash directly',
  'direct gcash',
  'direct maya',
  'bank transfer first',
  'send money first',
  'downpayment first',
  'bayad muna',
  'padala muna',
  'transfer muna',
  'mag-down muna',

  // OTP / Verification codes
  'send me the code',
  'send the otp',
  'give me the otp',
  'verification code',
  'i-send mo yung code',
  'hingi ng code',
  'pasa mo yung code',

  // Refusal to meet / Suspicious delivery
  'cannot meet in person',
  'no meet up',
  'bawal meet up',
  'ship agad bayad muna',
  'deliver first pay later link',
  'click this link to receive payment',
  'claim payment here',
];

export function detectScamPhrases(text: string): string[] {
  const normalized = text.toLowerCase();
  const matched: string[] = [];

  for (const phrase of SCAM_PHRASES) {
    if (normalized.includes(phrase)) {
      matched.push(phrase);
    }
  }

  return matched;
}
