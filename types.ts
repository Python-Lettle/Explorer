
export enum GameMode {
  AUTH = 'AUTH',
  LOBBY = 'LOBBY',
  WORLD = 'WORLD',
  HOME = 'HOME',
}

export enum EntityType {
  PLAYER = 'PLAYER',
  OTHER_PLAYER = 'OTHER_PLAYER',
  MONSTER_SLIME = 'MONSTER_SLIME',
  MONSTER_BEAST = 'MONSTER_BEAST',
  LOOT_CONTAINER = 'LOOT_CONTAINER',
}

export enum ItemType {
  CONTAINER_COMMON = 'CONTAINER_COMMON',
  CONTAINER_RARE = 'CONTAINER_RARE',
  RESOURCE_WOOD = 'RESOURCE_WOOD',
  RESOURCE_STONE = 'RESOURCE_STONE',
  SEED_WHEAT = 'SEED_WHEAT',
  CROP_WHEAT = 'CROP_WHEAT',
}

export enum DecorationType {
  TREE = 'TREE',
  ROCK = 'ROCK',
  FLOWER = 'FLOWER',
  WATER = 'WATER',
  WALL = 'WALL',
}

export interface Position {
  x: number;
  y: number;
}

export interface Decoration {
  id: string;
  type: DecorationType;
  pos: Position;
  scale: number; // For size variation
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Position;
  hp: number;
  maxHp: number;
  name: string;
  targetId?: string; // For monsters attacking
}

export interface Item {
  id: string;
  type: ItemType;
  count: number;
}

export interface Building {
  id: string;
  type: 'FIELD' | 'WORKBENCH' | 'CONTAINER_OPENER' | 'CANTEEN';
  pos: Position;
  level: number;
  // For fields
  cropType?: ItemType;
  plantTime?: number;
  isReady?: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  pos: Position;
  hp: number;
  maxHp: number;
  inventory: Item[];
  maxInventory: number;
  level: number;
  exp: number;
}

export interface HomeState {
  buildings: Building[];
  resources: { [key in ItemType]?: number };
}

export interface Popup {
    id: string;
    text: string;
    icon?: string;
    timestamp: number;
}

export interface FloatingText {
    id: string;
    x: number;
    y: number;
    text: string;
    colorClass: string;
    timestamp: number;
}

export interface GameState {
  mode: GameMode;
  entities: Entity[];
  decorations: Decoration[]; // Static map terrain
  player: PlayerState;
  home: HomeState;
  messages: string[]; // Log
  popups: Popup[]; // Notification drops
  floatingTexts: FloatingText[]; // Damage numbers etc
}

// Interface ensuring both Mock and Real servers implement the same API
export interface GameService {
  subscribe(callback: (state: GameState) => void): () => void;
  startGame(): void;
  
  // Auth
  login(username: string, password: string): void;
  register(username: string, password: string): void;

  // Game Actions
  enterWorld(): void;
  returnHome(): void;
  movePlayer(delta: Position): void;
  attack(targetId: string): void;
  loot(entityId: string): void;
  sendChat(text: string): void;
  openContainer(itemId: string): void;
  plantCrop(buildingId: string): void;
  harvestCrop(buildingId: string): void;
  recoverHp(buildingId: string): void;
}
