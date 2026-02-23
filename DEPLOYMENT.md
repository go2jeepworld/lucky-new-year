# Render 部署配置指南

## 数据库配置

本应用使用 SQLAlchemy 进行数据库持久化存储，支持 PostgreSQL 和 SQLite。

### 在 Render 上配置 PostgreSQL 数据库

1. **创建 PostgreSQL 数据库**
   - 登录 Render 控制台
   - 创建新的 PostgreSQL 数据库
   - 记下数据库连接信息

2. **配置环境变量**
   在 Render 的 Web Service 设置中添加以下环境变量：

   ```
   DATABASE_URL=postgresql://用户名:密码@主机:端口/数据库名
   ```

   例如：
   ```
   DATABASE_URL=postgresql://user:password@your-db-host.render.com:5432/yourdb
   ```

   Render 会自动提供 `DATABASE_URL` 环境变量，您也可以手动设置。

### 本地开发配置

在本地开发时，如果没有设置 `DATABASE_URL` 环境变量，应用会自动使用 SQLite 数据库（`login_history.db`）。

#### 使用 SQLite（默认）
```bash
# 直接运行，无需配置
python app.py
```

#### 使用 PostgreSQL（可选）
```bash
# 设置环境变量
export DATABASE_URL=postgresql://user:password@localhost:5432/yourdb

# 运行应用
python app.py
```

## 数据库结构

应用会自动创建 `login_records` 表，包含以下字段：

- `sid`: 会话 ID（主键）
- `ip`: 客户端 IP 地址
- `login_time`: 登录时间
- `logout_time`: 登出时间（可为空）
- `country`: 国家
- `region`: 地区
- `city`: 城市
- `player_name`: 玩家名称
- `room_code`: 房间代码

## 部署到 Render

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Add database support for Render deployment"
   git push
   ```

2. **在 Render 上创建 Web Service**
   - 连接 GitHub 仓库
   - 选择分支
   - 配置构建命令：`pip install -r requirements.txt`
   - 配置启动命令：`python app.py`
   - 确保 `DATABASE_URL` 环境变量已设置

3. **部署**
   - 点击 "Deploy" 按钮
   - 等待部署完成

## 故障排除

### 数据库连接失败
- 检查 `DATABASE_URL` 环境变量是否正确
- 确保 PostgreSQL 数据库正在运行
- 检查网络连接和防火墙设置

### 表创建失败
- 确保应用有创建表的权限
- 检查数据库用户权限

### 数据持久化问题
- 在 Render 上，确保使用 PostgreSQL 而不是 SQLite
- SQLite 数据库文件会在每次部署时重置
