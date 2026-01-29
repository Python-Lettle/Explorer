
import { Entity, EntityType, GameState, ItemType, Position, GameMode, Decoration, DecorationType, GameService, Building } from '../types';
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
  private users: Map<string, string> = new Map(); // username -> password
  
  // Simulated "Other" player for multiplayer demo
  private botId: string;

  constructor() {
    this.botId = uuid();
    this.state = this.getInitialState();
    
    // Add a default user for testing
    this.users.set('test', '123');
  }

  private getInitialState(): GameState {
    // Deep copy initial buildings to avoid mutation issues
    const buildings: Building[] = JSON.parse(JSON.stringify(INITIAL_HOME_BUILDINGS));
    const center = MAP_SIZE / 2;

    return {
      mode: GameMode.AUTH, // Start in AUTH mode
      messages: ['欢迎来到 EcoExplore!', '使用摇杆移动。', '靠近物体按下 ⚔️ 互动。'],
      entities: [], // Populated when joining world
      decorations: this.generateDecorations(),
      player: {
        id: 'local-player',
        name: '冒险家',
        pos: { x: center, y: center }, // Spawn in city center
        hp: 100,
        maxHp: 100,
        inventory: [],
        maxInventory: 10,
        level: 1,
        exp: 0,
      },
      home: {
        buildings: buildings,
        resources: {
            [ItemType.RESOURCE_WOOD]: 0,
            [ItemType.RESOURCE_STONE]: 0,
            [ItemType.SEED_WHEAT]: 2,
            [ItemType.CROP_WHEAT]: 0,
        },
      },
      popups: [],
      floatingTexts: []
    };
  }

  private generateDecorations(): Decoration[] {
    const decorations: Decoration[] = [];
    const wallSize = 32;

    // Helper to add a wall block
    const addWall = (x: number, y: number) => {
        decorations.push({ id: uuid(), type: DecorationType.WALL, pos: { x, y }, scale: 1 });
    };
    
    // 1. Generate Outer Boundary Walls (Map Edges)
    for (let i = 0; i < MAP_SIZE; i += wallSize) {
        // Top & Bottom
        addWall(i, 0);
        addWall(i, MAP_SIZE - wallSize);
        
        // Left & Right (avoid corners to prevent double placement, though overlap is invisible)
        if (i > 0 && i < MAP_SIZE - wallSize) {
             addWall(0, i);
             addWall(MAP_SIZE - wallSize, i);
        }
    }

    // 2. Generate Central City Walls
    const center = MAP_SIZE / 2;
    const cityRadius = 300; // 600x600 city
    const cityMin = center - cityRadius;
    const cityMax = center + cityRadius;
    const gateWidth = 128; // Size of the opening

    // Horizontal City Walls (Top and Bottom of city)
    for (let x = cityMin; x <= cityMax; x += wallSize) {
        // Leave Gap in middle for Gate
        if (Math.abs(x - center) > gateWidth / 2) {
            addWall(x, cityMin);
            addWall(x, cityMax);
        }
    }

    // Vertical City Walls (Left and Right of city)
    for (let y = cityMin; y <= cityMax; y += wallSize) {
        // Leave Gap in middle for Gate
        if (Math.abs(y - center) > gateWidth / 2) {
            addWall(cityMin, y);
            addWall(cityMax, y);
        }
    }

    // Collision Helper for Nature Generation
    const isOverlapping = (x: number, y: number, radius: number) => {
        // 1. Prevent spawning inside the city (keep it clean)
        // Check if inside city box (including walls)
        if (x > cityMin - 50 && x < cityMax + 50 && 
            y > cityMin - 50 && y < cityMax + 50) {
            return true;
        }

        // 2. Check collision with existing decorations (walls)
        for (const d of decorations) {
            const dx = d.pos.x - x;
            const dy = d.pos.y - y;
            const dist = Math.hypot(dx, dy);
            // Ensure enough space between tree/rock and wall
            if (dist < radius + 40) return true; 
        }
        return false;
    };

    // 3. Generate Random Nature Elements
    // Increased counts for larger map
    const itemsToPlace = [
        { type: DecorationType.WATER, count: 12, radius: 60 },
        { type: DecorationType.TREE, count: 150, radius: 25 },
        { type: DecorationType.ROCK, count: 80, radius: 20 },
    ];

    itemsToPlace.forEach(item => {
        let placed = 0;
        let attempts = 0;
        while (placed < item.count && attempts < 2000) {
            attempts++;
            const x = Math.random() * (MAP_SIZE - 100) + 50;
            const y = Math.random() * (MAP_SIZE - 100) + 50;
            
            if (!isOverlapping(x, y, item.radius)) {
                decorations.push({
                    id: uuid(),
                    type: item.type,
                    pos: { x, y },
                    scale: 0.8 + Math.random() * 0.4
                });
                placed++;
            }
        }
    });

    return decorations;
  }

  public subscribe(callback: (state: GameState) => void): () => void {
    this.subscribers.push(callback);
    callback(this.state);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private broadcast() {
    this.subscribers.forEach(cb => cb({ ...this.state }));
  }

  public startGame() {
    if (this.intervalId) return;
    this.intervalId = window.setInterval(() => {
      this.tick();
      this.broadcast();
    }, 50); // 20 TPS
  }

  private tick() {
    const now = Date.now();

    // Fade out popups
    this.state.popups = this.state.popups.filter(p => now - p.timestamp < 3000);
    this.state.floatingTexts = this.state.floatingTexts.filter(t => now - t.timestamp < 1000);

    // Update Crops
    this.state.home.buildings.forEach(b => {
        if (b.type === 'FIELD' && b.cropType && !b.isReady && b.plantTime) {
            if (now - b.plantTime > 5000) { // 5 seconds to grow
                b.isReady = true;
                this.addPopup('小麦成熟了！', '🌾');
            }
        }
    });

    // Simple bot movement
    if (this.state.mode === GameMode.WORLD) {
        const bot = this.state.entities.find(e => e.id === this.botId);
        if (bot) {
            bot.pos.x += (Math.random() - 0.5) * 2;
            bot.pos.y += (Math.random() - 0.5) * 2;
        }
    }
  }

  // --- AUTH ---
  
  public login(u: string, p: string) {
      if (this.users.get(u) === p) {
          this.state.player.name = u;
          this.state.mode = GameMode.LOBBY;
          this.addPopup(`欢迎回来, ${u}!`, '👋');
          this.broadcast();
      } else {
          this.addPopup('用户名或密码错误', '❌');
          this.broadcast();
      }
  }

  public register(u: string, p: string) {
      if (this.users.has(u)) {
          this.addPopup('该用户已存在', '⚠️');
          this.broadcast();
          return;
      }
      this.users.set(u, p);
      this.state.player.name = u;
      this.state.mode = GameMode.LOBBY;
      this.addPopup(`注册成功! 欢迎 ${u}`, '🎉');
      this.broadcast();
  }

  // --- ACTIONS ---

  public enterWorld() {
    this.state.mode = GameMode.WORLD;
    this.state.messages.push('系统: 进入荒野...');
    
    // Reset or Respawn entities if empty
    if (this.state.entities.length === 0) {
        this.spawnEntities();
    }
  }

  private spawnEntities() {
      const center = MAP_SIZE / 2;
      
      // 1. Bot Player (In city)
      this.state.entities.push({
          id: this.botId,
          type: EntityType.OTHER_PLAYER,
          pos: { x: center + 50, y: center + 50 },
          hp: 100,
          maxHp: 100,
          name: '迷路的旅人'
      });

      // Helper to find valid spawn outside city
      const getWildPos = () => {
          const citySafeRadius = 400; // slightly larger than wall radius (300)
          for(let i=0; i<20; i++) {
              const x = Math.random() * (MAP_SIZE - 200) + 100;
              const y = Math.random() * (MAP_SIZE - 200) + 100;
              
              const distFromCenter = Math.hypot(x - center, y - center);
              if (distFromCenter > citySafeRadius) {
                  return { x, y };
              }
          }
          // Fallback if random fails
          return { x: 100, y: 100 };
      }

      // 2. Monsters (More of them now, since map is big and chests are drops only)
      for(let i=0; i<50; i++) {
        const pos = getWildPos();
        this.state.entities.push({
            id: uuid(),
            type: Math.random() > 0.3 ? EntityType.MONSTER_SLIME : EntityType.MONSTER_BEAST,
            pos: pos,
            hp: 50,
            maxHp: 50,
            name: Math.random() > 0.3 ? '史莱姆' : '野狼'
        });
      }
  }

  public returnHome() {
    this.state.mode = GameMode.HOME;
    this.state.messages.push('系统: 返回家园。');
  }

  public movePlayer(delta: Position) {
    if (this.state.mode !== GameMode.WORLD) return;
    
    const p = this.state.player;
    let newX = p.pos.x + delta.x;
    let newY = p.pos.y + delta.y;

    // Boundaries
    newX = Math.max(32, Math.min(MAP_SIZE - 32 - PLAYER_SIZE, newX));
    newY = Math.max(32, Math.min(MAP_SIZE - 32 - PLAYER_SIZE, newY));

    // Collision with Walls (Decorations)
    const wallCollision = this.state.decorations.some(d => {
        if (d.type !== DecorationType.WALL) return false;
        // Simple circle-circle distance check
        const dist = Math.hypot(d.pos.x - newX, d.pos.y - newY);
        // Wall size 32 (radius ~16), Player size 32 (radius 16). 
        // 16 + 16 = 32. Using 30 allows slight overlap for better feel.
        return dist < 30; 
    });

    if (!wallCollision) {
        p.pos.x = newX;
        p.pos.y = newY;
    }
  }

  public attack(targetId: string) {
    const target = this.state.entities.find(e => e.id === targetId);
    if (!target) return;

    // Check range
    const dist = Math.hypot(target.pos.x - this.state.player.pos.x, target.pos.y - this.state.player.pos.y);
    if (dist > 80) {
        this.addPopup('距离太远！', '❌');
        return;
    }

    // Deal Damage
    target.hp -= PLAYER_DAMAGE;
    this.addFloatingText(target.pos.x, target.pos.y, `-${PLAYER_DAMAGE}`, 'text-red-500 font-bold text-xl');

    if (target.hp <= 0) {
        this.state.entities = this.state.entities.filter(e => e.id !== targetId);
        this.addPopup(`击败了 ${target.name}!`, '⚔️');
        
        // Drop loot chance
        if (target.type.includes('MONSTER')) {
            this.state.player.exp += 20;
            this.checkLevelUp();
            // 50% chance to drop container
            if (Math.random() > 0.5) {
                const loot: Entity = {
                    id: uuid(),
                    type: EntityType.LOOT_CONTAINER,
                    pos: { ...target.pos },
                    hp: 1,
                    maxHp: 1,
                    name: '掉落物'
                };
                this.state.entities.push(loot);
            }
        }
    } else {
        // Monster counter-attack (simplified)
        this.state.player.hp = Math.max(0, this.state.player.hp - 5);
        this.addFloatingText(this.state.player.pos.x, this.state.player.pos.y, `-5`, 'text-yellow-500 font-bold');
    }
  }

  public loot(entityId: string) {
      const target = this.state.entities.find(e => e.id === entityId);
      if (!target || target.type !== EntityType.LOOT_CONTAINER) return;

      const dist = Math.hypot(target.pos.x - this.state.player.pos.x, target.pos.y - this.state.player.pos.y);
      if (dist > 60) return;

      // Remove entity
      this.state.entities = this.state.entities.filter(e => e.id !== entityId);
      
      // Add to inventory
      const type = Math.random() > 0.8 ? ItemType.CONTAINER_RARE : ItemType.CONTAINER_COMMON;
      this.addItem(type, 1);
      this.addPopup('获得了箱子!', '📦');
  }

  public sendChat(text: string) {
      this.state.messages.push(`${this.state.player.name}: ${text}`);
      if (this.state.messages.length > 20) this.state.messages.shift();
  }

  public openContainer(itemId: string) {
      // Find and remove item
      const inv = this.state.player.inventory;
      const idx = inv.findIndex(i => i.id === itemId);
      if (idx === -1) return;

      inv.splice(idx, 1);

      // Give rewards
      const wood = Math.floor(Math.random() * 5) + 1;
      const stone = Math.floor(Math.random() * 3);
      const seeds = Math.floor(Math.random() * 2) + 1;

      this.addResource(ItemType.RESOURCE_WOOD, wood);
      if (stone > 0) this.addResource(ItemType.RESOURCE_STONE, stone);
      this.addResource(ItemType.SEED_WHEAT, seeds);

      this.addPopup(`获得: 木头x${wood} 种子x${seeds}`, '✨');
  }

  public plantCrop(buildingId: string) {
      const b = this.state.home.buildings.find(b => b.id === buildingId);
      if (!b || b.type !== 'FIELD' || b.cropType) return;

      const seeds = this.state.home.resources[ItemType.SEED_WHEAT] || 0;
      if (seeds < 1) {
          this.addPopup('种子不足', '🚫');
          return;
      }

      this.state.home.resources[ItemType.SEED_WHEAT] = seeds - 1;
      b.cropType = ItemType.CROP_WHEAT;
      b.plantTime = Date.now();
      b.isReady = false;
      this.addPopup('种植成功', '🌱');
  }

  public harvestCrop(buildingId: string) {
      const b = this.state.home.buildings.find(b => b.id === buildingId);
      if (!b || b.type !== 'FIELD' || !b.isReady) return;

      b.cropType = undefined;
      b.isReady = false;
      b.plantTime = undefined;

      this.addResource(ItemType.CROP_WHEAT, 2);
      this.state.player.exp += 10;
      this.checkLevelUp();
      this.addPopup('收获小麦 x2', '🌾');
  }

  public recoverHp(buildingId: string) {
      const wheat = this.state.home.resources[ItemType.CROP_WHEAT] || 0;
      if (wheat < 1) {
          this.addPopup('小麦不足', '🚫');
          return;
      }
      
      if (this.state.player.hp >= this.state.player.maxHp) {
          this.addPopup('体力已满', '😊');
          return;
      }

      this.state.home.resources[ItemType.CROP_WHEAT] = wheat - 1;
      this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 50);
      this.addPopup('体力恢复!', '❤️');
  }

  // --- HELPERS ---

  private addItem(type: ItemType, count: number) {
      const inv = this.state.player.inventory;
      if (inv.length >= this.state.player.maxInventory) {
          this.addPopup('背包已满!', '⚠️');
          return;
      }
      inv.push({ id: uuid(), type, count });
  }

  private addResource(type: ItemType, count: number) {
      this.state.home.resources[type] = (this.state.home.resources[type] || 0) + count;
  }

  private addPopup(text: string, icon?: string) {
      this.state.popups.push({
          id: uuid(),
          text,
          icon,
          timestamp: Date.now()
      });
  }

  private addFloatingText(x: number, y: number, text: string, colorClass: string) {
      this.state.floatingTexts.push({
          id: uuid(),
          x, y, text, colorClass,
          timestamp: Date.now()
      });
  }

  private checkLevelUp() {
      const p = this.state.player;
      const threshold = p.level * 50;
      if (p.exp >= threshold) {
          p.level++;
          p.exp -= threshold;
          p.maxHp += 20;
          p.hp = p.maxHp;
          this.addPopup('升级了!', '🆙');
          this.state.messages.push(`系统: 恭喜你升到了 ${p.level} 级!`);
      }
  }
}

export const server = new MockServer();
