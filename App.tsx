
import React, { useEffect, useState, useRef } from 'react';
import { server } from './services';
import { GameState, GameMode, Entity, EntityType, DecorationType } from './types';
import { MAP_SIZE, PLAYER_SIZE, MOVEMENT_SPEED } from './constants';
import GameRenderer from './components/GameRenderer';
import HomeView from './components/HomeView';
import HUD from './components/HUD';
import VirtualJoystick from './components/VirtualJoystick';
import ChatWidget from './components/ChatWidget';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Input Refs
  const keysPressed = useRef<Set<string>>(new Set());
  const joystickRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  const moveIntervalRef = useRef<number | null>(null);

  // Resize handler
  useEffect(() => {
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync with MockServer
  useEffect(() => {
    server.startGame();
    const unsubscribe = server.subscribe((state) => {
      setGameState({ ...state }); 
    });
    return () => unsubscribe();
  }, []);

  // Movement Loop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.key.toLowerCase());
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    moveIntervalRef.current = window.setInterval(() => {
      if (!gameState || gameState.mode !== GameMode.WORLD) return;

      let dx = 0;
      let dy = 0;
      
      // Keyboard Input
      const k = keysPressed.current;
      if (k.has('w') || k.has('arrowup')) dy -= 1;
      if (k.has('s') || k.has('arrowdown')) dy += 1;
      if (k.has('a') || k.has('arrowleft')) dx -= 1;
      if (k.has('d') || k.has('arrowright')) dx += 1;

      // Joystick Input (Priority if active)
      const j = joystickRef.current;
      if (Math.abs(j.x) > 0.1 || Math.abs(j.y) > 0.1) {
          dx = j.x;
          dy = j.y;
      }

      // Normalize if diagonal/keyboard
      if (dx !== 0 || dy !== 0) {
        // Simple normalization for keyboard only, joystick is already unit vector-ish
        if (j.x === 0 && j.y === 0) {
           const len = Math.hypot(dx, dy);
           dx /= len;
           dy /= len;
        }
        
        server.movePlayer({ 
            x: dx * MOVEMENT_SPEED, 
            y: dy * MOVEMENT_SPEED 
        });
      }
    }, 1000 / 60);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, [gameState?.mode]);

  const handleJoystickMove = (x: number, y: number) => {
      joystickRef.current = { x, y };
  };

  const handleInteract = (entity: Entity) => {
    if (gameState?.mode !== GameMode.WORLD) return;

    if (entity.type.includes('MONSTER')) {
      server.attack(entity.id);
    } else if (entity.type === EntityType.LOOT_CONTAINER) {
      server.loot(entity.id);
    }
  };

  // Smart Action Button Logic
  const handleActionBtn = () => {
      if (!gameState || gameState.mode !== GameMode.WORLD) return;
      
      const p = gameState.player;
      let closestEntity: Entity | null = null;
      let minDist = Infinity;
      
      // Find closest interactable
      gameState.entities.forEach(e => {
          if (e.type === EntityType.PLAYER || e.type === EntityType.OTHER_PLAYER) return;
          const dist = Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y);
          if (dist < 100 && dist < minDist) { // 100 is attack range
              minDist = dist;
              closestEntity = e;
          }
      });

      if (closestEntity) {
          handleInteract(closestEntity);
      } else {
          // Visual feedback for whiffing?
          console.log("Swung weapon at nothing!");
      }
  };

  if (!gameState) return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">正在连接服务器...</div>;

  // LOBBY SCREEN
  if (gameState.mode === GameMode.LOBBY) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-6">
        <div className="w-full max-w-sm bg-gray-800/80 p-8 rounded-2xl border border-white/10 shadow-2xl text-center backdrop-blur-lg">
          <h1 className="text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">EcoExplore</h1>
          <p className="text-gray-400 mb-8">多人在线冒险 Demo</p>
          
          <button 
            onClick={() => server.enterWorld()}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-lg shadow-lg active:scale-95 transition-transform"
          >
            开始冒险
          </button>
        </div>
      </div>
    );
  }

  // Camera Calculations
  const camX = viewport.w / 2 - gameState.player.pos.x - PLAYER_SIZE / 2;
  const camY = viewport.h / 2 - gameState.player.pos.y - PLAYER_SIZE / 2;

  // Render Game Loop
  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-900 font-sans select-none touch-none">
      
      {/* WORLD VIEW - Camera Layer */}
      {gameState.mode === GameMode.WORLD && (
        <div className="absolute inset-0 bg-gray-900 overflow-hidden">
             {/* The World Container that moves */}
             <div 
                className="relative transition-transform duration-75 ease-linear will-change-transform"
                style={{ 
                    transform: `translate3d(${camX}px, ${camY}px, 0)`,
                    width: MAP_SIZE, 
                    height: MAP_SIZE 
                }}
            >
                {/* Map Background - Brighter Green */}
                <div 
                    className="absolute inset-0 bg-[#a7f3d0] border-4 border-emerald-600 rounded-sm"
                    style={{ 
                        backgroundImage: 'radial-gradient(#34d399 2px, transparent 2px)', 
                        backgroundSize: '32px 32px',
                    }}
                />

                {/* Decorations Layer (Terrain) */}
                {gameState.decorations.map(dec => {
                   let content = '';
                   let className = '';
                   let style: React.CSSProperties = {
                       left: dec.pos.x,
                       top: dec.pos.y,
                       transform: `scale(${dec.scale})`,
                   };

                   switch(dec.type) {
                       case DecorationType.TREE:
                           content = '🌲';
                           className = 'absolute text-4xl pointer-events-none opacity-90 drop-shadow-lg z-10';
                           break;
                       case DecorationType.ROCK:
                           content = '🪨';
                           className = 'absolute text-3xl pointer-events-none opacity-80 drop-shadow-md z-10';
                           break;
                       case DecorationType.WATER:
                           className = 'absolute rounded-full bg-blue-400/50 blur-sm pointer-events-none z-0';
                           style = { ...style, width: 120, height: 80 };
                           break;
                       case DecorationType.WALL:
                           className = 'absolute bg-slate-200 border-2 border-slate-400 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] z-10';
                           style = { ...style, width: 32, height: 32 };
                           break;
                   }

                   return (
                       <div key={dec.id} className={className} style={style}>
                           {content}
                       </div>
                   );
                })}

                {/* Entities */}
                <GameRenderer 
                  entities={gameState.entities} 
                  localPlayerId={gameState.player.id} 
                  onInteract={handleInteract}
                />
                
                {/* Floating Texts (Damage Numbers) */}
                {gameState.floatingTexts.map(ft => (
                    <div
                        key={ft.id}
                        className={`absolute pointer-events-none animate-float-up z-50 ${ft.colorClass}`}
                        style={{ left: ft.x, top: ft.y }}
                    >
                        {ft.text}
                    </div>
                ))}

                {/* Local Player */}
                 <div 
                   className={`absolute transition-all duration-75 ease-linear flex items-center justify-center rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] border-2 border-white z-20 ${gameState.player.hp < 30 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}
                   style={{ left: gameState.player.pos.x, top: gameState.player.pos.y, width: PLAYER_SIZE, height: PLAYER_SIZE }}
                >
                   <span className="text-xl">🤠</span>
                   <div className="absolute -top-6 text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {gameState.player.name}
                   </div>
                </div>
            </div>
        </div>
      )}

      {/* HOME VIEW Layer */}
      {gameState.mode === GameMode.HOME && (
         <HomeView home={gameState.home} player={gameState.player} />
      )}

      {/* HUD Layer (Header + Popups) */}
      <HUD 
        player={gameState.player} 
        gameMode={gameState.mode} 
        messages={gameState.messages} 
        popups={gameState.popups}
      />
      
      {/* Chat Widget Layer */}
      <ChatWidget 
        messages={gameState.messages} 
        isOpen={isChatOpen}
        onToggle={setIsChatOpen}
        onSendMessage={(text) => server.sendChat(text)} 
      />

      {/* MOBILE CONTROLS (Only in World Mode & When Chat Closed) */}
      {gameState.mode === GameMode.WORLD && !isChatOpen && (
          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none z-50">
              {/* Left: Joystick */}
              <div className="pointer-events-auto">
                  <VirtualJoystick onMove={handleJoystickMove} />
              </div>

              {/* Right: Action Button */}
              <div className="pointer-events-auto pb-2">
                  <button 
                    onClick={handleActionBtn}
                    className="w-20 h-20 rounded-full bg-red-500/80 border-4 border-red-300 shadow-xl flex items-center justify-center active:scale-95 active:bg-red-600 transition-all backdrop-blur-sm"
                  >
                      <span className="text-3xl">⚔️</span>
                  </button>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;
