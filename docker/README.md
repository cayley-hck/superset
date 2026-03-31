# Docker Compose 部署指南

本项目提供了完整的 Docker Compose 配置，支持本地开发和生产部署。

## 文件结构

```
.
├── docker/
│   ├── Dockerfile              # 多阶段构建 Dockerfile
│   ├── Caddyfile.docker        # Docker 专用 Caddy 配置
│   ├── .dockerignore           # Docker 构建排除文件
│   ├── .env.prod.example       # 生产环境变量示例
│   └── start-all.sh            # 启动脚本
├── docker-compose.yml          # 开发环境配置
├── docker-compose.prod.yml     # 生产环境配置
└── .dockerignore               # 项目根目录的 dockerignore
```

## 服务列表

| 服务 | 端口 | 说明 |
|------|------|------|
| `postgres` | 5432 | PostgreSQL 数据库（可选，本地部署用） |
| `electric` | 3009 | Electric SQL 同步引擎 |
| `caddy` | 3010 | HTTPS/HTTP2 反向代理 |
| `api` | 3001 | 后端 API (Next.js) |
| `web` | 3000 | 主 Web 应用 (Next.js) |
| `admin` | 3003 | 管理后台 (Next.js) |
| `marketing` | 3002 | 营销站点 (Next.js) |
| `docs` | 3004 | 文档站点 (Next.js) |

## 快速开始

### 1. 准备环境变量

```bash
# 复制示例文件
cp docker/.env.prod.example .env

# 编辑 .env 文件，填入你的配置
vim .env
```

### 2. 启动服务

```bash
# 构建并启动所有服务
docker compose -f docker-compose.prod.yml up -d --build

# 查看启动日志
docker compose -f docker-compose.prod.yml logs -f
```

### 3. 验证部署

```bash
# 检查 API 健康状态
curl http://localhost:3001/api/desktop/version

# 检查 Web 应用
curl http://localhost:3000

# 检查 Electric SQL
curl http://localhost:3009/v1/health
```

## 开发环境

### 启动所有服务

```bash
docker compose up -d
```

### 启动特定服务

```bash
# 只启动 API 和依赖服务
docker compose up -d api

# 只启动 Web 和依赖服务
docker compose up -d web
```

### 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f api
```

### 停止服务

```bash
docker compose down
```

### 重新安装依赖

如果修改了 package.json，需要重新运行 deps 服务：

```bash
docker compose up deps
docker compose restart api web admin marketing docs
```

### 特性

- **热重载**：源码挂载到容器，修改代码自动重载
- **共享依赖**：所有服务共享 `node_modules` volume，避免重复安装
- **环境变量**：通过 `.env` 文件统一管理
- **服务依赖**：自动按顺序启动（deps → electric → api → web/admin/...）

## 生产环境

### 本地 PostgreSQL 部署

如果你想使用本地 PostgreSQL 而不是 Neon：

1. 编辑 `docker-compose.prod.yml`，取消注释 `postgres` 服务
2. 修改 `.env` 中的数据库连接：

```bash
DATABASE_URL="postgresql://superset:superset_secret@postgres:5432/superset?sslmode=disable"
DATABASE_URL_UNPOOLED="postgresql://superset:superset_secret@postgres:5432/superset?sslmode=disable"
```

3. 启动服务：

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 使用外部数据库（Neon/其他）

1. 保持 `postgres` 服务注释状态
2. 配置 `.env` 中的数据库连接：

```bash
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:password@host/database?sslmode=require"
```

3. 启动服务：

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 构建镜像

```bash
# 构建所有服务
docker compose -f docker-compose.prod.yml build

# 构建特定服务
docker compose -f docker-compose.prod.yml build api

# 带版本标签
SUPERSET_VERSION=v1.0.0 docker compose -f docker-compose.prod.yml build
```

### 查看运行状态

```bash
docker compose -f docker-compose.prod.yml ps
```

### 停止服务

```bash
# 停止但保留数据
docker compose -f docker-compose.prod.yml down

# 停止并删除数据卷
docker compose -f docker-compose.prod.yml down -v
```

### 特性

- **多阶段构建**：最小化镜像体积
- **Standalone 输出**：Next.js standalone 模式，只包含必要文件
- **健康检查**：自动检测服务健康状态
- **自动重启**：服务异常时自动重启
- **非 root 用户**：使用 nextjs 用户运行，提高安全性

## 验证部署

### 检查 Electric SQL

```bash
curl http://localhost:3009/v1/health
# 预期输出: {"status":"active"}
```

### 检查 API

```bash
curl http://localhost:3001/api/desktop/version
# 预期输出: {"minimumVersion":"0.0.48","message":"..."}
```

### 检查 Web

```bash
curl http://localhost:3000
# 预期输出: HTML 页面
```

### 检查 Caddy 代理

```bash
curl -k https://localhost:3010/api/desktop/version
# 预期输出: JSON 响应（通过 Caddy 代理到 API）
```

## 故障排查

### 服务无法启动

1. 检查端口是否被占用：
   ```bash
   lsof -i :3000 -i :3001 -i :3009 -i :3010
   ```

2. 检查 `.env` 文件是否存在且配置正确

3. 查看服务日志：
   ```bash
   docker compose -f docker-compose.prod.yml logs <service-name>
   ```

### 依赖安装失败

```bash
# 清理 Docker 构建缓存
docker builder prune -a

# 重新构建
docker compose -f docker-compose.prod.yml build --no-cache
```

### 健康检查失败

```bash
# 手动测试健康检查端点
docker exec superset-apps-prod wget -q -O- http://localhost:3001/api/desktop/version

# 查看容器日志
docker logs superset-apps-prod
```

### 数据库连接问题

```bash
# 测试数据库连接
docker exec -it superset-apps-prod sh -c "wget -q -O- \$DATABASE_URL"

# 如果使用本地 PostgreSQL，检查是否运行
docker ps | grep postgres
```

## 性能优化

### 开发环境

- 使用 `node_modules` volume 缓存依赖，避免每次启动都安装
- 挂载源码支持热重载，无需重启容器

### 生产环境

- 多阶段构建减少镜像体积
- Next.js standalone 输出只包含运行时必需文件
- 使用 Alpine Linux 基础镜像（体积小）
- 健康检查确保服务稳定

## 端口映射

如果需要修改端口，可以在 `docker-compose.prod.yml` 中修改 `ports` 配置：

```yaml
services:
  api:
    ports:
      - "8080:3000"  # 将 web 应用映射到 8080
      - "8081:3001"  # 将 api 映射到 8081
```

同时需要更新 `.env` 中的 `NEXT_PUBLIC_*_URL` 变量。

## 生产部署建议

1. **使用 HTTPS**：配置 Caddy 或 Nginx 作为前端代理
2. **数据库备份**：定期备份 PostgreSQL 数据
3. **日志管理**：配置日志驱动收集容器日志
4. **资源限制**：添加 CPU 和内存限制
5. **监控告警**：配置健康检查和告警通知

### 添加资源限制示例

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```
