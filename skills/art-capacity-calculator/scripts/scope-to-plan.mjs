#!/usr/bin/env node
/**
 * 把 scope.json 交给美术产能计算器的核心引擎，输出排期摘要和逐任务 CSV。
 *
 * 用法:
 *   node scripts/scope-to-plan.mjs scope.json
 *   node scripts/scope-to-plan.mjs scope.json --out plan.csv
 *
 * 只执行计算核心，不启动浏览器、不渲染 UI。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
if (!argv[0] || argv[0] === '--help' || argv[0] === '-h') {
  console.log('用法: node scripts/scope-to-plan.mjs <scope.json> [--out plan.csv] [--json plan.json] [--html calculator.html]');
  process.exit(argv[0] ? 0 : 1);
}
function argValue(name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}
const scopePath = path.resolve(argv[0]);
const htmlPath = path.resolve(argValue('--html', path.join(__dirname, '..', 'assets', 'art-capacity-calculator.html')));
const outPath = path.resolve(argValue('--out', path.join(path.dirname(scopePath), 'plan.csv')));
const jsonPath = argValue('--json', null) ? path.resolve(argValue('--json')) : null;

if (!fs.existsSync(scopePath)) throw new Error('找不到 scope.json: ' + scopePath);
if (!fs.existsSync(htmlPath)) throw new Error('找不到计算器 HTML: ' + htmlPath);

const scope = JSON.parse(fs.readFileSync(scopePath, 'utf8'));
const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
if (!scriptMatch) throw new Error('计算器 HTML 里没有 <script>');

// 只执行计算核心，跳过浏览器初始化（不渲染、不跑风险模拟）
const marker = '/* ============ 初始化 ============ */';
const core = scriptMatch[1].split(marker)[0];
const ctx = vm.createContext({ console });
vm.runInContext(core, ctx, { filename: 'art-capacity-calculator-core.js' });

ctx.defaults();
const state = ctx.state;
const project = scope.project || {};
const warnings = [];
const assumptions = Array.isArray(scope.assumptions) ? scope.assumptions.slice() : [];

function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function mergeStd(target, incoming, stages, label) {
  if (!incoming) return;
  Object.keys(incoming).forEach((tier) => {
    if (!target[tier]) target[tier] = {};
    stages.forEach((st) => {
      if (incoming[tier] && incoming[tier][st] !== undefined) target[tier][st] = num(incoming[tier][st], target[tier][st]);
    });
  });
}

state.startDate = project.startDate || state.startDate;
state.targetWeeks = num(project.targetWeeks, state.targetWeeks);
state.bufferWeeks = num(project.bufferWeeks, state.bufferWeeks);
state.daysPerMonth = num(project.daysPerMonth, state.daysPerMonth);
state.eff = num(project.eff, state.eff);
state.holidays = Array.isArray(project.holidays) ? project.holidays : [];

if (Array.isArray(scope.roster) && scope.roster.length) {
  const known = new Set(ctx.ALL_GROUPS);
  state.roster = scope.roster.map((p) => {
    const group = p.group || '模型组';
    if (!known.has(group)) warnings.push('未知资源池，已保留但不参与计算: ' + group);
    return {
      name: p.name || group + '成员',
      group,
      level: p.level || 'mid',
      load: Math.max(0, Math.min(100, num(p.load, 100))),
      note: p.note || ''
    };
  });
}

const pipelines = scope.pipelines || {};

if (pipelines.character) {
  const c = pipelines.character;
  if (c.counts) {
    ctx.TIERS.forEach((tier) => {
      const x = c.counts[tier] || {};
      state.count[tier] = {
        '角色数': Math.max(0, Math.round(num(x.chars, state.count[tier]['角色数']))),
        '动作组': Math.max(0, num(x.actions, state.count[tier]['动作组'])),
        '特效个': Math.max(0, num(x.fx, state.count[tier]['特效个']))
      };
    });
  }
  mergeStd(state.std, c.std, ctx.STAGES, 'character');
  if (Array.isArray(c.extras)) {
    state.extras = c.extras.map((x) => ({
      name: x.name || '额外资产',
      stage: ctx.STAGES.includes(x.stage) ? x.stage : '动作',
      qty: Math.max(1, num(x.qty, 1)),
      md: Math.max(0, num(x.md, 0))
    }));
  }
}

if (pipelines.scene) {
  const s = pipelines.scene;
  ctx.ensureSceneData();
  state.scene.targetWeeks = num(s.targetWeeks, state.scene.targetWeeks);
  state.scene.kitMD = Math.max(0, num(s.kitMD, state.scene.kitMD));
  mergeStd(state.scene.std, s.std, ctx.SCENE_STAGES, 'scene');
  if (s.coef) state.scene.coef = Object.assign({}, state.scene.coef, s.coef);
  if (Array.isArray(s.scenes)) {
    state.sceneWBS = {
      scenes: s.scenes.map((x, i) => ({
        code: x.code || 'S' + String(i + 1).padStart(2, '0'),
        name: x.name || '场景 ' + (i + 1),
        tier: ctx.TIERS.includes(x.tier) ? x.tier : 'A',
        area: Math.max(0, num(x.area, 800)),
        batch: x.batch || 'P1',
        status: x.status || '未开始',
        owner: x.owner || '',
        reuse: Math.max(0, Math.min(80, num(x.reuse, 0)))
      }))
    };
    ctx.ensureWBS();
  }
}

