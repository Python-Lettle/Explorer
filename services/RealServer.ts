
import { GameService, GameState, Position, GameMode } from '../types';
import { BACKEND_URL } from '../constants';

class RealServer implements GameService {
  private subscribers: ((state: GameState) => void)[] = [];
  private socket: WebSocket | null = null;
  private state: GameState;

  constructor() {
    // Initial empty/loading state to prevent UI crashes before connection
    this.state = {
      mode: GameMode.LOBBY,
      messages: ['正在连接真实服务器...'],
      entities: [],
      decorations: [],
      player: {
        id: 'local',
        name: 'Player',
        pos: { x: 0, y: 0 },
        hp: 100,
        maxHp: 100,
        inventory: [],
        maxInventory: 10,
        level: 1,
        exp: 0
      },
      home: {
        buildings: [],
        resources: {}
      },
      popups: [],
      floatingTexts: []
    };
  }

  public subscribe(callback: (state: GameState) => void) {
    this.subscribers.push(callback);
    callback(this.state);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  public startGame() {
    this.connect();
  }

  private connect() {
    this.socket = new WebSocket(BACKEND_URL);
    
    this.socket.onopen = () => {
        console.log('Connected to backend');
        this.send({ type: 'LOGIN' });
        // Assume backend sends full state on login
    };
    
    this.socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'STATE_UPDATE') {
                this.state = data.payload;
                this.broadcast();
            }
        } catch (e) {
            console.error('Failed to parse message', e);
        }
    };
    
    this.socket.onclose = () => {
        console.log('Disconnected');
        this.state.messages.push('与服务器断开连接');
        this.broadcast();
    };
    
    this.socket.onerror = (err) => {
        console.error('Socket error:', err);
    };
  }

  private send(payload: any) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify(payload));
      }
  }

  private broadcast() {
    this.subscribers.forEach(cb => cb({ ...this.state }));
  }

  // --- Interface Implementation ---
  
  enterWorld() { this.send({ type: 'ENTER_WORLD' }); }
  returnHome() { this.send({ type: 'RETURN_HOME' }); }
  movePlayer(delta: Position) { this.send({ type: 'MOVE', delta }); }
  attack(targetId: string) { this.send({ type: 'ATTACK', targetId }); }
  loot(entityId: string) { this.send({ type: 'LOOT', entityId }); }
  sendChat(text: string) { this.send({ type: 'CHAT', text }); }
  openContainer(itemId: string) { this.send({ type: 'OPEN_CONTAINER', itemId }); }
  plantCrop(buildingId: string) { this.send({ type: 'PLANT', buildingId }); }
  harvestCrop(buildingId: string) { this.send({ type: 'HARVEST', buildingId }); }
  recoverHp(buildingId: string) { this.send({ type: 'RECOVER_HP', buildingId }); }
}

export const server = new RealServer();
