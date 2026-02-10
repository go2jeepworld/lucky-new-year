# 🧧 Lucky New Year! — 用户操作手册  
## A Fun Online Card Game Celebrating Chinese Culture

> Play with friends around the world — no download needed!  
> Just open your browser and start collecting "Luck Points" with dumplings, pandas, red envelopes, and more!

> 使用建议：将此手册保存为 USER_GUIDE.md 或转为 PDF 发给玩家。在游戏大厅页面底部添加一个 "How to Play?" 链接，指向此文档。若部署在公网，可将其作为 /guide 路由（用 Flask 渲染）
---

## 🌐 1. 如何开始游戏？（How to Start）

### Step 1: 打开游戏网站  
Visit: `http://your-game-url.com` （由房间创建者提供链接）

> 💡 You only need a modern web browser (Chrome, Firefox, Safari, Edge).

### Step 2: 输入你的名字  
Type your **English name** (or nickname) in the box.  
Example: `Alex`, `Mei`, `DragonMaster`

### Step 3: 创建或加入房间  
- **想当房主？** → Click **"Create Room"**  
  - You'll get a **5-letter room code** like `XK9M2`
  - Share this code with your friends!
- **已有房间码？** → Enter it and click **"Join Room"**

✅ 最多支持 **12 位玩家** 同时游戏！

---

## 🎮 2. 游戏怎么玩？（How to Play）

### 🎯 目标（Goal）  
Collect **15 "Luck Points"** (福气值) to win!  
You earn points by:
- Playing special cards (like 🥟 Dumpling)
- Answering fun culture questions correctly

### 🃏 你的手牌（Your Hand）
- At the start, you get **5 cards**.
- Each card has a **Chinese cultural symbol** and a special power.

| Card | What It Does |
|------|--------------|
| 🥟 **Dumpling** | +1 Luck Point |
| 🧧 **Red Envelope** | Draw 2 extra cards |
| 🐼 **Panda** | Peek at one player's hand |
| 🏯 **Great Wall** | Block a negative effect |
| 🐉 **Dragon Dance** | Make everyone answer a question! |
| ❓ **Culture Quiz** | Test your knowledge of China! |

### 🔁 游戏流程（Turn Order）
1. On your turn, **click "Play Card"** and type the card name (e.g., `Dumpling`).
2. The game applies the effect automatically.
3. If a **question appears**, choose A, B, or C.
4. Next player goes after ～30 seconds.

> ⏱️ Don't worry — there's no penalty for wrong answers! It's all about learning and fun.

### 🏆 获胜（Winning）
- First player to reach **15 Luck Points** wins!
- Fireworks animation plays 🎆
- You can restart or leave the room.

---

## ❓ 3. 文化问答示例（Sample Questions）

You might see questions like:

> **Q**: Why do people eat dumplings on Chinese New Year?  
> A) They look like ancient gold ingots ✅  
> B) They are spicy  
> C) They were invented in America  

> **Q**: What does the color red symbolize?  
> A) Danger  
> B) Happiness and luck ✅  
> C) Sadness  

💡 After answering, you'll learn a fun fact — even if you're wrong!

---

## 💬 4. 小贴士 & 常见问题（Tips & FAQ）

### ❓ 我需要会中文吗？  
**No!** The game is fully in English. But you'll learn Chinese culture along the way!

### ❓ 可以和手机朋友一起玩吗？  
Yes! Works on **phones, tablets, and computers**.

### ❓ 卡牌上的图标看不懂怎么办？  
Hover over a card (on desktop) or tap it (on mobile) to see its name and effect.

### ❓ 游戏卡住了？  
- Refresh the page — you'll stay in the room.
- If problems persist, ask the room host to restart.

### 🌍 想了解更多中国文化？  
Each card represents a real tradition:
- **Red Envelope** = 红包 (hóngbāo) — given to children for good luck
- **Dumpling** = 饺子 (jiǎozi) — eaten at midnight for wealth
- **Dragon Dance** = 舞龙 — performed to scare away evil spirits

---

## 🛠️ 5. 技术支持（For Hosts or Developers）

- **Hosting your own server?** See the [GitHub repo](link-to-your-repo) for setup instructions.
- **Want to add your own questions?** Edit `data/questions.json`.
- **Need custom cards?** Use Tongyi Wanxiang (通义万相) to generate PNG art!

---

## 🎉 祝你玩得开心！  
May your New Year be full of joy, luck, and dumplings!  
**Xin Nian Kuai Le! 🧧🐉🐼**

> Made with ❤️ to share Chinese culture through play.