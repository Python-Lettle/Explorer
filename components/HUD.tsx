
import React from 'react';
import { PlayerState, GameMode, ItemType, Popup } from '../types';
import { ITEM_INFO } from '../constants';
import { server } from '../services';

interface HUDProps {
  player: PlayerState;
  gameMode: GameMode;
  messages: string[];
  popups: Popup[];
}

const HUD: React.FC<HUDProps> = ({ player, gameMode, popups }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col z-40">
      
      {/* Top Header Bar */}
      <div className="flex justify-between items-start p-3 bg-gradient-to-b from-black/60 to-transparent pt-safe-top pointer-events-auto">
        
        {/* Compact Player Status */}
        <div className="flex items-center space-x-2">
             <div className="relative w-12 h-12 bg-gray-800 rounded-full border-2 border-white/20 flex items-center justify-center shadow-lg">
                <span className="text-xl">🤠</span>
                <span className="absolute -bottom-1 -right-1 bg-blue-600 text-[10px] text-white font-bold px-1.5 rounded-full border border-black">
                    {player.level}
                </span>
             </div>
             
             <div className="flex flex-col">
                 <div className="w-24 h-3 bg-gray-800 rounded-full overflow-hidden border border-white/10">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${(player.hp / player.maxHp) * 100}%` }}
                    />
                 </div>
                 <span className="text-[10px] text-gray-200 mt-0.5 font-medium tracking-wide">
                     经验 {player.exp} / {player.level * 50}
                 </span>
             </div>
        </div>

        {/* Mode Switch Button */}
        <div>
           {gameMode === GameMode.HOME ? (
             <button 
               onClick={() => server.enterWorld()}
               className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg active:scale-95 transition-all border border-blue-400"
             >
               🌍 前往荒野
             </button>
           ) : (
             <button 
               onClick={() => server.returnHome()}
               className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg active:scale-95 transition-all border border-emerald-400"
             >
               🏠 返回家园
             </button>
           )}
        </div>
      </div>

      {/* POPUP NOTIFICATIONS */}
      {/* max-h-[50vh] limits height, overflow-hidden hides old ones that fall off */}
      <div className="absolute top-20 left-0 right-0 flex flex-col items-center gap-0.5 pointer-events-none max-h-[50vh] overflow-hidden">
          {popups.map((p) => (
              <div key={p.id} className="bg-black/70 backdrop-blur text-white px-3 py-1 rounded-full flex items-center gap-2 shadow-xl animate-[fade-out_2s_forwards] shrink-0">
                  {p.icon && <span className="text-base">{p.icon}</span>}
                  <span className="font-bold text-xs text-shadow">{p.text}</span>
              </div>
          ))}
      </div>

      {/* Inventory Strip */}
      {player.inventory.length > 0 && (
          <div className="absolute top-16 right-2 flex flex-col gap-1 pointer-events-auto">
             {player.inventory.map((item, i) => (
               <div key={item.id} className="w-8 h-8 bg-black/50 backdrop-blur rounded border border-white/20 flex items-center justify-center relative shadow-sm animate-bounce-in">
                   <span className="text-sm">{ITEM_INFO[item.type]?.emoji}</span>
                   {item.count > 1 && <span className="absolute -bottom-1 -right-1 text-[8px] bg-red-500 text-white px-1 rounded-full">{item.count}</span>}
               </div>
             ))}
          </div>
      )}

    </div>
  );
};

export default HUD;
