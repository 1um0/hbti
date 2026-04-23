# HBTI FastAPI Backend

FastAPI 后端，用于 HBTI 徒步人格测试的统计功能和用户认证。

## 功能

- 用户注册/登录 (JWT)
- 提交人格类型统计
- 全站统计查询

## 本地开发

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 配置环境变量
export OTS_ENDPOINT="https://hbti-prod.cn-hangzhou.ots.aliyuncs.com"
export OTS_INSTANCE="hbti-prod"
export OTS_TABLE="hbti_stats"
export DATABASE_URL="mysql+pymysql://user:password@localhost:3306/hbti"
export JWT_SECRET_KEY="your-secret-key"
export ALLOW_ORIGIN="*"

# 创建数据库表
python -c "from app.db.database import engine, Base; from app.models.user import User; Base.metadata.create_all(bind=engine)"

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API 接口

### 认证
- POST /api/auth/register - 注册用户
- POST /api/auth/login - 登录获取Token
- GET /api/auth/me - 获取当前用户信息

### 统计
- POST /submitResult - 提交人格类型
- GET /getStats - 获取全站统计

## 部署

使用 `s deploy` (需安装 serverless-devs) 或 Docker
