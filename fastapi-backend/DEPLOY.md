# HBTI 后端部署指南（现行方案）

> 本文档仅使用一条生产链路：**阿里云 ECS + Docker + FastAPI + Nginx + 自建 MySQL + Tablestore**。  
> 前端保持在 `hbti.top`（GitHub Pages），后端统一走 `api.hbti.top`。

---

## 0. 最终架构（先看这个）

```text
用户浏览器
  ├─ https://hbti.top  (前端, GitHub Pages)
  └─ https://api.hbti.top
        └─ Nginx (ECS)
             └─ FastAPI 容器 (127.0.0.1:8000)
                  ├─ MySQL: ECS 本机 Docker MySQL
                  └─ 统计: 阿里云 Tablestore
```

---

## 1. 旧部署内容需要取消什么

如果你现在采用本方案，请把以下内容从生产链路中移除：

1. 不再使用 `https://*.fcapp.run` 作为前端接口地址。  
2. 不再把 `api.hbti.top` 绑定到 FC（避免与 ECS 冲突）。  
3. `fc/`、`fc.yaml` 不再作为线上部署入口。  
4. 旧 FC 函数（`submitResult` / `getStats`）至少先禁用触发器，再考虑删除。  

---

## 2. 准备清单

你需要准备：

1. 阿里云 ECS（Ubuntu 22.04）  
2. ECS 自建 MySQL（Docker）  
3. 阿里云 Tablestore（实例：`hbti-prod`，表：`hbti_stats`）  
4. 域名 DNS：`api.hbti.top` A 记录指向 ECS 公网 IP  
5. GitHub 仓库代码：`https://github.com/1um0/hbti.git`

---

## 3. 服务器首次部署（ECS）

## 3.1 登录 ECS

```bash
ssh root@你的ECS公网IP
```

## 3.2 安装基础软件

```bash
apt update && apt install -y git docker.io docker-compose nginx certbot python3-certbot-nginx
systemctl enable docker
systemctl start docker
```

## 3.3 拉取代码

```bash
cd /opt
git clone https://github.com/1um0/hbti.git
cd /opt/hbti/fastapi-backend
```

## 3.4 创建生产 `.env`

在 `/opt/hbti/fastapi-backend/.env` 写入（按真实信息替换）：

```env
# Tablestore
OTS_ENDPOINT=https://hbti-prod.cn-hangzhou.ots.aliyuncs.com
OTS_INSTANCE=hbti-prod
OTS_TABLE=hbti_stats
OTS_ACCESS_KEY_ID=你的AccessKeyId
OTS_ACCESS_KEY_SECRET=你的AccessKeySecret

# MySQL (ECS 自建，host 使用 docker 服务名 mysql)
DATABASE_URL=mysql+pymysql://hbti_user:请替换强密码@mysql:3306/hbti?charset=utf8mb4

# JWT
JWT_SECRET_KEY=请替换为随机长字符串

# CORS（生产建议固定为前端域名）
ALLOW_ORIGIN=https://hbti.top
```

## 3.5 创建/确认 docker-compose.yml

`/opt/hbti/fastapi-backend/docker-compose.yml`：

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    container_name: hbti-mysql
    environment:
      MYSQL_DATABASE: hbti
      MYSQL_USER: hbti_user
      MYSQL_PASSWORD: 请替换强密码
      MYSQL_ROOT_PASSWORD: 请替换root强密码
    command:
      - --default-authentication-plugin=mysql_native_password
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
    volumes:
      - mysql_data:/var/lib/mysql
    restart: always

  hbti-api:
    build: .
    container_name: hbti-api
    ports:
      - "127.0.0.1:8000:8000"
    env_file:
      - .env
    depends_on:
      - mysql
    restart: always

volumes:
  mysql_data:
