
import React, { useEffect, useRef, useState } from 'react';

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
}

const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  
  // Track position for visual feedback
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleStart = (clientX: number, clientY: number) => {
      setActive(true);
      handleMove(clientX, clientY);
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;
        const distance = Math.hypot(deltaX, deltaY);
        const maxDist = rect.width / 2;

        const clampedDist = Math.min(distance, maxDist);
        const angle = Math.atan2(deltaY, deltaX);

        const x = Math.cos(angle) * clampedDist;
        const y = Math.sin(angle) * clampedDist;

        setPosition({ x, y });

        // Normalize output -1 to 1
        onMove(x / maxDist, y / maxDist);
    };

    const handleEnd = () => {
      setActive(false);
      setPosition({ x: 0, y: 0 });
      onMove(0, 0);
    };

    // Touch Events
    const onTouchStart = (e: TouchEvent) => {
        e.preventDefault(); // Prevent scroll
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (active) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        handleEnd();
    };

    // Mouse Events (for testing on desktop)
    const onMouseDown = (e: MouseEvent) => {
        handleStart(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
        if (active) handleMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
        if (active) handleEnd();
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [active, onMove]);

  return (
    <div 
      ref={containerRef}
      className="w-32 h-32 bg-black/30 rounded-full border-2 border-white/20 relative backdrop-blur-sm touch-none"
    >
      <div 
        ref={knobRef}
        className="w-12 h-12 bg-white/80 rounded-full absolute top-1/2 left-1/2 -ml-6 -mt-6 shadow-lg pointer-events-none transition-transform duration-75"
        style={{
            transform: `translate(${position.x}px, ${position.y}px)`
        }}
      />
    </div>
  );
};

export default VirtualJoystick;