if (pipelines.ui) {
  const u = pipelines.ui;
  ctx.ensureUIData();
  state.ui.targetWeeks = num(u.targetWeeks, state.ui.targetWeeks);
  state.ui.kitMD = Math.max(0, num(u.kitMD, state.ui.kitMD));
  mergeStd(state.ui.std, u.std, ctx.UI_STAGES, 'ui');
  if (u.coef) state.ui.coef = Object.assign({}, state.ui.coef, u.coef);
  if (Array.isArray(u.screens)) {
    state.ui.screens = u.screens.map((x, i) => ({
      code: x.code || 'U' + String(i + 1).padStart(2, '0'),
      name: x.name || '界面 ' + (i + 1),
      module: x.module || x.name || '界面',
      tier: ctx.TIERS.includes(x.tier) ? x.tier : 'A',
      batch: x.batch || 'P1',
      status: x.status || '未开始',
      owner: x.owner || '',
      reuse: Math.max(0, Math.min(80, num(x.reuse, 0)))
    }));
  }
}

// 计算
const character = pipelines.character ? ctx.compute() : null;
const scene = pipelines.scene ? ctx.computeScene() : null;
const ui = pipelines.ui ? ctx.computeUI() : null;

let charCritical = null;
if (character && Array.isArray(character.sched)) {
  let end = -1;
  character.sched.forEach((b) => {
    if (b.end > end) { end = b.end; charCritical = b.group; }
  });
}

function weekGap(r) {
  return Math.max(0, num(r.projectWeeks, 0) - num(r.target, 0));
}
function row(pipeline, code, stage, group, md, start, end, status) {
  return [pipeline, code, stage, group, Math.round(num(md, 0) * 10) / 10, start || '', end || '', status || ''];
}
function dateAt(idx) {
  return idx === null || idx === undefined || idx < 0 ? '' : ctx.fmtDate(ctx.dateOfIdx(idx));
}

const rows = [['管线', '范围/场景', '工序', '资源池', '工时(人天)', '开始', '结束', '状态']];
if (character) {
  (character.sched || []).forEach((b) => {
    rows.push(row('角色', '角色管线', b.label || b.key, b.group, b.md, b.startDate, b.endDate, ''));
  });
}
if (scene) {
  (scene.tasks || []).forEach((t) => {
    rows.push(row('场景', t.sceneCode, t.stage, t.group, t.effort, dateAt(t.start), dateAt(t.end), t.scene ? t.scene.status : ''));
  });
}
if (ui) {
  (ui.tasks || []).forEach((t) => {
    rows.push(row('UI', t.screenCode, t.stage, t.group, t.effort, dateAt(t.start), dateAt(t.end), t.screen ? t.screen.status : ''));
  });
}

function csvCell(v) {
  const s = String(v === null || v === undefined ? '' : v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const csv = '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
fs.writeFileSync(outPath, csv, 'utf8');

const summary = {
  project: project.name || '',
  startDate: state.startDate,
  character: character ? {
    totalChars: character.totalChars, totalMD: Math.round(character.totalMD),
    targetWeeks: character.target, projectWeeks: Number(character.projectWeeks.toFixed(1)),
    gapWeeks: Number(weekGap(character).toFixed(1)),
    critical: charCritical
  } : null,
  scene: scene ? {
    totalScenes: scene.totalScenes, totalMD: Math.round(scene.totalMD),
    targetWeeks: scene.target, projectWeeks: Number(scene.projectWeeks.toFixed(1)),
    gapMD: Math.round(scene.totalGap || 0),
    critical: scene.critical ? scene.critical.group : null
  } : null,
  ui: ui ? {
    totalScreens: ui.totalScreens, totalMD: Math.round(ui.totalMD),
    targetWeeks: ui.target, projectWeeks: Number(ui.projectWeeks.toFixed(1)),
    gapWeeks: Number(ui.gap.toFixed(1)),
    critical: ui.critical ? ui.critical.group : null
  } : null,
  assumptions,
  warnings,
  output: outPath
};

if (jsonPath) fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf8');

console.log('\n## 排期摘要\n');
console.log('| 管线 | 范围 | 总人天 | 目标 | 建议工期 | 缺口 | 卡点 |');
console.log('|---|---:|---:|---:|---:|---:|---|');
if (character) console.log(`| 角色 | ${character.totalChars} 个 | ${Math.round(character.totalMD)} | ${character.target} 周 | ${character.projectWeeks.toFixed(1)} 周 | ${weekGap(character).toFixed(1)} 周 | ${charCritical || '—'} |`);
if (scene) console.log(`| 场景 | ${scene.totalScenes} 个 | ${Math.round(scene.totalMD)} | ${scene.target} 周 | ${scene.projectWeeks.toFixed(1)} 周 | ${Math.round(scene.totalGap || 0)} 人天 | ${scene.critical ? scene.critical.group : '—'} |`);
if (ui) console.log(`| UI | ${ui.totalScreens} 个 | ${Math.round(ui.totalMD)} | ${ui.target} 周 | ${ui.projectWeeks.toFixed(1)} 周 | ${ui.gap.toFixed(1)} 周 | ${ui.critical ? ui.critical.group : '—'} |`);
if (assumptions.length) {
  console.log('\n### 假设');
  assumptions.forEach((x) => console.log('- ' + x));
}
if (warnings.length) {
  console.log('\n### 警告');
  warnings.forEach((x) => console.log('- ' + x));
}
console.log('\n任务明细: ' + outPath);
