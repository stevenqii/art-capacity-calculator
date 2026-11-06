# 美术产能与排期计算器

面向游戏美术项目管理的单文件工具：把「数量 / 工时 + 人员名单」拆成工序、算产能、按启动日期排出带日期的计划，并给出风险、缺口方案和资产台账。

- 纯前端单文件，无后端、无构建、无依赖
- 数据保存在浏览器 `localStorage`，可导出 CSV
- 支持角色、场景、UI 三条管线

## 在线访问

https://stevenqii.github.io/art-capacity-calculator/

## 功能

### 角色 · 任务拆解 / 计划排期 / 人力产能
- 原画 / 模型 / 绑定 / 动作 / 特效 / 整合六道工序
- 模型组、绑定组独立资源池
- 三点估算、Monte Carlo 工期风险
- 缺口三解：加人 / 外包 / 砍范围 / 延期
- 方案对比、资产台账

### 场景 · 任务拆解 / 计划排期 / 人力产能
- 概念 / 拆分 / 白模 / 模型 / 材质 / 地编 / 灯光 / 优化八道工序
- 场景原画 / 场景模型 / 场景编辑三个资源池
- 逐场景依赖排期：每个场景按工序顺序走，资源池排队，给出真实开始/结束日期
- 场景 WBS：面积系数、组件复用、模块库、批次、门禁
- 场景缺口三解、三点估算、方案对比、资产台账

### UI · 排期计划
- UX / 视觉 / 切图 / 动效 / 整合 / 适配 / 验收七道工序
- UI视觉 / UI动效 / UI整合三个资源池
- 按界面逐条排期，组件库单独按一次性投入
- UI 人员批量添加、名单导入、独立职级系数、团队产能

### 执行 · 基线质量
- 锁定基线，按工序填实际人天 / 完成% / 返工
- 工序自动按基线权重汇总到管线
- 挣值、CPI、预测工期、偏差、滞后管线
- 人员可用性：其他项目占用、请假周、冲突提示
- 21 个质量门禁：状态、轮次、反馈、返工人天、评审人
- 项目组合：当前项目 + 其他项目按资源池平衡，显示超配与缺口
- 资产台账：角色 / 场景 / UI 都可填累计实际人天与返工

### 供应商 · 管理
- 供应商台账：类型、状态、联系人、周产能、单价、交期、返工、准时、合同
- 供应商详情：等级、付款条件、币种、税率、NDA、分包、风险、分管线产能
- 准入审批：资料审核 → 样品测试 → 商务审核 → 已准入，带检查项和审批记录
- 供应商订单：项目 / 管线 / 范围 / 人天 / 单价 / 金额 / 验收
- 订单 SOW：PO、负责人、交付物、里程碑、发票/付款、首检、驳回原因、变更
- 订单拆分到场景 / 界面 / 角色资产，校验拆分合计
- 评分：质量 / 准时 / 返工 / 价格 / 配合；产能负荷与 12 周热力图
- 风险提醒：合同到期、超负荷、逾期、首检驳回、高风险

## 作为 DSH Skill 使用

仓库里的 `skills/art-capacity-calculator/` 是 DeepSeek Harness 的 skill 版本：

```text
skills/art-capacity-calculator/
├── SKILL.md
├── assets/art-capacity-calculator.html
├── examples/
│   ├── plan-example.csv
│   ├── planning-doc-example.md
│   └── scope-example.json
├── scripts/
│   └── scope-to-plan.mjs
└── references/
    ├── methodology.md
    ├── audit-checklist.md
    ├── examples.md
    ├── scope-schema.md
    └── scope-template.md
```

安装后可以：

- 输入一份策划文档，先转成 `scope.json`（含假设）
- 确认范围后，运行 `scripts/scope-to-plan.mjs` 直接输出排期摘要和逐任务 CSV
- 也可以直接打开 `assets/art-capacity-calculator.html` 交互调整

### 策划文档 → 排期

```bash
node scripts/scope-to-plan.mjs scope.json --out plan.csv
```

输出：

- 终端摘要：各管线总人天、目标、建议工期、缺口、卡点
- `plan.csv`：角色资源块 + 场景逐任务 + UI 逐任务的开始/结束日期

字段说明见 `references/scope-schema.md`，输入模板见 `references/scope-template.md`。

安装到用户级 DSH skill 目录：

**Windows PowerShell**

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.dsh\skills" | Out-Null
Copy-Item ".\skills\art-capacity-calculator" "$env:USERPROFILE\.dsh\skills\" -Recurse -Force
```

**macOS / Linux**

```bash
mkdir -p ~/.dsh/skills
cp -R skills/art-capacity-calculator ~/.dsh/skills/
```

重开一个 DSH 会话后，skill 目录中会出现 `art-capacity-calculator`。它包含：

- 角色 / 场景 / UI 三条管线的 WBS 与排期方法
- 产能、缺口、三点估算、缺口三解公式
- 专业校验清单
- 可直接打开的交互版 HTML 工具

## 使用

1. 下载 `index.html`
2. 双击用 Chrome / Edge 打开
3. 在「角色 · 人力产能」「场景 · 人力产能」「UI · 排期计划」里维护人员
4. 在任务拆解页填数量/工时，计划排期页自动出日期
5. 需要给同事/开会时，点底部「导出表格（Excel 可打开）」

数据只存在当前浏览器；换电脑或清缓存前请先导出 CSV。

## 截图

### 角色 · 人力产能
![角色人力](screenshots/people.png)

### 场景 · 计划排期
![场景排期](screenshots/scene.png)

### UI · 排期计划
![UI 排期](screenshots/ui.png)

### 执行 · 基线质量
![执行跟踪](screenshots/exec.png)

### 项目组合
![项目组合](screenshots/portfolio.png)

### 供应商 · 管理
![供应商管理](screenshots/vendor.png)

### 供应商准入审批
![准入审批](screenshots/approval.png)

### 订单拆分
![订单拆分](screenshots/allocation.png)

### 场景独立职级系数
![场景系数](screenshots/coef.png)

## 部署到 GitHub Pages

仓库设置 → Pages → Build and deployment：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

保存后访问：

```text
https://<your-github-username>.github.io/art-capacity-calculator/
```

## 目录

```text
.
├── index.html
├── README.md
└── screenshots/
    ├── coef.png
    ├── exec.png
    ├── approval.png
    ├── allocation.png
    ├── people.png
    ├── portfolio.png
    ├── scene.png
    ├── ui.png
    └── vendor.png
```

## 说明

- 单文件版本便于内网/本地直接打开，不依赖服务器
- 浏览器建议 Chrome / Edge 最新版
- 所有计算在本地完成，不上传任何人员或项目数据
