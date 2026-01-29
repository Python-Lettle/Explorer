
import { ItemType } from './types';

// --- CONFIGURATION ---
export const USE_MOCK_SERVER = true; // Set to false to connect to real backend
export const BACKEND_URL = 'ws://localhost:8080/ws'; // Real backend WebSocket URL

// Map Settings
export const MAP_SIZE = 800; // Pixels
export const PLAYER_SIZE = 32;
export const TICK_RATE = 50; // ms (20 updates/sec)
export const MOVEMENT_SPEED = 5;

// Physics
export const COLLISION_RADIUS = 20; // Effective radius for collision
export const INTERACTION_RANGE = 60;

// Combat
export const PLAYER_DAMAGE = 20;
export const MONSTER_DAMAGE = 10;

// Visual Colors
export const COLORS = {
  PLAYER: 'bg-blue-500',
  OTHER_PLAYER: 'bg-indigo-400',
  MONSTER_SLIME: 'bg-green-500',
  MONSTER_BEAST: 'bg-red-600',
  LOOT_CONTAINER: 'bg-yellow-400 animate-bounce',
};

// Item Config
export const ITEM_INFO: Record<ItemType, { name: string; emoji: string }> = {
  [ItemType.CONTAINER_COMMON]: { name: '破旧的箱子', emoji: '📦' },
  [ItemType.CONTAINER_RARE]: { name: '黄金宝箱', emoji: '👑' },
  [ItemType.RESOURCE_WOOD]: { name: '木材', emoji: '🪵' },
  [ItemType.RESOURCE_STONE]: { name: '石料', emoji: '🪨' },
  [ItemType.SEED_WHEAT]: { name: '小麦种子', emoji: '🌱' },
  [ItemType.CROP_WHEAT]: { name: '小麦', emoji: '🌾' },
};

export const INITIAL_HOME_BUILDINGS = [
  { id: 'b1', type: 'CONTAINER_OPENER', pos: { x: 100, y: 100 }, level: 1 },
  { id: 'b2', type: 'FIELD', pos: { x: 200, y: 100 }, level: 1 },
  { id: 'b3', type: 'WORKBENCH', pos: { x: 300, y: 100 }, level: 1 },
  { id: 'b4', type: 'CANTEEN', pos: { x: 100, y: 200 }, level: 1 },
] as const;
