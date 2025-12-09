import React, { useState, useEffect } from 'react';

export const CurrentTimeLine: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const getPosition = () => {
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Working hours start at 7:00
    const WORKING_START = 7;
    const SLOT_HEIGHT = 2; // 2rem per 30min slot
    
    if (hours < WORKING_START) return -1; // Before working hours
    
    const totalMinutes = (hours - WORKING_START) * 60 + minutes;
    const position = (totalMinutes / 30) * SLOT_HEIGHT; // Position in rem
    
    return position;
  };

  const position = getPosition();
  
  if (position < 0) return null; // Don't show if outside working hours

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${position}rem` }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 bg-error/100 rounded-full -ml-1"></div>
        <div className="h-0.5 bg-error/100 flex-1"></div>
      </div>
    </div>
  );
};
