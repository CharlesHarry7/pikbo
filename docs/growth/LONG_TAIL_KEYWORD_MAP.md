# 长尾关键词地图（2026-07-27）

**原则：** 搜索证据优先 · 避免意图重叠 · 诚实玩具垂直 · 禁止 franchise IP 名。
**主词 H1 冻结：** `/tools/ai-toy-video-generator` 的 H1 不改（哥飞）；T+D 已 CTR 优化过。

“低/极低竞争”曾根据 `intitle:` 结果推断，现已撤回；没有可靠搜索量与
SERP 难度时统一记为“未验证”。

| 候选查询 | 竞争/需求证据 | Canonical 路径 | 索引（冷启动） | 备注 |
|--------|------|----------------|----------------|------|
| **AI toy video generator** | 未验证 | `/tools/ai-toy-video-generator` | ✅ index | 核心观察页 |
| **AI action figure video generator** | 未验证 | `/for/action-figure-product-videos` | ✅ index | 关节手办 listing |
| **designer toy AI video** | 未验证 | 主词页语义覆盖 | teaser noindex | 暂不新增页 |
| **blind box AI video generator** | 未验证 | `/tools/blind-box-reveal-video-maker` | ✅ index | 盲盒 Recipe |
| **toy product video AI** | 未验证 | `/tools/ai-product-video-generator-for-toys` | ✅ index | 与 one-photo intent 需监测 |
| **one photo toy video AI** | 未验证 | `/tools/one-photo-product-video` | ✅ index | 与 product-video intent 需监测 |
| **AI figure 360 video** | 未验证 | `/tools/figure-360-product-video` | ✅ index | 360 Recipe |

## Sitemap 冷启动 allowlist（13）

见 `lib/seoIndex.ts` → `COLD_START_INDEX_PATHS`。

- 去掉：`/explore`（Lab 墙，非长尾战场）
- 新增：4 个 tools 长尾 + action-figure `/for`

## 外部 listing 记录

WorkBuddy 不再按关键词配额刷目录锚文本。目录或产品库若允许提交，使用真实
品牌名和准确产品描述；发布后记录公开 listing URL，再检查是否存在 crawlable
Pikbo 链接。

## 禁止

- 不为同一词再开第二套 `/for` 或 `/tools`
- 不在文案里堆 Marvel / POP MART 等 IP
- 不把产品改成纯 SEO 工具站（Generate 中心仍在）
- 不用 `intitle:0` 代替搜索量、难度或排名证据
