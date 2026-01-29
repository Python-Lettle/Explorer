
import { Entity, EntityType, GameState, ItemType, Position, GameMode, Decoration, DecorationType, GameService } from '../types';
import { MAP_SIZE, PLAYER_SIZE, INITIAL_HOME_BUILDINGS, ITEM_INFO, PLAYER_DAMAGE, MONSTER_DAMAGE } from '../constants';

// Simple utility to generate IDs
const uuid = () => Math.random().toString(36).substr(2, 9);

/**
 * MockServer simulates the backend authority.
 * In a real app, this would be a Node.js/Go server communicating via WebSockets.
 */
class MockServer implements GameService {
  private state: GameState;
  private intervalId: number | null = null;
  private subscribers: ((state: GameState) => void)[] = [];
  
  // Simulated "Other" player for multiplayer demo
  private botId: string;

  constructor() {
    this.botId = uuid();
    this.state = this.getInitialState();
  }

  private getInitialState(): GameState {
    return {
      mode: GameMode.LOBBY,
      messages: ['欢迎来到 EcoExplore!', '使用摇杆移动。', '靠近物体按下 ⚔️ 互动。'],
      entities: [], // Populated when joining world
      decorations: this.generateDecorations(),
      player: {
        id: 'local-player',
        name: '冒险家',
        pos: { x: 400, y: 400 },
        hp: 100,
        maxHp: 100,
        inventory: [],
        maxInventory: 5,
        level: 1,
        exp: 0,
      },
      home: {
        buildings: JSON.parse(JSON.stringify(INITIAL_HOME_BUILDINGS)),
        resources: {
          [ItemType.RESOURCE_WOOD]: 0,
          [ItemType.RESOURCE_STONE]: 0,
          [ItemType.SEED_WHEAT]: 2,
        },
      },
      popups: [],
      floatingTexts: [],
    };
  }

  private generateDecorations(): Decoration[] {
    const decs: Decoration[] = [];
    const size = 32;

    // Helper to add a wall block
    const addWall = (x: number, y: number) => {
        decs.push({ id: uuid(), type: DecorationType.WALL, pos: {x, y}, scale: 1 });
    };

    // 1. Central Safe Zone (Walled City) - Center is 400,400
    // Box from 300 to 500
    const start = 300;
    const end = 500;
    const center = 400;
    const gateSize = 40; // Half-width of gate gap

    // Horizontal Walls (Top & Bottom)
    for(let x = start; x <= end; x+=size) {
        // Leave gap in middle
        if (Math.abs(x - center) > gateSize) {
            addWall(x, start); // Top
            addWall(x, end);   // Bottom
        }
    }
    
    // Vertical Walls (Left & Right)
    for(let y = start; y <= end; y+=size) {
        // Leave gap in middle
        if (Math.abs(y - center) > gateSize) {
             addWall(start, y); // Left
             addWall(end, y);   // Right
        }
    }

    // 2. Outer Ruins / Partitions
    // Vertical line left
    for(let y = 100; y < 700; y+=size) {
        if (y < 250 || y > 550) addWall(200, y);
    }
    // Vertical line right
    for(let y = 100; y < 700; y+=size) {
        if (y < 250 || y > 550) addWall(600, y);
    }

    // 3. Water Ponds (Large background features)
    for (let i = 0; i < 4; i++) {
        decs.push({
            id: uuid(),
            type: DecorationType.WATER,
            pos: { x: Math.random() * (MAP_SIZE - 100), y: Math.random() * (MAP_SIZE - 100) },
            scale: 0.8 + Math.random() * 0.5
        });
    }

    // 4. Trees (Visual only now)
    for (let i = 0; i < 50; i++) {
        decs.push({
            id: uuid(),
            type: DecorationType.TREE,
            pos: { x: Math.random() * MAP_SIZE, y: Math.random() * MAP_SIZE },
            scale: 0.8 + Math.random() * 0.4
        });
    }

    // 5. Rocks (Visual only now)
    for (let i = 0; i < 30; i++) {
        decs.push({
            id: uuid(),
            type: DecorationType.ROCK,
            pos: { x: Math.random() * MAP_SIZE, y: Math.random() * MAP_SIZE },
            scale: 0.5 + Math.random() * 0.5
        });
    }

    return decs;
  }

  public subscribe(callback: (state: GameState) => void) {
    this.subscribers.push(callback);
    callback(this.state);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  private broadcast() {
    this.subscribers.forEach(cb => cb({ ...this.state }));
  }

  public startGame() {
    if (this.intervalId) return;
    this.state.mode = GameMode.HOME;
    this.broadcast();
    
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, 50);
  }

