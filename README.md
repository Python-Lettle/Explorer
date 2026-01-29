
# EcoExplore: Multiplayer 🌲

这是一个多人在线协作探索与家园建设游戏的 Web 前端项目。

本项目支持 **Mock 模式**（纯前端演示）和 **真实后端模式**。

---

## 🚀 快速开始

### 1. 运行项目

由于本项目使用了 ES Modules (`import/export`)，浏览器**不允许**直接通过 `file://` 协议（即双击 HTML 文件）打开。

**必须使用本地 HTTP 服务器运行。**

推荐方式：
*   **VS Code**: 安装 "Live Server" 插件，右键 `index.html` 选择 "Open with Live Server"。
*   **Python**: 在项目根目录运行 `python -m http.server`，然后访问 `http://localhost:8000`。
*   **Node.js**: 运行 `npx serve .`。

### 2. 切换模式

打开 `src/constants.ts`：
*   设置 `export const USE_MOCK_SERVER = true;` 使用纯前端 Mock 模式（体验单机逻辑）。
*   设置 `export const USE_MOCK_SERVER = false;` 连接真实后端（需要自己实现后端）。

---

## 🏗 后端接口开发指南

为了启用真实的多人联机功能，你需要开发一个后端服务。以下是前端 `RealServer.ts` 和 `types.ts` 定义的完整通信协议。

### 1. 通信基础

*   **协议**: WebSocket
*   **默认地址**: `ws://localhost:8080/ws` (可在 `src/constants.ts` 中修改 `BACKEND_URL`)
*   **数据格式**: JSON

### 2. 上行指令 (Client -> Server)

前端通过 WebSocket 发送如下 JSON 消息。`payload` 字段根据 `type` 的不同而变化。

#### 🔐 认证类
| 消息类型 (`type`) | Payload 参数 | 描述 | 后端逻辑建议 |
| :--- | :--- | :--- | :--- |
| `REGISTER` | `{ username, password }` | 注册账号 | 检查用户名是否存在。若成功，创建用户并自动登录（进入 `LOBBY` 模式）。 |
| `LOGIN` | `{ username, password }` | 登录账号 | 校验凭证。若成功，加载用户数据，发送包含 `mode: 'LOBBY'` 的状态更新。 |

#### 🌏 世界交互类
| 消息类型 (`type`) | Payload 参数 | 描述 | 后端逻辑建议 |
| :--- | :--- | :--- | :--- |
| `ENTER_WORLD` | `{}` | 进入荒野 | 将玩家 `mode` 设为 `WORLD`。将玩家实体加入空间索引。返回周围环境数据。 |
| `RETURN_HOME` | `{}` | 返回家园 | 将玩家 `mode` 设为 `HOME`。保存玩家位置，从地图中移除实体（可选）。 |
| `MOVE` | `{ delta: {x, y} }` | 移动请求 | `delta` 是位移向量。验证移动合法性（速度/碰撞），更新坐标，广播给视野内玩家。 |
| `ATTACK` | `{ targetId }` | 攻击实体 | 检查距离。计算伤害。扣除目标 HP。若目标死亡：<br>1. 若是怪物，计算经验/掉落。<br>2. 广播实体移除和掉落物生成。 |
| `LOOT` | `{ entityId }` | 拾取掉落 | 检查距离。验证归属权。将掉落物转化为物品存入玩家 `inventory`。移除掉落物实体。 |
| `CHAT` | `{ text }` | 发送聊天 | 过滤敏感词。将消息追加到 `messages` 队列，并广播给同房间/地图玩家。 |

#### 🏡 家园建设类
| 消息类型 (`type`) | Payload 参数 | 描述 | 后端逻辑建议 |
| :--- | :--- | :--- | :--- |
| `OPEN_CONTAINER` | `{ itemId }` | 开箱子 | 检查背包是否有该 ID 的箱子。移除箱子，随机生成资源（木/石/种），更新 `home.resources`。 |
| `PLANT` | `{ buildingId }` | 种植作物 | 检查 `SEED_WHEAT` > 0。找到对应 `FIELD` 建筑，设置 `cropType='CROP_WHEAT'` 和 `plantTime=now`。 |
| `HARVEST` | `{ buildingId }` | 收获作物 | 检查是否成熟 (Time > 5s)。重置建筑状态。增加 `CROP_WHEAT` 资源。增加玩家经验。 |
| `RECOVER_HP` | `{ buildingId }` | 食堂进食 | 检查 `CROP_WHEAT` > 0。消耗资源，恢复玩家 HP (不超 MaxHP)。 |

---

