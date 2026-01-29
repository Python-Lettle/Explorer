
import React from 'react';
import { HomeState, PlayerState, ItemType } from '../types';
import { server } from '../services';
import { ITEM_INFO } from '../constants';

interface HomeViewProps {
  home: HomeState;
  player: PlayerState;
}

const HomeView: React.FC<HomeViewProps> = ({ home, player }) => {

  const hasContainer = player.inventory.some(i => i.type.includes('CONTAINER'));

  return (
    <div className="absolute inset-0 bg-emerald-50 overflow-y-auto pb-safe-bottom z-30 touch-auto">
      <div className="pt-20 px-4 pb-32 max-w-md mx-auto min-h-full">
        
        <header className="mb-8 text-center flex flex-col items-center">
          <button
             onClick={() => server.enterWorld()}
             className="w-full mb-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 border-2 border-white/20"
          >
             <span className="text-2xl">🌍</span>
             <span>开始探险</span>
          </button>

          <h1 className="text-2xl font-extrabold text-emerald-900">我的家园</h1>
        </header>

        <div className="space-y-6">
          
          {/* STORAGE */}
          <section className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100">
             <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 flex items-center gap-2">
                <span>🎒</span> 资源仓库
             </h2>
             <div className="grid grid-cols-3 gap-2">
                {Object.entries(home.resources).map(([type, count]) => (
                  <div key={type} className="flex flex-col items-center justify-center p-2 rounded bg-gray-50 border border-gray-100">
                    <span className="text-2xl mb-1">{ITEM_INFO[type as ItemType]?.emoji || '?'}</span>
                    <span className="font-bold text-gray-800 text-sm">{count}</span>
                  </div>
                ))}
             </div>
          </section>

          {/* BUILDINGS */}
          <section className="space-y-4">
             <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 pl-1">家园设施</h2>
            
              {home.buildings.map(b => (
                <div key={b.id} className="bg-white p-4 rounded-2xl shadow-md border border-emerald-50 relative overflow-hidden">
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm">
                             {b.type === 'CONTAINER_OPENER' && '📦'}
                             {b.type === 'FIELD' && '🌱'}
                             {b.type === 'WORKBENCH' && '🔨'}
                             {b.type === 'CANTEEN' && '🍲'}
                         </div>
                         <h3 className="font-bold text-gray-800 text-sm">
                            {b.type === 'CONTAINER_OPENER' && '物资解构台'}
                            {b.type === 'FIELD' && '小麦田'}
                            {b.type === 'WORKBENCH' && '工作台'}
                            {b.type === 'CANTEEN' && '家园食堂'}
                         </h3>
                    </div>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">等级 {b.level}</span>
                  </div>

                  {/* Building Content */}
                  <div className="pl-10">
                    
                    {b.type === 'CONTAINER_OPENER' && (
                        <div>
                          {hasContainer ? (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 mb-2">可以开启的容器:</p>
                                <div className="flex flex-wrap gap-2">
                                    {player.inventory.filter(i => i.type.includes('CONTAINER')).map(item => (
                                    <button 
                                        key={item.id}
                                        onClick={() => server.openContainer(item.id)}
                                        className="flex items-center gap-2 bg-yellow-400 active:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg text-xs font-bold shadow-sm w-full justify-center transition-colors"
                                    >
                                        <span>开启 {ITEM_INFO[item.type].name}</span>
                                        <span>{ITEM_INFO[item.type].emoji}</span>
                                    </button>
                                    ))}
                                </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">没有可开启的容器。</p>
                          )}
                        </div>
                    )}

                    {b.type === 'FIELD' && (
                        <div className="w-full">
                           {!b.cropType ? (
                                <button 
                                onClick={() => server.plantCrop(b.id)}
                                disabled={(home.resources[ItemType.SEED_WHEAT] || 0) < 1}
                                className="w-full py-3 bg-emerald-500 active:bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                                >
                                <span>种植小麦</span>
                                <span className="text-[10px] bg-emerald-700 px-1.5 py-0.5 rounded">-1 🌱</span>
                                </button>
                           ) : (
                               <div className="h-24 bg-amber-50 rounded-lg border-2 border-amber-100 relative overflow-hidden flex flex-col items-center justify-center group">
                                   {/* Progress Bar Background */}
                                   {!b.isReady && (
                                     <div className="absolute bottom-0 left-0 h-1 bg-amber-300 w-full animate-[width_5s_linear]" style={{width: '100%'}}></div>
                                   )}
                                   
                                   <div className="text-3xl mb-1 transition-transform">
                                       {b.isReady ? '🌾' : '🌱'}
                                   </div>
                                   
                                   {b.isReady ? (
                                       <button 
                                        onClick={() => server.harvestCrop(b.id)}
                                        className="bg-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg animate-bounce"
                                       >
                                           收获作物
                                       </button>
                                   ) : (
                                       <span className="text-xs text-amber-400 font-bold uppercase tracking-wide">生长中...</span>
                                   )}
                               </div>
                           )}
                        </div>
                    )}

                    {b.type === 'CANTEEN' && (
                        <div>
                             <p className="text-xs text-gray-500 mb-2">享用美食，恢复体力。</p>
                             <button 
                                onClick={() => server.recoverHp(b.id)}
                                className="w-full py-2 bg-orange-500 active:bg-orange-600 text-white rounded-lg font-bold text-sm shadow-sm flex items-center justify-center gap-2"
                             >
                                 <span>吃面包 (+50HP)</span>
                                 <span className="text-[10px] bg-orange-700 px-1.5 py-0.5 rounded">-1 🌾</span>
                             </button>
                        </div>
                    )}

                    {b.type === 'WORKBENCH' && (
                        <div className="text-xs text-gray-400 italic">
                            制造功能即将推出...
                        </div>
                    )}

                  </div>
                </div>
              ))}
          </section>

        </div>
      </div>
    </div>
  );
};

export default HomeView;