  public enterWorld() {
    this.state.mode = GameMode.WORLD;
    this.state.player.pos = { x: 400, y: 400 }; // Center of Safe Zone
    
    if (this.state.entities.length === 0) {
      this.spawnMonsters(8);
      this.state.entities.push({
        id: this.botId,
        type: EntityType.OTHER_PLAYER,
        name: '探险者_99',
        pos: { x: 430, y: 400 },
        hp: 100,
        maxHp: 100
      });
    }
    this.broadcast();
  }

  public returnHome() {
    this.state.mode = GameMode.HOME;
    this.broadcast();
  }

  // --- ACTIONS ---

  public movePlayer(delta: Position) {
    const p = this.state.player;
    const targetPos = { x: p.pos.x + delta.x, y: p.pos.y + delta.y };
    
    if (!this.checkCollision(targetPos, p.id)) {
        p.pos = targetPos;
        this.broadcast();
    }
  }

  private checkCollision(pos: Position, ignoreId: string): boolean {
    // 1. Map Bounds
    if (pos.x < 0 || pos.x > MAP_SIZE - PLAYER_SIZE || pos.y < 0 || pos.y > MAP_SIZE - PLAYER_SIZE) {
        return true;
    }

    const centerX = pos.x + PLAYER_SIZE / 2;
    const centerY = pos.y + PLAYER_SIZE / 2;
    const radius = PLAYER_SIZE / 2;

    // 2. Decorations (Only WALLS now)
    for (const dec of this.state.decorations) {
        // Skip non-collidable decorations
        if (dec.type !== DecorationType.WALL) continue; 
        
        const decSize = 32 * dec.scale; 
        
        // AABB-ish collision for Walls (square blocks)
        // Shrink player hitbox slightly to allow sliding through gaps easier
        const hitboxPadding = 5;
        if (
            centerX + radius - hitboxPadding > dec.pos.x &&
            centerX - radius + hitboxPadding < dec.pos.x + decSize &&
            centerY + radius - hitboxPadding > dec.pos.y &&
            centerY - radius + hitboxPadding < dec.pos.y + decSize
        ) {
            return true;
        }
    }

    // 3. Entities
    for (const ent of this.state.entities) {
        if (ent.id === ignoreId) continue;
        if (ent.type === EntityType.LOOT_CONTAINER) continue;

        const entCenterX = ent.pos.x + PLAYER_SIZE / 2;
        const entCenterY = ent.pos.y + PLAYER_SIZE / 2;
        const dist = Math.hypot(centerX - entCenterX, centerY - entCenterY);

        if (dist < radius * 1.5) {
            return true;
        }
    }

    if (ignoreId !== this.state.player.id) {
        const p = this.state.player;
        const pCenterX = p.pos.x + PLAYER_SIZE / 2;
        const pCenterY = p.pos.y + PLAYER_SIZE / 2;
        const dist = Math.hypot(centerX - pCenterX, centerY - pCenterY);
         if (dist < radius * 1.5) {
            return true;
        }
    }

    return false;
  }

  public attack(targetId: string) {
    const target = this.state.entities.find(e => e.id === targetId);
    if (!target) return;

    const dist = Math.hypot(target.pos.x - this.state.player.pos.x, target.pos.y - this.state.player.pos.y);
    if (dist > 100) {
      this.triggerPopup("目标太远了！", "✋");
      return;
    }

    if (target.type.includes('MONSTER')) {
      target.hp -= PLAYER_DAMAGE;
      // Show floating text on monster
      this.addFloatingText(
          target.pos.x + PLAYER_SIZE/2, 
          target.pos.y, 
          `-${PLAYER_DAMAGE}`, 
          'text-white font-black text-xl drop-shadow-md'
      );

      if (target.hp <= 0) {
        this.killEntity(target);
      } else {
        const damage = MONSTER_DAMAGE;
        this.state.player.hp -= damage;
        // Show floating text on player
        this.addFloatingText(
            this.state.player.pos.x + PLAYER_SIZE/2,
            this.state.player.pos.y,
            `-${damage}`,
            'text-red-500 font-black text-xl drop-shadow-md'
        );
        
        if (this.state.player.hp <= 0) {
            this.handlePlayerDeath();
        }
      }
    }
    this.broadcast();
  }

  private handlePlayerDeath() {
      this.state.player.hp = this.state.player.maxHp;
      this.state.player.exp = Math.floor(this.state.player.exp / 2);
      this.state.player.pos = { x: 400, y: 400 }; // Respawn in city
      this.triggerPopup("你被打倒了！", "💀");
      this.triggerPopup("已重生", "🔄");
  }