### 3. 下行同步 (Server -> Client)

后端需要向客户端推送游戏状态。目前前端采用**全量状态同步**（State Update）模式。

**消息结构:**
```json
{
  "type": "STATE_UPDATE",
  "payload": { ...GameState Object... }
}
```

#### Payload (`GameState`) 数据结构详情

后端返回的 JSON **必须**严格符合以下结构，否则前端可能报错或渲染异常。

```typescript
interface GameState {
  // 1. 游戏模式控制
  // AUTH: 显示登录/注册页
  // LOBBY: 登录成功后的欢迎页
  // WORLD: 顶视角的地图探索模式
  // HOME: 家园管理界面
  mode: 'AUTH' | 'LOBBY' | 'WORLD' | 'HOME';

  // 2. 玩家自身状态 (高频更新)
  player: {
    id: string;          // 唯一标识
    name: string;        // 显示名称
    pos: { x: number, y: number }; // 坐标 (0-2000)
    hp: number;
    maxHp: number;
    level: number;
    exp: number;
    maxInventory: number; // 背包格子数
    inventory: Array<{    // 背包物品
      id: string;
      type: 'CONTAINER_COMMON' | 'CONTAINER_RARE'; // 目前主要存放箱子
      count: number;
    }>;
  };

  // 3. 场景实体 (仅在 mode='WORLD' 时需要填充)
  // 包括：其他玩家、怪物、掉落物
  entities: Array<{
    id: string;
    type: 'PLAYER' | 'OTHER_PLAYER' | 'MONSTER_SLIME' | 'MONSTER_BEAST' | 'LOOT_CONTAINER';
    pos: { x: number, y: number };
    hp: number;
    maxHp: number;
    name: string;
  }>;

  // 4. 静态装饰物 (仅在 mode='WORLD' 时需要填充)
  // 树木、石头、墙壁等碰撞体积
  decorations: Array<{
    id: string;
    type: 'TREE' | 'ROCK' | 'WATER' | 'WALL';
    pos: { x: number, y: number };
    scale: number;
  }>;

  // 5. 家园数据 (仅在 mode='HOME' 时需要最新数据，但建议常驻)
  home: {
    // 资源存储
    resources: {
      "RESOURCE_WOOD": number,
      "RESOURCE_STONE": number,
      "SEED_WHEAT": number,
      "CROP_WHEAT": number
    };
    // 建筑状态
    buildings: Array<{
      id: string;
      type: 'FIELD' | 'WORKBENCH' | 'CONTAINER_OPENER' | 'CANTEEN';
      pos: { x: number, y: number }; // 这里的 pos 是家园 UI 中的相对位置
      level: number;
      // 农田特有字段
      cropType?: 'CROP_WHEAT'; 
      plantTime?: number; // 种植时间戳 (用于前端计算进度条)
      isReady?: boolean;  // 后端确认是否成熟
    }>;
  };

  // 6. UI 交互反馈
  // 聊天与系统日志
  messages: string[]; 
  
  // 弹窗提示 (如 "获得木头 x1")
  // 后端生成一个 ID，前端展示后会淡出，但依然保留在数组中直到下一次更新清理
  popups: Array<{
    id: string;
    text: string;
    icon?: string;
    timestamp: number;
  }>;

  // 伤害飘字 (如 "-20")
  floatingTexts: Array<{
    id: string;
    x: number;
    y: number;
    text: string;
    colorClass: string; // 例如 "text-red-500"
    timestamp: number;
  }>;
}
```

---

### 4. 后端开发建议 (Best Practices)

1.  **初始连接状态**:
    当 WebSocket 刚连接时，后端应立即发送一个 `STATE_UPDATE`，其中 `mode` 为 `'AUTH'`，以便前端显示登录界面。

2.  **Tick 循环**:
    建议后端维护一个 20Hz (50ms) 或 10Hz (100ms) 的主循环。
    *   处理所有由于 `MOVE` 指令产生的物理位置变更。
    *   处理怪物 AI (简单的向玩家移动或随机游荡)。
    *   检查农作物生长定时器。
    *   **广播状态**: 在 Tick 结束时，将更新后的 `GameState` 推送给相关客户端。

3.  **视野管理 (AOI)**:
    地图大小为 2000x2000。如果玩家较多，建议只发送玩家视野范围内的 `entities` 和 `decorations`，以减小带宽压力。

4.  **持久化**:
    *   `player` 数据（等级、经验、背包）和 `home` 数据（资源、建筑等级）需要存入数据库。
    *   `entities` (怪物) 可以是临时的，随服务器重启重置。

