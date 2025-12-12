import React, { useMemo } from 'react';
import { DiceValue } from '../types';

interface DieProps {
  value: DiceValue;
  isRolling: boolean;
}

const Die: React.FC<DieProps> = ({ value, isRolling }) => {
  // Map dice values to dot positions (grid 3x3 indexes: 0-8)
  const getDots = (val: DiceValue): number[] => {
    switch (val) {
      case 1: return [4];
      case 2: return [2, 6]; // Top-right, Bottom-left (or inverted for classic look) -> Let's use standard corners: 0, 8 or 2, 6
      case 3: return [0, 4, 8];
      case 4: return [0, 2, 6, 8];
      case 5: return [0, 2, 4, 6, 8];
      case 6: return [0, 2, 3, 5, 6, 8];
      default: return [];
    }
  };

  const dots = getDots(value);

  // Calculate random animation properties to desynchronize dice shaking
  const animationStyle = useMemo(() => {
    if (!isRolling) return {};
    
    // Use a random duration between 0.25s and 0.45s for variety
    const duration = 0.25 + Math.random() * 0.2;
    // Start at a random point in the animation cycle to desync
    const delay = Math.random() * -0.5;
    
    return {
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
    };
  }, [isRolling]);

  // We use a CSS grid for positioning the dots on the face
  return (
    <div 
      className={`
        relative w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-2xl shadow-[0_4px_0_0_#cbd5e1] border-2 border-slate-200
        flex items-center justify-center p-2
        transition-all duration-100 ease-in-out
        ${isRolling ? 'animate-shake' : 'hover:-translate-y-1 hover:shadow-[0_6px_0_0_#cbd5e1]'}
      `}
      style={animationStyle}
    >
      <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-1">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            {dots.includes(i) && (
              <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 bg-slate-900 rounded-full shadow-sm" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Die;