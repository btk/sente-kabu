'use client';

import Image from 'next/image';

// Card component that displays a card from the Cards folder
// Cards are named: 1a.png, 1b.png, 1c.png, 1d.png for January, etc.
export default function Card({ card, faceUp = true, onClick, className = '' }) {
  if (!card) {
    return (
      <div className={`w-20 h-32 bg-gray-200 border-2 border-gray-300 rounded-lg ${className}`} />
    );
  }

  if (!faceUp) {
    return (
      <div
        className={`w-20 h-32 bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-900 rounded-lg shadow-lg cursor-pointer transition-transform hover:scale-105 ${className}`}
        onClick={onClick}
      >
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white text-xs font-bold">?</div>
        </div>
      </div>
    );
  }

  // Get card index from id (format: "month-cardIndex", e.g., "1-0", "1-1", "1-2", "1-3")
  const cardIndex = parseInt(card.id.split('-')[1]) || 0; // 0-3
  
  // Map card index to letter: 0→a, 1→b, 2→c, 3→d
  const letter = String.fromCharCode(97 + cardIndex); // 97 is 'a' in ASCII
  
  // Build image path: /Cards/1a.png, /Cards/1b.png, etc.
  const imagePath = `/Cards/${card.month}${letter}.png`;

  return (
    <div
      className={`w-20 h-32 border-2 border-gray-800 rounded-lg shadow-lg bg-white overflow-hidden relative ${className}`}
      onClick={onClick}
    >
      <Image
        src={imagePath}
        alt={`Hanafuda card ${card.month}${letter}`}
        width={80}
        height={128}
        className="w-full h-full object-cover"
        unoptimized
      />
    </div>
  );
}

