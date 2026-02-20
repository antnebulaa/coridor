'use client';

import React from 'react';

interface MoveInStoryProgressProps {
  total: number;
  currentIndex: number;
  progress: number; // 0-1 for current story
}

const MoveInStoryProgress: React.FC<MoveInStoryProgressProps> = ({ total, currentIndex, progress }) => {
  return (
    <div className="flex gap-[3px] px-4 pt-3">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="flex-1 h-[3px] rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
        >
          <div
            className="h-full rounded-full transition-none"
            style={{
              backgroundColor: '#E8A838',
              width: i < currentIndex ? '100%' : i === currentIndex ? `${progress * 100}%` : '0%',
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default MoveInStoryProgress;
