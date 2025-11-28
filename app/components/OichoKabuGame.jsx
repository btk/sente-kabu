'use client';

import { useState, useEffect } from 'react';
import Card from './Card';
import { createDeck, calculateScore, compareScores, needsThirdCard, canTakeThirdCard } from '../utils/gameLogic';

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
    
    // Set flying card for animation
    setFlyingCard({ card, target });
    
    // After animation completes, add card to hand
    setTimeout(() => {
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

  // Add third card to tableau - now uses deck click
  const addThirdCard = () => {
    if (gamePhase !== 'playerDecisions') return;
    if (tableau.length >= 3) return;
    if (!canTakeThirdCard(tableau)) return;
    
    drawCard('player');
  };

  // Process automatic third card (mandatory)
  const processAutomaticCard = () => {
    if (needsThirdCard(tableau) && tableau.length === 2) {
      const newDeck = [...deck];
      const newTableau = [...tableau];
      newTableau.push(newDeck.shift());
      setDeck(newDeck);
      setTableau(newTableau);
    }
  };

  // Move to dealer's turn
  const startDealerTurn = () => {
    if (gamePhase !== 'playerDecisions') return;
    
    // Process any mandatory third card first
    processAutomaticCard();
    
    // Check if tableau is finalized
    const score = calculateScore(tableau);
    const needsCard = needsThirdCard(tableau);
    const hasCard = tableau.length >= 3;
    const isFinalized = !needsCard || hasCard;

    if (!isFinalized) {
      alert('Please finalize your hand');
      return;
    }

    setGamePhase('dealerTurn');
    setDealerCardFaceUp(true);
    
    // Dealer's second card will be drawn by clicking deck, then auto-draw third if needed
  };

  // Handle dealer's automatic card drawing
  useEffect(() => {
    if (gamePhase !== 'dealerTurn') return;
    
    const handleDealerTurn = () => {
      if (dealerHand.length === 1) {
        // Draw dealer's second card automatically after a delay
        setTimeout(() => {
          if (!drawingCard) {
            drawCard('dealer');
          }
        }, 800);
      } else if (dealerHand.length === 2) {
        // Check if dealer needs third card
        const dealerScore = calculateScore(dealerHand);
        if (canTakeThirdCard(dealerHand) && dealerScore <= 5) {
          setTimeout(() => {
            if (!drawingCard) {
              drawCard('dealer');
            }
          }, 800);
        } else {
          // Show results
          setTimeout(() => {
            showResults(dealerHand);
          }, 800);
        }
      } else if (dealerHand.length === 3) {
        // Dealer has all cards, show results
        setTimeout(() => {
          showResults(dealerHand);
        }, 800);
      }
    };

    handleDealerTurn();
  }, [gamePhase, dealerHand.length]);

  // Show results and calculate payouts
  const showResults = (finalDealerHand = dealerHand) => {
    setGamePhase('showdown');
    const dealerScore = calculateScore(finalDealerHand);
    const tableauScore = calculateScore(tableau);
    const comparison = compareScores(tableauScore, dealerScore);
    
    if (comparison > 0) {
      // Player wins
      setResult('win');
      setBalance(balance + bet * 2); // 1:1 payout
    } else {
      // Dealer wins (including ties)
      setResult('loss');
    }
  };

  // Start new round
  const newRound = () => {
    if (deck.length < 20) {
      // Reshuffle if deck is getting low
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
      // Player can draw third card if allowed
      if (tableau.length === 2 && canTakeThirdCard(tableau) && !needsThirdCard(tableau)) {
        drawCard('player');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-2">Oicho-Kabu</h1>
        <p className="text-white text-center mb-6">Balance: ¥{balance}</p>

        <div className="flex gap-8 items-start">
          {/* Deck - Left Side */}
          <div className="flex-shrink-0">
            <div
              onClick={handleDeckClick}
              className={`relative cursor-pointer transition-transform ${
                drawingCard ? 'scale-95' : 'hover:scale-105'
              } ${
                (gamePhase === 'dealing' || 
                 (gamePhase === 'playerDecisions' && tableau.length === 2 && canTakeThirdCard(tableau) && !needsThirdCard(tableau)))
                  ? 'animate-pulse' : ''
              }`}
            >
              {/* Stack of cards visual */}
              <div className="relative">
                {/* Back card */}
                <div className="w-20 h-32 bg-gradient-to-br from-blue-900 to-blue-700 border-2 border-blue-950 rounded-lg shadow-xl transform rotate-2" />
                {/* Middle card */}
                <div className="absolute top-0 left-0 w-20 h-32 bg-gradient-to-br from-blue-800 to-blue-600 border-2 border-blue-950 rounded-lg shadow-lg transform -rotate-1" />
                {/* Top card */}
                <div className="absolute top-0 left-0 w-20 h-32 bg-gradient-to-br from-blue-700 to-blue-500 border-2 border-blue-950 rounded-lg shadow-2xl" />
              </div>
              {/* Card count */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm font-bold bg-black/50 px-2 py-1 rounded whitespace-nowrap">
                {deck.length} cards
              </div>
              {/* Click hint */}
              {(gamePhase === 'dealing' || 
                (gamePhase === 'playerDecisions' && tableau.length === 2 && canTakeThirdCard(tableau) && !needsThirdCard(tableau))) && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-white text-xs font-semibold bg-yellow-500 px-3 py-1 rounded shadow-lg whitespace-nowrap">
                  Click to draw
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Dealer and Player */}
          <div className="flex-1 flex flex-col gap-8">
            {/* Dealer Area */}
            <div className="bg-green-700 rounded-lg p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">Dealer</h2>
              <div className="flex justify-center gap-4 items-center">
                {dealerHand.map((card, index) => (
                  <Card
                    key={index}
                    card={card}
                    faceUp={gamePhase === 'showdown' || dealerCardFaceUp || index > 0}
                  />
                ))}
                {dealerHand.length > 0 && (
                  <div className="ml-4 flex items-center">
                    <span className="text-white text-xl font-bold">
                      Score: {gamePhase === 'showdown' || dealerCardFaceUp ? calculateScore(dealerHand) : '?'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Player Tableau */}
            <div
              className={`bg-white rounded-lg p-6 shadow-xl ${
                bet > 0 ? 'ring-4 ring-yellow-400' : 'opacity-60'
              } ${result === 'win' ? 'ring-green-500' : ''} ${
                result === 'loss' ? 'ring-red-500' : ''
              }`}
            >
              <div className="text-center mb-4">
                <h3 className="font-bold text-xl mb-2">Your Hand</h3>
                <p className="text-sm text-gray-600 mb-1">Bet: ¥{bet}</p>
                {tableau.length > 0 && (
                  <p className="text-lg font-semibold mb-2">
                    Score: {calculateScore(tableau)}
                  </p>
                )}
                {result && (
                  <p className={`text-2xl font-bold ${
                    result === 'win' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result === 'win' ? 'WIN!' : 'LOSE'}
                  </p>
                )}
              </div>
              
              <div className="flex justify-center gap-3 mb-4 relative">
                {tableau.map((card, cardIndex) => (
                  <div
                    key={cardIndex}
                    className="transition-all duration-300"
                  >
                    <Card card={card} faceUp={true} />
                  </div>
                ))}
              </div>

              {/* Betting Controls */}
              {gamePhase === 'betting' && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {[10, 25, 50, 100].map(amount => (
                      <button
                        key={amount}
                        onClick={() => placeBet(amount)}
                        disabled={balance < amount}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-semibold"
                    >
                      Clear Bet
                    </button>
                  )}
                </div>
              )}

              {/* Player Decision Controls */}
              {gamePhase === 'playerDecisions' && bet > 0 && (
                <div className="flex flex-col gap-2">
                  {tableau.length === 2 && canTakeThirdCard(tableau) && (
                    <button
                      onClick={addThirdCard}
                      disabled={needsThirdCard(tableau)}
                      className={`px-4 py-3 rounded text-white font-semibold ${
                        needsThirdCard(tableau)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {needsThirdCard(tableau) ? 'Must Take Card' : 'Take Third Card'}
                    </button>
                  )}
                  {tableau.length === 2 && !canTakeThirdCard(tableau) && (
                    <p className="text-sm text-gray-600 text-center">Cannot take third card</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Flying Card Animation */}
        {flyingCard && (
          <div
            className={`fixed pointer-events-none z-50 ${
              flyingCard.target === 'player' ? 'animate-fly-to-player' : 'animate-fly-to-dealer'
            }`}
            style={{
              left: '80px', // Deck position (approximate)
              top: '50%',
            }}
          >
            <Card card={flyingCard.card} faceUp={flyingCard.target === 'player' || dealerCardFaceUp} />
          </div>
        )}

        {/* Game Controls */}
        <div className="flex justify-center gap-4">
          {gamePhase === 'betting' && (
            <button
              onClick={startDeal}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-lg text-xl font-bold shadow-lg"
            >
              Deal Cards
            </button>
          )}

          {gamePhase === 'playerDecisions' && (
            <button
              onClick={startDealerTurn}
              className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-3 rounded-lg text-xl font-bold shadow-lg"
            >
              Finalize & Dealer Turn
            </button>
          )}

          {gamePhase === 'showdown' && (
            <button
              onClick={newRound}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-xl font-bold shadow-lg"
            >
              New Round
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

