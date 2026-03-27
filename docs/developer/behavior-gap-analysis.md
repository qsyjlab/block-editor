# 开发者文档：行为差异盘点（Phase C）

更新时间：2026-03-27

本页承接 `/developer/behavior-matrix`，用于输出首轮 Gap Analysis 结论与修复 backlog。

## 1. 证据来源（首轮）

1. 行为矩阵：`/developer/behavior-matrix`（66 条）
2. 单测：`pnpm --filter @block-editor/editor test`（通过，3/3）
3. E2E：`pnpm --filter block-editor-playground test:e2e`（通过，18/19，H2.18 暂时 skip）
4. 代码走查：`SmartPaste / CommentPanel / Toolbar / block-handle / table bubble menu`

说明：本轮先完成 P0 全量盘点，P1/P2 继续在后续轮次细化。

## 2. P0 行为项结论（26 条）

状态说明：

- `通过`：已存在自动化或稳定手工证据。
- `部分通过`：主链路可用，但仍有一致性或边界差异。
- `未通过`：尚无可靠证据或存在明显风险。

| ID | 结论 | 风险 | 证据 | 修复方向 |
| --- | --- | --- | --- | --- |
| INP-001 | 通过 | Low | H2.12 + H2.14（含 composition 事件链路） | 保持 |
| INP-002 | 通过 | Low | H2.13（输入不中断压测） | 保持，后续补真 IME 强压场景 |
| INP-003 | 通过 | Low | 现有编辑器默认行为 + 场景实测 | 保持 |
| INP-004 | 通过 | Low | H2.8 | 保持 |
| SEL-001 | 通过 | Low | H2.16（Shift 扩选与鼠标拖选一致性） | 保持 |
| SEL-002 | 通过 | Low | H2.5 | 保持 |
| SEL-003 | 通过 | Low | H2.5（命令执行后状态稳定） | 保持 |
| PST-001 | 通过 | Low | SmartPaste 单测 | 保持 |
| PST-002 | 通过 | Low | SmartPaste 单测 | 保持 |
| PST-003 | 通过 | Low | SmartPaste 规则走查 | 补 HTML 恶意标签回归样例 |
| PST-004 | 部分通过 | Medium | 代码走查 + 手工（H2.18 在无头环境下暂时 skip） | 增补真实粘贴链路自动化（需稳定剪贴板权限） |
| UND-001 | 通过 | Low | H2.6 | 保持 |
| UND-002 | 通过 | Low | H2.10 | 保持 |
| BLK-001 | 通过 | Low | H2.4 | 保持 |
| BLK-002 | 通过 | Low | H2.11（上移/下移顺序可逆断言） | 保持 |
| BLK-003 | 通过 | Low | H2.9（含 deleteBlock 焦点修复） | 保持 |
| CMT-001 | 通过 | Low | H2.1 | 保持 |
| CMT-002 | 通过 | Low | H2.1 | 保持 |
| CMT-003 | 通过 | Low | H2.1 | 保持 |
| CMT-004 | 通过 | Low | H2.1（引用与定位） | 保持 |
| LNK-001 | 通过 | Low | H2.2 | 保持 |
| LNK-002 | 通过 | Low | H2.2 | 保持 |
| TBL-001 | 通过 | Low | H2.3 | 保持 |
| TBL-002 | 通过 | Low | H2.3 | 保持 |
| TOB-001 | 通过 | Low | H2.17（顶部与选区工具栏加粗命令一致） | 保持，后续扩展更多命令映射 |
| TOB-002 | 通过 | Low | H2.7 + H2.15（Ctrl/Cmd+B 与 Ctrl/Cmd+I） | 后续可继续扩展到链接/列表命令 |

## 3. 首轮评分（仅 P0）

1. `通过`：25 项
2. `部分通过`：1 项
3. `未通过`：0 项

按 `2/1/0` 计分，P0 子集得分：`51 / 52 = 98.1%`。

发布结论：基础门槛达标（P0 无 0 分项且分数 > 85%）。  
建议：可进入首轮验收报告阶段，同时继续补 P1/P2 自动化与性能边界。

## 4. 差异影响范围

1. 粘贴落点一致性：`smart paste + selection anchor`，影响编辑预期。
2. 无头环境剪贴板权限：影响粘贴链路自动化稳定性。
3. 工具栏命令一致性边界：可继续扩展更多命令族回归。
4. 复杂输入场景稳定性：需在真实 IME 环境持续回归。

## 5. 首批修复 Backlog（可执行）

### P0-Backlog（第一批，建议本周完成）

1. `P0-FIX-005`：补粘贴后光标落点自动化（PST-004，当前 H2.18 暂时 skip）
2. `P0-FIX-SEL`：扩展 `SEL-001` 跨块/反向选区边界自动化

已完成项：

1. `P0-FIX-001`：输入稳定性（H2.12/H2.13/H2.14）
2. `P0-FIX-002`：UNDO/REDO 基础与格式化链路（H2.6/H2.10）
3. `P0-FIX-003`：块删除焦点与块移动顺序（H2.9/H2.11）
4. `P0-FIX-004`：快捷键一致性扩展（H2.7/H2.15）
5. `P0-FIX-TOB`：顶部/选区工具栏命令一致性（H2.17）
6. `P0-FIX-SEL`：鼠标拖选与 Shift 扩选一致性（H2.16）

### P1-Backlog（第二批）

1. 评论回复/状态切换一致性（CMT-005/006）
2. 表格高级行为（TBL-003/004/006）
3. 跨块选区与菜单键盘导航（SEL-006、TOB-003）

## 6. 回归命令

1. `pnpm --filter @block-editor/editor test`
2. `pnpm --filter block-editor-playground test:e2e`
3. `pnpm --dir docs docs:build`
