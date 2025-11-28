// Oicho-Kabu game logic

// Card values: January (1) through December (12)
// Full Hanafuda deck with 48 cards
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Create a deck of 48 cards (4 cards per month, 12 months)
export function createDeck() {
  const deck = [];
  for (let month = 1; month <= 12; month++) {
    for (let card = 0; card < 4; card++) {
      deck.push({
        month: month,
        value: month, // Card value equals month number
        id: `${month}-${card}`
      });
    }
  }
  return shuffleDeck(deck);
}

// Fisher-Yates shuffle
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Calculate hand score (last digit of total)
export function calculateScore(hand) {
  const total = hand.reduce((sum, card) => sum + card.value, 0);
  return total % 10;
}

// Compare two scores (returns 1 if score1 > score2, -1 if score1 < score2, 0 if equal)
export function compareScores(score1, score2) {
  if (score1 > score2) return 1;
  if (score1 < score2) return -1;
  return 0; // Tie - dealer wins
}

// Determine if a third card is mandatory, optional, or forbidden
export function getThirdCardRule(score) {
  if (score <= 3) return 'mandatory'; // Must take third card
  if (score >= 7) return 'forbidden'; // Cannot take third card
  return 'optional'; // Can choose (4, 5, or 6)
}

// Check if hand needs a third card based on rules
export function needsThirdCard(hand) {
  const score = calculateScore(hand);
  const rule = getThirdCardRule(score);
  return rule === 'mandatory';
}

// Check if hand can take a third card
export function canTakeThirdCard(hand) {
  const score = calculateScore(hand);
  const rule = getThirdCardRule(score);
  return rule !== 'forbidden';
}