  public loot(entityId: string) {
    const idx = this.state.entities.findIndex(e => e.id === entityId);
    if (idx === -1) return;
    const entity = this.state.entities[idx];
    
    if (entity.type === EntityType.LOOT_CONTAINER) {
      if (this.state.player.inventory.length >= this.state.player.maxInventory) {
        this.triggerPopup("背包已满！", "🎒");
        return;
      }
      
      const isRare = Math.random() > 0.8;
      const type = isRare ? ItemType.CONTAINER_RARE : ItemType.CONTAINER_COMMON;
      this.state.player.inventory.push({
        id: uuid(),
        type,
        count: 1
      });
      this.state.entities.splice(idx, 1);
      this.triggerPopup(`获得: ${ITEM_INFO[type].name}`, ITEM_INFO[type].emoji);
      this.broadcast();
    }
  }

  public sendChat(text: string) {
    if (!text.trim()) return;
    const msg = `[${this.state.player.name}]: ${text.trim()}`;
    // Only chat goes to log
    this.log(msg);
    this.broadcast();
  }

  // --- HOME ACTIONS ---

  public openContainer(itemId: string) {
    const invIdx = this.state.player.inventory.findIndex(i => i.id === itemId);
    if (invIdx === -1) return;
    
    const item = this.state.player.inventory[invIdx];
    this.state.player.inventory.splice(invIdx, 1);

    const rewards = item.type === ItemType.CONTAINER_RARE ? 3 : 1;
    for(let i=0; i<rewards; i++) {
        const roll = Math.random();
        if (roll < 0.4) this.addResource(ItemType.RESOURCE_WOOD, 5);
        else if (roll < 0.7) this.addResource(ItemType.RESOURCE_STONE, 3);
        else this.addResource(ItemType.SEED_WHEAT, 2);
    }
    this.broadcast();
  }

  public plantCrop(buildingId: string) {
    const b = this.state.home.buildings.find(b => b.id === buildingId);
    const seeds = this.state.home.resources[ItemType.SEED_WHEAT] || 0;
    
    if (b && b.type === 'FIELD' && !b.cropType && seeds > 0) {
      this.state.home.resources[ItemType.SEED_WHEAT] = seeds - 1;
      b.cropType = ItemType.CROP_WHEAT;
      b.plantTime = Date.now();
      b.isReady = false;
      this.broadcast();
    }
  }

  public harvestCrop(buildingId: string) {
    const b = this.state.home.buildings.find(b => b.id === buildingId);
    if (b && b.isReady) {
      b.cropType = undefined;
      b.isReady = false;
      b.plantTime = undefined;
      this.addResource(ItemType.CROP_WHEAT, 2);
      this.state.player.exp += 10;
      this.checkLevelUp();
      this.triggerPopup("收获小麦", "🌾");
      this.broadcast();
    }
  }

