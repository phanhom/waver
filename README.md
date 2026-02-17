# 🌊 WAVER - 音乐海洋

> 让音乐连接每一个人，一起聆听，一起感受

WAVER 是一个音乐社交平台，用户可以导入网易云音乐歌单，在"音乐海洋"中探索和播放音乐，并与其他用户实时同步收听。

## ✨ 功能特性

- 🎵 **歌单导入** - 支持导入网易云音乐歌单链接
- 🌊 **音乐海洋** - 精美的可视化界面，展示所有歌曲
- 🎨 **动态主题** - 根据专辑封面自动提取主题色
- 🔊 **高品质播放** - 支持网易云登录获取VIP音质
- 👥 **实时同步** - 看到其他用户正在听什么
- 📱 **响应式设计** - 完美适配桌面和移动设备

## 🛠️ 技术栈

### 后端
- **FastAPI** - 高性能 Python Web 框架
- **Socket.IO** - 实时通信
- **httpx** - 异步 HTTP 客户端

### 前端
- **Next.js 15** - React 框架
- **Tailwind CSS 4** - 原子化 CSS
- **Framer Motion** - 动画库
- **Zustand** - 状态管理
- **Howler.js** - 音频播放
- **Socket.IO Client** - 实时通信

## 🚀 快速开始

### 前置要求

1. **Node.js 18+**
2. **Python 3.10+**
3. **NeteaseCloudMusicApi** - 网易云音乐 API 服务

### 部署网易云 API

首先需要部署 [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)：

```bash
# 克隆项目
git clone https://github.com/Binaryify/NeteaseCloudMusicApi.git
cd NeteaseCloudMusicApi

# 安装依赖
npm install

# 启动服务 (默认端口 3000)
npm start
```

### 启动后端

```bash
cd waver/backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 复制环境变量配置
cp .env.example .env

# 启动服务
uvicorn app.main:app --reload --port 18011
```

### 启动前端

```bash
cd waver/frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:18010 即可使用 WAVER。

## 📖 使用指南

### 导入歌单

1. 点击顶部导航栏的「导入歌单」按钮
2. 粘贴网易云音乐歌单链接
3. 点击「导入歌单」

支持的链接格式：
- `https://music.163.com/#/playlist?id=123456`
- `https://music.163.com/playlist?id=123456`
- `https://y.music.163.com/m/playlist?id=123456`
- 或直接输入歌单ID

### 登录网易云

1. 点击顶部导航栏的「登录」按钮
2. 使用网易云音乐 APP 扫描二维码
3. 在手机上确认登录

登录后可以：
- 播放完整歌曲（包括VIP歌曲）
- 导入私人歌单
- 同步播放记录

### 播放音乐

- 点击音乐海洋中的任意歌曲卡片即可播放
- 底部播放器支持播放/暂停、上一首/下一首、进度控制
- 点击播放器上方的箭头可展开全屏播放器

## 🎨 界面预览

### 音乐海洋
- 精美的卡片式布局
- 浮动粒子动画效果
- 播放中的歌曲有脉冲波纹效果

### 播放器
- 高斯模糊专辑封面背景
- 动态主题色
- 音乐可视化效果

## 📁 项目结构

```
waver/
├── backend/                 # 后端服务
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py         # FastAPI 入口
│   │   ├── config.py       # 配置文件
│   │   ├── models.py       # 数据模型
│   │   ├── websocket.py    # WebSocket 处理
│   │   ├── routers/        # API 路由
│   │   │   ├── music.py    # 音乐相关 API
│   │   │   └── sync.py     # 同步相关 API
│   │   └── services/       # 服务层
│   │       └── netease.py  # 网易云音乐服务
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/               # 前端应用
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   └── globals.css
    │   ├── components/
    │   │   ├── Header.tsx      # 顶部导航
    │   │   ├── MusicOcean.tsx  # 音乐海洋
    │   │   ├── Player.tsx      # 播放器
    │   │   ├── ImportModal.tsx # 导入歌单弹窗
    │   │   └── LoginModal.tsx  # 登录弹窗
    │   └── lib/
    │       ├── store.ts    # 状态管理
    │       ├── api.ts      # API 客户端
    │       ├── socket.ts   # WebSocket 客户端
    │       ├── audio.ts    # 音频播放器
    │       └── colors.ts   # 颜色提取
    ├── package.json
    └── next.config.ts
```

## 🔧 配置说明

### 后端环境变量 (.env)

```env
# 调试模式
DEBUG=true

# 服务器配置
HOST=0.0.0.0
PORT=18011

# 网易云音乐 API 地址
NETEASE_API_BASE=http://localhost:3000
```

### 前端配置 (next.config.ts)

API 代理已配置，前端请求 `/api/*` 会自动转发到后端。

## 📝 API 文档

启动后端后，访问以下地址查看 API 文档：

- Swagger UI: http://localhost:18011/docs
- ReDoc: http://localhost:18011/redoc

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

Made with ❤️ by WAVER Team
