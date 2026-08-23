# LandCheck 前端

土地评估数据比对系统 Web 端。Vue 3 + Vite，对接后端 REST（Sa-Token）与部分 WebSocket 通知。默认开发端口 **5173**，通过 `/api` 反代到后端 **8082**。

配套后端仓库：[`land-backend`](https://github.com/HongxHH/land-backend)。

## 技术栈

| 项 | 说明 |
| --- | --- |
| Vue | 3.5 |
| 构建 | Vite 7 |
| UI | Element Plus |
| 路由 | Vue Router 4 |
| HTTP | Axios（Header `satoken`） |
| 实时 | STOMP / SockJS |
| 表格预览 | ExcelJS、`@vue-office/excel` |
| Node | `^20.19.0` 或 `>=22.12.0` |

## 页面与权限

登录后进入布局页，默认跳转首页。

| 路径 | 页面 | 权限 |
| --- | --- | --- |
| `/login` `/register` | 登录 / 注册 | 公开 |
| `/dashboard` | 首页 | 已登录 |
| `/projects` | 项目信息（详情、汇总、归档、合同地块等） | 已登录 |
| `/upload` | 项目 / 文件上传与校准 | 已登录 |
| `/fields` | 土地类型管理 | 已登录 |
| `/users` | 用户权限管理 | 需用户管理权限 |
| `/task-pool` | 任务线程池监控 | 开发人员 |

用户类型与后端一致：`SUPER_ADMIN`、`DEVELOPER`、`USER`。路由守卫会拉取 `/api/auth/me` 补齐会话。

文件列表状态展示与筛选以后端 `FileStateEnum` 为准，筛选项在 `src/utils/fileStatePresent.js`。

## 本地快速启动

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。未登录会跳到 `/login`。

开发代理（`vite.config.js`）：

- 浏览器请求 `/api/*` 会被去掉 `/api` 前缀转发到后端
- 默认目标：`http://127.0.0.1:8082`
- 可用 `.env.local` 设置 `VITE_API_PROXY_TARGET`（该文件已被 gitignore，不要把内网地址写进仓库）

Token 存在 `sessionStorage`（键 `landcheck_satoken`），请求头名为 `satoken`。

## 常用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发热更新 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Vitest |
| `npm run verify` | build + lint + test + exceljs 懒加载检查 |

## 功能开关

规划复核产品页默认关闭。生产构建见 `.env.production`：

```
VITE_FEATURE_PLANNING_REVIEW=false
```

本地若要打开，在 `.env.local` 写：

```
VITE_FEATURE_PLANNING_REVIEW=true
```

关闭时仍可使用归档夹、归档内上传 / 解析 / 审核；会隐藏规划复核产品 Tab、汇总对比组，以及新建项目智能导入对规划复核的自动归类。实现见 `src/config/featureFlags.js`。

## 目录约定

```
src/
  views/          页面
  components/     业务组件（按项目列表、上传、归档等分子目录）
  composables/    组合式逻辑
  router/         路由与权限
  utils/          鉴权、文件状态、请求封装
  styles/         全局样式
  config/         功能开关
```

路径别名 `@` 指向 `src/`。