```

## 3.6 启动后端（含 MySQL）

```bash
cd /opt/hbti/fastapi-backend
docker-compose up -d --build
docker-compose logs --tail=100
```

---

## 4. Nginx 反向代理 + HTTPS

## 4.1 写 Nginx 配置

创建 `/etc/nginx/sites-available/api.hbti.top`：

```nginx
server {
    listen 80;
    server_name api.hbti.top;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 4.2 启用并重载

```bash
ln -sf /etc/nginx/sites-available/api.hbti.top /etc/nginx/sites-enabled/api.hbti.top
nginx -t
systemctl reload nginx
```

## 4.3 申请 SSL

```bash
certbot --nginx -d api.hbti.top
```

---

## 5. 修改前端接口地址（必须）

编辑仓库根目录 `app.js`，把接口改成 ECS 域名：

```javascript
apiEndpoints: {
  submitResult: 'https://api.hbti.top/submitResult',
  getStats: 'https://api.hbti.top/getStats'
}
```

提交并推送后，GitHub Pages 会更新前端。

---

## 6. 初始化数据库（首次）

`docker-compose` 中已经通过 `MYSQL_DATABASE=hbti` 自动创建数据库。  
首次只需要执行一次应用建表（用户表）：

```bash
cd /opt/hbti/fastapi-backend
docker-compose exec hbti-api python -c "from app.db.database import engine, Base; from app.models.user import User; Base.metadata.create_all(bind=engine)"
```

---

## 7. 上线验收（最小闭环）

1. 健康检查：`https://api.hbti.top/`  
2. 文档页（可选）：如果你把 `ALLOW_ORIGIN=*` 才能访问 `https://api.hbti.top/docs`  
3. 前端完成一次测试后，结果页能拉到统计数据  
4. 浏览器控制台无 CORS 报错

---

## 8. 日常发布流程（后续每次更新）

在 ECS 执行：

```bash
cd /opt/hbti
git pull
cd fastapi-backend
docker-compose up -d --build
docker-compose logs --tail=100
```

如果你只更新后端代码，不想重建 MySQL，可用：

```bash
docker-compose up -d --build hbti-api
```

---

## 9. 常见问题

## 9.1 接口 502/504

先看容器日志：

```bash
cd /opt/hbti/fastapi-backend
docker-compose logs --tail=200
```

## 9.2 CORS 报错

检查 `.env` 中 `ALLOW_ORIGIN` 是否为 `https://hbti.top`，改完后重启容器：

```bash
docker-compose up -d --build
```

## 9.3 数据库连接失败

检查：

1. `DATABASE_URL` 用户名/密码/地址是否正确  
2. `docker-compose ps` 里 `hbti-mysql` 是否为 `Up`  
3. `DATABASE_URL` host 是否写成 `mysql`（不是 localhost）

## 9.4 MySQL 数据备份（建议每天）

在 ECS 执行（会在当前目录生成备份文件）：

```bash
cd /opt/hbti/fastapi-backend
docker exec hbti-mysql mysqldump -u root -p'请替换root强密码' hbti > hbti_backup_$(date +%F).sql
```

恢复示例：

```bash
cat hbti_backup_2026-04-23.sql | docker exec -i hbti-mysql mysql -u root -p'请替换root强密码' hbti
```

## 9.5 Tablestore 写入失败

检查：

1. `OTS_ACCESS_KEY_ID` / `OTS_ACCESS_KEY_SECRET` 是否正确  
2. `OTS_INSTANCE`、`OTS_TABLE` 是否与控制台一致  
3. 账号权限是否包含对应实例读写权限

---

## 10. 安全清单

- [ ] `.env` 不提交到 GitHub  
- [ ] `JWT_SECRET_KEY` 为随机高强度字符串  
- [ ] 生产 CORS 仅允许 `https://hbti.top`  
- [ ] ECS 仅开放 80/443（22 按需且限制来源 IP）  
- [ ] MySQL 不开放公网 3306（仅容器内网访问）  
- [ ] `https://api.hbti.top` 证书有效  

---

## 11. 一句话原则

**前端在 GitHub Pages，后端在 ECS，FC 停用。只保留一条生产链路。**