  public recoverHp(buildingId: string) {
      const wheat = this.state.home.resources[ItemType.CROP_WHEAT] || 0;
      if (wheat >= 1) {
          if (this.state.player.hp >= this.state.player.maxHp) {
              this.triggerPopup("生命值已满", "❤️");
              return;
          }
          this.state.home.resources[ItemType.CROP_WHEAT] = wheat - 1;
          this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 50);
          
          // Floating text for healing
          this.addFloatingText(
            this.state.player.pos.x + PLAYER_SIZE/2, 
            this.state.player.pos.y, 
            `+50`, 
            'text-green-500 font-black text-xl drop-shadow-md'
          );
          
          this.broadcast();
      } else {
          this.triggerPopup("缺少小麦", "🌾");
      }
  }

  // --- INTERNAL LOGIC ---

  private addFloatingText(x: number, y: number, text: string, colorClass: string) {
      this.state.floatingTexts.push({
          id: uuid(),
          x: x - 10 + (Math.random() * 20 - 10), // slight horizontal scatter
          y: y - 20, // Spawn above entity
          text,
          colorClass,
          timestamp: Date.now()
      });
  }

  private tick() {
    const now = Date.now();
    
    // Popup cleanup
    if (this.state.popups.length > 0) {
        const remaining = this.state.popups.filter(p => now - p.timestamp < 3000);
        if (remaining.length !== this.state.popups.length) {
            this.state.popups = remaining;
            this.broadcast();
        }
    }
    
    // Floating text cleanup (short life)
    if (this.state.floatingTexts.length > 0) {
        const remaining = this.state.floatingTexts.filter(t => now - t.timestamp < 1000);
        if (remaining.length !== this.state.floatingTexts.length) {
            this.state.floatingTexts = remaining;
            this.broadcast();
        }
    }

    if (this.state.mode !== GameMode.WORLD) {
        this.tickFarming();
        return;
    }

    // Move Monsters & Bot
    this.state.entities.forEach(entity => {
      if (entity.type === EntityType.OTHER_PLAYER) {
        this.aiWander(entity, 2);
        const target = this.state.entities.find(t => t.type.includes('MONSTER') && this.getDist(entity, t) < 50);
        if (target && Math.random() < 0.05) {
            target.hp -= 5;
            this.addFloatingText(target.pos.x + PLAYER_SIZE/2, target.pos.y, '-5', 'text-white font-bold');
            if (target.hp <= 0) this.killEntity(target);
        }
        if (Math.random() < 0.005) {
            const msgs = ['今天天气真好！', '小心史莱姆！'];
            const msg = msgs[Math.floor(Math.random() * msgs.length)];
            this.log(`[${entity.name}]: ${msg}`);
            this.broadcast(); // Trigger update for chat logic
        }
      } else if (entity.type.includes('MONSTER')) {
        this.aiWander(entity, 1);
      }
    });

    if (Math.random() < 0.01 && this.state.entities.filter(e => e.type.includes('MONSTER')).length < 8) {
        this.spawnMonsters(1);
    }

    this.broadcast();
  }

  private tickFarming() {
      const now = Date.now();
      let changed = false;
      this.state.home.buildings.forEach(b => {
          if (b.type === 'FIELD' && b.cropType && !b.isReady) {
              if (now - (b.plantTime || 0) > 5000) {
                  b.isReady = true;
                  changed = true;
              }
          }
      });
      if (changed) this.broadcast();
  }

  private aiWander(entity: Entity, speed: number) {
    const moveX = (Math.random() - 0.5) * speed * 2;
    const moveY = (Math.random() - 0.5) * speed * 2;
    const targetPos = { x: entity.pos.x + moveX, y: entity.pos.y + moveY };

    if (!this.checkCollision(targetPos, entity.id)) {
        entity.pos = targetPos;
    }
  }

  private killEntity(target: Entity) {
      this.state.entities = this.state.entities.filter(e => e.id !== target.id);
      this.state.entities.push({
          id: uuid(),
          type: EntityType.LOOT_CONTAINER,
          name: '掉落物',
          pos: { ...target.pos },
          hp: 1, maxHp: 1
      });
      this.triggerPopup(`${target.name} 被击败!`, "⚔️");
  }

  private spawnMonsters(count: number) {
    for (let i = 0; i < count; i++) {
        // Spawn outside the central safe zone (approx)
        let pos = { x: 0, y: 0 };
        let tries = 0;
        do {
             pos = { x: Math.random() * (MAP_SIZE-50), y: Math.random() * (MAP_SIZE-50) };
             tries++;
        } while (
            tries < 20 && 
            (this.checkCollision(pos, 'spawn') || (pos.x > 250 && pos.x < 550 && pos.y > 250 && pos.y < 550))
        );

        const isBeast = Math.random() > 0.7;
        this.state.entities.push({
            id: uuid(),
            type: isBeast ? EntityType.MONSTER_BEAST : EntityType.MONSTER_SLIME,
            name: isBeast ? '凶猛野兽' : '史莱姆',
            pos,
            hp: isBeast ? 80 : 40,
            maxHp: isBeast ? 80 : 40,
        });
    }
  }

  private addResource(type: ItemType, amount: number) {
      this.state.home.resources[type] = (this.state.home.resources[type] || 0) + amount;
      this.triggerPopup(`获得: ${ITEM_INFO[type].name} x${amount}`, ITEM_INFO[type].emoji);
  }

  private triggerPopup(text: string, icon?: string) {
      this.state.popups.push({
          id: uuid(),
          text,
          icon,
          timestamp: Date.now()
      });
  }

  private checkLevelUp() {
      if (this.state.player.exp >= this.state.player.level * 50) {
          this.state.player.level++;
          this.state.player.exp = 0;
          this.state.player.maxHp += 10;
          this.state.player.hp = this.state.player.maxHp;
          this.state.player.maxInventory = Math.min(20, this.state.player.maxInventory + 1);
          this.triggerPopup("等级提升！", "🆙");
      }
  }

  private getDist(a: Entity, b: Entity) {
      return Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
  }

  private log(msg: string) {
    this.state.messages.push(msg);
    if (this.state.messages.length > 50) this.state.messages.shift();
  }
}

export const server = new MockServer();
