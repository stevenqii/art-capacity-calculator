# 策划文档 → 范围 JSON

## 目标

把一份策划文档（Word / PDF / Markdown / Excel / 飞书导出）转成可计算的 `scope.json`，再交给 `scripts/scope-to-plan.mjs` 排期。

不要直接从文档跳到最终日期。必须经过：

```text
文档 → 范围 JSON（含假设）→ 人工确认 → 排期
```

## 顶层结构

```json
{
  "project": {
    "name": "项目名",
    "startDate": "2026-11-09",
    "targetWeeks": 18,
    "bufferWeeks": 1,
    "daysPerMonth": 21.75,
    "eff": 0.85,
    "holidays": [
      { "name": "国庆", "start": "2026-10-01", "end": "2026-10-07" }
    ]
  },
  "roster": [
    { "name": "原画组长", "group": "原画组", "level": "lead", "load": 100 },
    { "name": "场景编辑 1", "group": "地编组", "level": "mid", "load": 100 }
  ],
  "pipelines": {
    "character": {
      "counts": {
        "S": { "chars": 4, "actions": 12, "fx": 4 },
        "A": { "chars": 8, "actions": 5, "fx": 3 },
        "B": { "chars": 8, "actions": 3, "fx": 2 }
      },
      "std": {
        "S": { "原画": 16, "模型": 34, "绑定": 8, "动作": 2.5, "特效": 3.0, "整合": 5 }
      },
      "extras": [
        { "name": "Boss 额外动作", "stage": "动作", "qty": 1, "md": 12 }
      ]
    },
    "scene": {
      "targetWeeks": 18,
      "kitMD": 0,
      "scenes": [
        { "code": "S01", "name": "主城", "tier": "S", "area": 2000, "batch": "P1", "reuse": 0 }
      ]
    },
    "ui": {
      "targetWeeks": 14,
      "kitMD": 12,
      "screens": [
        { "code": "U01", "name": "登录", "module": "登录", "tier": "S", "batch": "P0", "reuse": 0 }
      ]
    }
  },
  "assumptions": [
    "文档未写场景面积，按 S 2000 / A 800 / B 300 估"
  ]
}
```

## 字段规则

### project

- `startDate`：项目启动日，格式 `YYYY-MM-DD`。
- `targetWeeks`：目标周期；没有就按品类默认，并写进 assumptions。
- `bufferWeeks`：缓冲周，默认 1。
- `eff`：有效效率，默认 0.85。
- `holidays`：节假日区间；周末默认自动扣。

### roster

- `group` 必须是工具支持的值：
  - 角色：原画组 / 模型组 / 绑定组 / 动作组 / 特效组 / 整合组
  - 场景：场景原画组 / 场景模型组 / 地编组
  - UI：UI视觉组 / UI动效组 / UI整合组
- `level`：lead / senior / mid / junior。
- `load`：0–100。
- 绑定组人员应从动作组兼岗；不要默认模型组。

### character

- `counts` 三档 S/A/B；每档 `chars`、`actions`、`fx`。
- `std` 可选；不填用工具默认。
- `extras` 可选，表示额外资产人天。
- 如果文档只给总角色数，按 S/A/B 拆分并写明假设。

### scene

- `scenes` 每个场景一条：
  - `tier` S/A/B
  - `area` 平方米
  - `batch` P0–P3
  - `reuse` 0–80（模型/材质复用率）
- 不填 `std` 用工具默认。
- `kitMD` 模块库一次性投入。

### ui

- `screens` 每个界面一条：
  - `tier` S/A/B
  - `batch` P0–P3
  - `reuse` 0–80
- `kitMD` 组件库一次性投入。

## 从文档抽取什么

优先抽取：

1. 游戏类型、核心玩法、目标平台。
2. 系统清单：登录、主界面、HUD、背包、角色、商店、任务、设置、活动、付费。
3. 角色数量、Boss/怪物数量、动作组数、特效数量。
4. 场景列表、场景类型（主城/野外/副本）、面积或规模描述。
5. UI 界面清单、复杂界面、商业化界面。
6. 上线节点、测试节点、版本节奏。
7. 复用要求：模块库、组件库、共用资产。
8. 约束：必须先做的系统、不可并行的工序。

## 置信度

每个推断字段标注来源：

- `doc`：文档明确写了。
- `inferred`：根据上下文推断。
- `default`：用默认值。
- `unknown`：需要 PM 确认。

把 `default` 和 `inferred` 放进 `assumptions`，不要静默填数。

## 生成排期

```bash
node scripts/scope-to-plan.mjs scope.json --out plan.csv
```

输出：

- `plan.csv`：逐任务明细（角色资源块 + 场景任务 + UI 任务）
- 终端摘要：各管线总人天、目标、建议工期、缺口、卡点

如果范围 JSON 缺字段，脚本会用工具默认值并在摘要里提示。
