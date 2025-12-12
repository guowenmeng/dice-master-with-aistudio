import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Minus, Dices, RotateCcw, Smile, Frown } from 'lucide-react';
import Die from './components/Die';
import Button from './components/Button';
import { DiceValue } from './types';

// Constants
const MIN_DICE = 1;
const MAX_DICE = 8;
const ROLL_DURATION_MS = 1000;
const SHUFFLE_INTERVAL_MS = 80;

const App: React.FC = () => {
  const [numDice, setNumDice] = useState<number>(1);
  const [diceValues, setDiceValues] = useState<DiceValue[]>([1]);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [total, setTotal] = useState<number | null>(null);
  
  // Audio Context Ref for Shaking Sound
  const audioCtxRef = useRef<AudioContext | null>(null);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Initialize Audio Context on user interaction (to bypass autoplay policies)
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Synthesize a short "shake/rattle" sound
  const playShakeSound = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Create noise buffer
    const bufferSize = ctx.sampleRate * 0.1; // 0.1 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // White noise
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to make it sound more like plastic tumbling (Lowpass)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    // Envelope for short percussive sound
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  };

  // Function to speak the result with a "Loli" style voice
  const speakResult = (isWin: boolean) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any currently playing speech to avoid overlap
    window.speechSynthesis.cancel();

    // Determine text and tone
    // Adding modal particles like "哦" or "鸭" makes it sound cuter/more natural for this persona
    const text = isWin ? "恭喜" : "加油";
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to set language to Chinese
    utterance.lang = 'zh-CN';
    
    // "Loli" Voice Configuration:
    // Pitch: High (1.6 - 1.8 range usually simulates a child/anime character)
    // Rate: Slightly faster (1.1 - 1.2) for energy
    utterance.pitch = 1.6; 
    utterance.rate = 1.1; 
    utterance.volume = 1;

    // Try to find a Chinese voice specifically
    const voices = window.speechSynthesis.getVoices();
    // Prefer a native Chinese voice if available
    const zhVoice = voices.find(v => v.lang === 'zh-CN') || voices.find(v => v.lang.includes('zh'));
    if (zhVoice) {
      utterance.voice = zhVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Ensure voices are loaded (Chrome sometimes needs this listener)
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Helper to generate a random dice value
  const getRandomValue = (): DiceValue => {
    return (Math.floor(Math.random() * 6) + 1) as DiceValue;
  };

  // Adjust number of dice
  const handleAdjustDice = (increment: number) => {
    if (isRolling) return;
    initAudio(); // Ensure audio is ready
    
    setNumDice(prev => {
      const newValue = prev + increment;
      if (newValue < MIN_DICE) return MIN_DICE;
      if (newValue > MAX_DICE) return MAX_DICE;
      return newValue;
    });
  };

  // Sync diceValues array length with numDice
  useEffect(() => {
    setDiceValues(prev => {
      const currentLength = prev.length;
      if (currentLength === numDice) return prev;
      
      if (currentLength < numDice) {
        // Add new dice (default to 1)
        return [...prev, ...Array(numDice - currentLength).fill(1)];
      } else {
        // Remove dice
        return prev.slice(0, numDice);
      }
    });
    // Reset total when count changes to encourage re-roll
    setTotal(null);
  }, [numDice]);

  // The Roll Logic
  const rollDice = useCallback(() => {
    if (isRolling) return;
    
    initAudio(); // Ensure audio context is running
    setIsRolling(true);
    setTotal(null);
    startTimeRef.current = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - (startTimeRef.current || 0);

      if (elapsed < ROLL_DURATION_MS) {
        // Play sound on shuffle
        playShakeSound();
        
        // Still rolling: update values randomly for visual noise
        setDiceValues(prev => prev.map(() => getRandomValue()));
        timerRef.current = window.setTimeout(animate, SHUFFLE_INTERVAL_MS);
      } else {
        // Finish rolling
        const finalValues = Array(numDice).fill(0).map(() => getRandomValue());
        const finalTotal = finalValues.reduce((acc, val) => acc + val, 0);
        
        setDiceValues(finalValues);
        setTotal(finalTotal);
        setIsRolling(false);

        // Trigger Voice Feedback
        const isWin = finalTotal >= (numDice * 3);
        speakResult(isWin);
      }
    };

    animate();
  }, [isRolling, numDice]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
      window.speechSynthesis.cancel(); // Stop speech if unmounted
    };
  }, []);

  // Determine feedback state
  const isLucky = total !== null && total >= (numDice * 3);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
      
      {/* Header */}
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 mb-4 bg-indigo-500/20 rounded-full ring-1 ring-indigo-500/50">
          <Dices className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">
          Dice Master
        </h1>
        <p className="text-slate-400">Adjust count, roll, and win.</p>
      </header>

      {/* Main Control Panel */}
      <main className="w-full max-w-3xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 sm:p-10 shadow-2xl">
        
        {/* Top Controls: Dice Count */}
        <div className="flex items-center justify-center space-x-6 mb-12">
          <button
            onClick={() => handleAdjustDice(-1)}
            disabled={numDice <= MIN_DICE || isRolling}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed ring-1 ring-slate-600"
            aria-label="Decrease dice count"
          >
            <Minus size={20} />
          </button>

          <div className="flex flex-col items-center min-w-[100px]">
            <span className="text-5xl font-bold text-white tabular-nums leading-none">
              {numDice}
            </span>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">
              {numDice === 1 ? 'Die' : 'Dice'}
            </span>
          </div>

          <button
            onClick={() => handleAdjustDice(1)}
            disabled={numDice >= MAX_DICE || isRolling}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed ring-1 ring-slate-600"
            aria-label="Increase dice count"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Dice Area */}
        <div className="min-h-[160px] flex items-center justify-center mb-12">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {diceValues.map((val, index) => (
              <Die 
                key={`${index}-${isRolling ? 'rolling' : 'static'}`} // Force re-render for animation reset
                value={val} 
                isRolling={isRolling} 
              />
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div className="h-28 flex items-center justify-center mb-8">
           {total !== null && !isRolling ? (
             <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
               <span className="text-slate-400 text-sm font-medium uppercase tracking-widest block mb-1">Total Sum</span>
               <div className="flex items-center gap-4">
                  <span className={`text-6xl font-black text-transparent bg-clip-text drop-shadow-sm ${isLucky ? 'bg-gradient-to-r from-indigo-400 to-cyan-300' : 'bg-gradient-to-r from-slate-400 to-slate-200'}`}>
                    {total}
                  </span>
                  
                  {/* Feedback Emoji */}
                  <div className={`text-5xl transform transition-all duration-500 hover:scale-110 ${isLucky ? 'animate-bounce' : ''}`}>
                    {isLucky ? (
                      <span title="Great roll!">😄</span>
                    ) : (
                      <span title="Better luck next time">😢</span>
                    )}
                  </div>
               </div>
               <span className={`text-sm mt-2 font-medium ${isLucky ? 'text-cyan-400' : 'text-slate-500'}`}>
                 {isLucky ? 'Nice Roll!' : 'Low Roll...'}
               </span>
             </div>
           ) : (
             <div className={`text-slate-600 font-medium ${isRolling ? 'animate-pulse' : ''}`}>
               {isRolling ? 'Rolling...' : 'Ready to roll'}
             </div>
           )}
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button 
            onClick={rollDice} 
            disabled={isRolling}
            className="w-full sm:w-auto min-w-[200px] text-lg py-4"
            icon={isRolling ? <RotateCcw className="animate-spin" /> : <Dices />}
          >
            {isRolling ? 'Rolling...' : 'Roll Dice'}
          </Button>
        </div>
      </main>

      {/* Footer / Instructions */}
      <footer className="mt-12 text-center text-slate-500 text-sm">
        <p>Min: {MIN_DICE} • Max: {MAX_DICE}</p>
      </footer>

    </div>
  );
};

export default App;