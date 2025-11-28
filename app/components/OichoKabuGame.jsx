'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Card from './Card';
import { createDeck, calculateScore, compareScores, canTakeThirdCard } from '../utils/gameLogic';

const INITIAL_BALANCE = 1000;
const MIN_BET = 10;
const MAX_BET = 100;

export default function OichoKabuGame() {
  const [deck, setDeck] = useState([]);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(0); // Single bet
  const [tableau, setTableau] = useState([]); // Single tableau
  const [dealerHand, setDealerHand] = useState([]);
  const [gamePhase, setGamePhase] = useState('betting'); // betting, dealing, playerDecisions, dealerTurn, showdown
  const [dealerCardFaceUp, setDealerCardFaceUp] = useState(false);
  const [result, setResult] = useState(null); // Win/loss
  const [drawingCard, setDrawingCard] = useState(false); // Animation state
  const [cardsDealt, setCardsDealt] = useState(0); // Track how many cards have been dealt in initial deal
  const [flyingCard, setFlyingCard] = useState(null); // Card currently animating
  
  // Refs for animation positioning
  const deckRef = useRef(null);
  const dealerHandRef = useRef(null);
  const playerHandRef = useRef(null);

  // Initialize deck
  useEffect(() => {
    setDeck(createDeck());
  }, []);

  // Place bet
  const placeBet = (amount) => {
    if (gamePhase !== 'betting') return;
    if (balance < amount) return;
    
    setBet(bet + amount);
    setBalance(balance - amount);
  };

  // Start the deal - initialize dealing phase
  const startDeal = () => {
    if (gamePhase !== 'betting') return;
    if (bet === 0) {
      alert('Please place a bet');
      return;
    }

    setGamePhase('dealing');
    setCardsDealt(0);
    // Cards will be drawn by clicking the deck
  };

  // Draw a card from the deck with animation
  const drawCard = (target) => {
    if (drawingCard || deck.length === 0) return;
    
    setDrawingCard(true);
    
    const newDeck = [...deck];
    const card = newDeck.shift();
    
    // Calculate positions before adding card (based on current card count)
    let startX = 0, startY = 0, endX = 0, endY = 0;
    
    if (deckRef.current) {
      const deckRect = deckRef.current.getBoundingClientRect();
      startX = deckRect.left + deckRect.width / 2;
      startY = deckRect.top + deckRect.height / 2;
    }
    
    if (target === 'player' && playerHandRef.current) {
      const handRect = playerHandRef.current.getBoundingClientRect();
      const cardCount = tableau.length; // Current count before adding new card
      endX = handRect.left + 80 + (cardCount * 88); // Position for new card
      endY = handRect.top + handRect.height / 2;
    } else if (target === 'dealer' && dealerHandRef.current) {
      const handRect = dealerHandRef.current.getBoundingClientRect();
      const cardCount = dealerHand.length; // Current count before adding new card
      endX = handRect.left + 80 + (cardCount * 88);
      endY = handRect.top + handRect.height / 2;
    }
    
    // Add card to hand immediately so player can see it (especially for strategy)
    if (target === 'player') {
      const newTableau = [...tableau];
      newTableau.push(card);
      setTableau(newTableau);
    } else if (target === 'dealer') {
      const newDealerHand = [...dealerHand];
      newDealerHand.push(card);
      setDealerHand(newDealerHand);
    }
    
    setDeck(newDeck);
    
    // Set flying card for animation (visual effect only, card already in hand)
    setFlyingCard({ 
      card, 
      target,
      startX,
      startY,
      endX,
      endY
    });
    
    // Clear animation after it completes
    setTimeout(() => {
      setFlyingCard(null);
      setDrawingCard(false);
      
      // Check if initial deal is complete
      if (gamePhase === 'dealing') {
        const newCardsDealt = cardsDealt + 1;
        setCardsDealt(newCardsDealt);
        
        if (newCardsDealt === 3) {
          // Initial deal complete: player, dealer (face down), player
          setGamePhase('playerDecisions');
        }
      }
    }, 600); // Animation duration
  };

  // Add third card to tableau - player can always choose
  const addThirdCard = () => {
    if (gamePhase !== 'playerDecisions') return;
    if (tableau.length >= 3) return;
    
    drawCard('player');
  };

  // Move to dealer's turn
  const startDealerTurn = () => {
    if (gamePhase !== 'playerDecisions') return;
    
    // Player can finalize with 2 or 3 cards - no restrictions
    setGamePhase('dealerTurn');
    setDealerCardFaceUp(true);
    
    // Dealer's second card will be drawn automatically, then auto-draw third if needed
  };

  // Handle dealer's automatic card drawing
  useEffect(() => {
    if (gamePhase !== 'dealerTurn') return;
    if (drawingCard) return; // Don't run if a card is currently being drawn
    
    const timeoutId = setTimeout(() => {
      // Double-check we're still in dealer turn and not drawing
      if (drawingCard) return;
      
      // Check dealer hand length directly
      const currentLength = dealerHand.length;
      
      if (currentLength === 1) {
        // Draw dealer's second card automatically
        drawCard('dealer');
      } else if (currentLength === 2) {
        // Check if dealer needs third card
        const dealerScore = calculateScore(dealerHand);
        if (canTakeThirdCard(dealerHand) && dealerScore <= 5) {
          drawCard('dealer');
        } else {
          // Show results - dealer stands
          showResults(dealerHand);
        }
      } else if (currentLength >= 3) {
        // Dealer has all cards, show results
        showResults(dealerHand);
      }
    }, 1000); // Delay before dealer action

    return () => clearTimeout(timeoutId);
  }, [gamePhase, dealerHand.length, drawingCard]);

  // Show results and calculate payouts
  const showResults = (finalDealerHand) => {
    setGamePhase('showdown');
    
    // Use functional updates to get latest state values
    setTableau(currentTableau => {
      setBet(currentBet => {
        const dealerScore = calculateScore(finalDealerHand);
        const tableauScore = calculateScore(currentTableau);
        const comparison = compareScores(tableauScore, dealerScore);
        
        if (comparison > 0) {
          // Player wins
          setResult('win');
          setBalance(prevBalance => prevBalance + currentBet * 2); // 1:1 payout
        } else if (comparison === 0) {
          // Tie - push, return bet
          setResult('draw');
          setBalance(prevBalance => prevBalance + currentBet); // Return bet
        } else {
          // Dealer wins
          setResult('loss');
        }
        
        return currentBet; // Return unchanged
      });
      return currentTableau; // Return unchanged
    });
  };

  // Start new round
  const newRound = () => {
    if (deck.length < 24) {
      // Reshuffle if deck is getting low (half of 48 cards)
      setDeck(createDeck());
    }
    setBet(0);
    setTableau([]);
    setDealerHand([]);
    setGamePhase('betting');
    setDealerCardFaceUp(false);
    setResult(null);
    setCardsDealt(0);
  };

  // Determine what card should be drawn next during initial deal
  const getNextDealTarget = () => {
    if (cardsDealt === 0) return 'player'; // First card to player
    if (cardsDealt === 1) return 'dealer'; // Second card to dealer (face down)
    if (cardsDealt === 2) return 'player'; // Third card to player
    return null;
  };

  // Handle deck click
  const handleDeckClick = () => {
    if (drawingCard) return;
    
    if (gamePhase === 'dealing') {
      const target = getNextDealTarget();
      if (target) {
        drawCard(target);
      }
    } else if (gamePhase === 'playerDecisions') {
      // Player can always draw third card if they have 2 cards
      if (tableau.length === 2) {
        drawCard('player');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-950 p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-2xl tracking-wide">
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-300 bg-clip-text text-transparent">
              Sente-Kabu
            </span>
          </h1>
          <p className="text-yellow-200/80 text-sm mb-4 italic">A spin-off of Oicho-Kabu</p>
          <div className="flex items-center justify-center gap-4">
            <div className="bg-black/30 backdrop-blur-sm px-6 py-2 rounded-full border-2 border-yellow-400/50">
              <span className="text-yellow-300 font-bold text-xl">Balance: </span>
              <span className="text-white font-bold text-xl">¥{balance}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-8 items-start">
          {/* Deck - Left Side */}
          <div className="flex-shrink-0">
            <div
              ref={deckRef}
              onClick={handleDeckClick}
              className={`relative cursor-pointer transition-all duration-300 ${
                drawingCard ? 'scale-95' : 'hover:scale-110'
              } ${
                (gamePhase === 'dealing' || 
                 (gamePhase === 'playerDecisions' && tableau.length === 2))
                  ? 'animate-pulse' : ''
              }`}
            >
              {/* Stack of cards visual */}
              <div className="relative">
                {/* Back card */}
                <div className="w-24 h-36 bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-900 border-3 border-indigo-950 rounded-xl shadow-2xl transform rotate-3" />
                {/* Middle card */}
                <div className="absolute top-0 left-0 w-24 h-36 bg-gradient-to-br from-indigo-800 via-indigo-700 to-indigo-800 border-3 border-indigo-950 rounded-xl shadow-xl transform -rotate-2" />
                {/* Top card */}
                <div className="absolute top-0 left-0 w-24 h-36 bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-700 border-3 border-indigo-950 rounded-xl shadow-2xl ring-2 ring-white/20" />
              </div>
              {/* Card count */}
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-white text-sm font-bold bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20 whitespace-nowrap shadow-lg">
                {deck.length} cards
              </div>
              {/* Click hint */}
              {(gamePhase === 'dealing' || 
                (gamePhase === 'playerDecisions' && tableau.length === 2)) && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-white text-sm font-bold bg-gradient-to-r from-yellow-500 to-yellow-400 px-4 py-2 rounded-lg shadow-2xl whitespace-nowrap border-2 border-yellow-300 animate-bounce">
                  ✨ Click to draw ✨
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Dealer and Player */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Dealer Area */}
            <div 
              ref={dealerHandRef}
              className="bg-gradient-to-br from-red-900/90 via-red-800/90 to-red-900/90 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border-2 border-red-700/50 relative overflow-hidden"
            >
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_1px)] bg-[length:20px_20px]" />
              </div>
              
              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-white mb-5 text-center drop-shadow-lg">
                  <span className="bg-gradient-to-r from-red-200 to-red-100 bg-clip-text text-transparent">
                    Dealer
                  </span>
                </h2>
                <div className="flex justify-center gap-4 items-center flex-wrap">
                {dealerHand.map((card, index) => (
                  <div key={index} className="transform transition-transform hover:scale-110 duration-200">
                    <Card
                      card={card}
                      faceUp={gamePhase === 'showdown' || dealerCardFaceUp || index === 0}
                    />
                  </div>
                ))}
                  {dealerHand.length > 0 && (
                    <div className="ml-6 flex items-center bg-black/40 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                      <span className="text-red-200 font-semibold text-lg mr-2">Score:</span>
                      <span className="text-white font-bold text-2xl">
                        {gamePhase === 'showdown' || dealerCardFaceUp || dealerHand.length === 1 ? calculateScore(dealerHand) : '?'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Player Tableau */}
            <div
              ref={playerHandRef}
              className={`bg-gradient-to-br from-blue-50 via-white to-blue-50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border-2 transition-all duration-300 relative overflow-hidden ${
                bet > 0 ? 'ring-4 ring-yellow-400 shadow-yellow-400/50' : 'opacity-70'
              } ${result === 'win' ? 'ring-4 ring-green-500 shadow-green-500/50' : ''} ${
                result === 'loss' ? 'ring-4 ring-red-500 shadow-red-500/50' : ''
              } ${result === 'draw' ? 'ring-4 ring-yellow-500 shadow-yellow-500/50' : ''}`}
            >
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,black_1px,transparent_1px)] bg-[length:15px_15px]" />
              </div>
              
              <div className="relative z-10">
                <div className="text-center mb-5">
                  <h3 className="font-bold text-2xl mb-3 bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent">
                    Your Hand
                  </h3>
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <div className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-300">
                      <span className="text-gray-700 font-semibold text-sm mr-2">Bet:</span>
                      <span className="text-gray-900 font-bold text-lg">¥{bet}</span>
                    </div>
                    {tableau.length > 0 && (
                      <div className="bg-blue-100 px-4 py-2 rounded-lg border border-blue-300">
                        <span className="text-blue-700 font-semibold text-sm mr-2">Score:</span>
                        <span className="text-blue-900 font-bold text-xl">{calculateScore(tableau)}</span>
                      </div>
                    )}
                  </div>
                  {result && (
                    <div className={`inline-block px-6 py-3 rounded-xl font-bold text-3xl shadow-2xl transform transition-all duration-500 ${
                      result === 'win' 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white animate-pulse' 
                        : result === 'draw'
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                        : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                    }`}>
                      {result === 'win' ? '🎉 WIN! 🎉' : result === 'draw' ? '🤝 DRAW' : '❌ LOSE'}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center gap-3 mb-4 relative min-h-[140px] items-center">
                  {tableau.map((card, cardIndex) => (
                    <div
                      key={cardIndex}
                      className="transition-all duration-300 transform hover:scale-110 hover:-translate-y-2"
                    >
                      <Card card={card} faceUp={true} />
                    </div>
                  ))}
                </div>

                {/* Betting Controls */}
                {gamePhase === 'betting' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      {[10, 25, 50, 100].map(amount => (
                        <button
                          key={amount}
                          onClick={() => placeBet(amount)}
                          disabled={balance < amount}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                          +¥{amount}
                        </button>
                      ))}
                    </div>
                    {bet > 0 && (
                      <button
                        onClick={() => {
                          setBalance(balance + bet);
                          setBet(0);
                        }}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transform transition-all duration-200 hover:scale-105"
                      >
                        Clear Bet
                      </button>
                    )}
                  </div>
                )}

                {/* Player Decision Controls */}
                {gamePhase === 'playerDecisions' && bet > 0 && (
                  <div className="flex flex-col gap-2">
                    {tableau.length === 2 && (
                      <button
                        onClick={addThirdCard}
                        className="px-6 py-4 rounded-xl text-white font-bold text-lg shadow-xl transform transition-all duration-200 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:scale-105"
                      >
                        Take Third Card (Optional)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Flying Card Animation */}
        {flyingCard && (
          <div
            className="fixed pointer-events-none z-50 animate-fly-card"
            style={{
              left: `${flyingCard.startX}px`,
              top: `${flyingCard.startY}px`,
              transform: 'translate(-50%, -50%)',
              '--end-x': `${flyingCard.endX - flyingCard.startX}px`,
              '--end-y': `${flyingCard.endY - flyingCard.startY}px`,
            }}
          >
            <Card card={flyingCard.card} faceUp={flyingCard.target === 'player' || dealerCardFaceUp} />
          </div>
        )}

        {/* Game Controls */}
        <div className="flex justify-center gap-4 mt-8">
          {gamePhase === 'betting' && (
            <button
              onClick={startDeal}
              className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 hover:from-yellow-600 hover:via-yellow-500 hover:to-yellow-600 text-white px-10 py-4 rounded-2xl text-2xl font-bold shadow-2xl transform transition-all duration-200 hover:scale-110 border-2 border-yellow-300"
            >
              🎴 Deal Cards
            </button>
          )}

          {gamePhase === 'playerDecisions' && (
            <button
              onClick={startDealerTurn}
              className="bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 hover:from-purple-700 hover:via-purple-600 hover:to-purple-700 text-white px-10 py-4 rounded-2xl text-2xl font-bold shadow-2xl transform transition-all duration-200 hover:scale-110 border-2 border-purple-300"
            >
              ✅ Finalize & Dealer Turn
            </button>
          )}

          {gamePhase === 'showdown' && (
            <button
              onClick={newRound}
              className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-700 hover:via-blue-600 hover:to-blue-700 text-white px-10 py-4 rounded-2xl text-2xl font-bold shadow-2xl transform transition-all duration-200 hover:scale-110 border-2 border-blue-300"
            >
              🔄 New Round
            </button>
          )}
        </div>

        {/* Game Description */}
        <div className="mt-12 mb-8 bg-black/40 backdrop-blur-sm rounded-2xl p-6 border-2 border-yellow-400/30 shadow-2xl">
          <h2 className="text-2xl font-bold text-yellow-300 mb-4 text-center">How to Play Sente-Kabu</h2>
          <div className="text-white/90 space-y-4 text-sm leading-relaxed">
            <p className="text-center text-yellow-200/90 italic mb-4">
              Sente-Kabu is a spin-off of the traditional Japanese banking game Oicho-Kabu, played with a full Hanafuda deck.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-yellow-300 font-bold text-lg mb-2">🎯 Objective</h3>
                <p>
                  Get a hand total whose <strong>last digit</strong> is as close to 9 as possible. 
                  Only the last digit counts (e.g., 15 = 5, 23 = 3, 9 = 9).
                </p>
              </div>
              
              <div>
                <h3 className="text-yellow-300 font-bold text-lg mb-2">🃏 The Deck</h3>
                <p>
                  Uses a full Hanafuda deck with <strong>48 cards</strong> (12 months × 4 cards each). 
                  Each card's value equals its month number (1-12).
                </p>
              </div>
              
              <div>
                <h3 className="text-yellow-300 font-bold text-lg mb-2">🎲 Gameplay</h3>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li><strong>Place your bet</strong> using the betting buttons</li>
                  <li><strong>Click "Deal Cards"</strong> to start the round</li>
                  <li><strong>Click the deck</strong> to draw cards (3 cards total: you, dealer, you)</li>
                  <li><strong>Optional:</strong> Click the deck again to draw a third card (you can always choose!)</li>
                  <li><strong>Click "Finalize"</strong> when ready - dealer plays automatically</li>
                </ol>
              </div>
              
              <div>
                <h3 className="text-yellow-300 font-bold text-lg mb-2">💰 Payouts</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong className="text-green-400">Win:</strong> Get your bet back + equal amount (2× bet)</li>
                  <li><strong className="text-yellow-400">Draw:</strong> Get your bet back (push)</li>
                  <li><strong className="text-red-400">Lose:</strong> Dealer wins your bet</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-yellow-400/20">
              <p className="text-center text-yellow-200/80">
                <strong>Tip:</strong> In Sente-Kabu, you have full control! You can choose to draw a third card 
                regardless of your score, giving you more strategic options than traditional Oicho-Kabu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

