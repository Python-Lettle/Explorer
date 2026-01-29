
import React from 'react';
import { Entity, EntityType } from '../types';
import { COLORS, PLAYER_SIZE } from '../constants';

interface GameRendererProps {
  entities: Entity[];
  localPlayerId: string;
  onInteract: (entity: Entity) => void;
}

const GameRenderer: React.FC<GameRendererProps> = ({ entities, localPlayerId, onInteract }) => {
  
  const getEntityStyle = (entity: Entity) => {
    let colorClass = 'bg-gray-500';
    let label = '';
    
    switch (entity.type) {
      case EntityType.PLAYER:
        colorClass = COLORS.PLAYER;
        break;
      case EntityType.OTHER_PLAYER:
        colorClass = COLORS.OTHER_PLAYER;
        label = '👤';
        break;
      case EntityType.MONSTER_SLIME:
        colorClass = COLORS.MONSTER_SLIME;
        label = '🦠';
        break;
      case EntityType.MONSTER_BEAST:
        colorClass = COLORS.MONSTER_BEAST;
        label = '🐺';
        break;
      case EntityType.LOOT_CONTAINER:
        colorClass = COLORS.LOOT_CONTAINER;
        label = '🎁';
        break;
    }

    return {
      className: `absolute transition-all duration-75 ease-linear flex items-center justify-center rounded-lg shadow-md border-2 border-black/10 cursor-pointer ${colorClass}`,
      style: {
        left: entity.pos.x,
        top: entity.pos.y,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
      },
      label,
    };
  };

  return (
    <>
      {entities.map(entity => {
        // Skip local player here if we want to render them separately, but for sync demo we render all
        // Highlighting the local player's target or adding a specific border could be done here
        const { className, style, label } = getEntityStyle(entity);
        const isMonster = entity.type.includes('MONSTER');
        const isLoot = entity.type === EntityType.LOOT_CONTAINER;

        return (
          <div
            key={entity.id}
            className={className}
            style={style}
            onClick={() => onInteract(entity)}
          >
            <span className="text-xl select-none pointer-events-none">{label}</span>
            
            {/* Health Bar for entities with HP */}
            {isMonster && (
              <div className="absolute -top-3 left-0 w-full h-1 bg-gray-700 rounded overflow-hidden">
                <div 
                  className="h-full bg-red-500" 
                  style={{ width: `${(entity.hp / entity.maxHp) * 100}%` }}
                />
              </div>
            )}

            {/* Name Tag */}
            {!isLoot && (
               <span className="absolute -bottom-5 text-[10px] font-bold text-gray-700 whitespace-nowrap bg-white/50 px-1 rounded">
                {entity.name}
               </span>
            )}
          </div>
        );
      })}
    </>
  );
};

export default GameRenderer;
