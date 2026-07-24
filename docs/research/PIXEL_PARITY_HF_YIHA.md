# 像素级对标清单 — Higgsfield + Yiha → Pikbo

**老板指令（2026-07-24）：** 像素级抄他们的网站功能与产品结构。  
**合法边界：** 抄 IA / 布局 / 密度 / 交互 / 工作流；**不抄** 片源、商标、文案原文、假 UGC、假多模型 live。  
**主产品：** AI **视频**生成（不是静图店）。

---

## 1. Higgsfield 首页物理结构（研究结论）

```text
[顶栏] Explore 系导航 · 积分 · Generate
[战役轮播] 多视频卡横滑（新功能 / Seedance / Contest…）
[产品入口条] Seedance Video · Image · Supercomputer · Cinema · …（大卡）
[Viral Presets 墙] ALL + 分类 chip · 超密竖卡网格 · hover 播
[Inside projects] 项目可点进拆解
[Seedance 4K 大战役] 全宽视频 banner
[底栏 mobile] Home · Community · Generate(中) · Library · Profile
```

**他们卖的是视频：** 墙全是动的；Generate 是中心动作。

## 2. Yiha 结构（研究结论）

```text
Create 工作台 = 模型/提示/参考 + 结果
顶栏 Video / Image / Edit 分轨
/lego 类垂直 mini-app 壳
Explore → remix 回 Create
```

## 3. Pikbo 像素对标动作（本轮起）

| # | 对标项 | HF/Yiha | Pikbo 动作 | 状态 |
|---|--------|---------|------------|------|
| P1 | 满屏视频墙为主 | Viral Presets 网格 | 首页主区 `HomeViralWall` 密网 | **live** |
| P2 | 产品入口条 | Seedance/Image/… 大卡 | `HfProductRail` 8 卡 | **live** |
| P3 | 底栏 5 键 | H·C·G·L·P | MOBILE_NAV 对齐 HF | **live** |
| P4 | 桌面主导航 | Explore/Video/Image/Cinema/Community | PRIMARY_NAV 对齐 | **live** |
| P5 | Generate 中心 | 模型条 + 结果台大 | Create 三栏压结果 + Seedance 条 | **live** |
| P6 | Inside project | 输入输出拆解 | `/projects` + home Remake/Inside | live |
| P7 | Flow 矩阵 | 创建入口货架 | 密网 4 列 + sticky header | **live** |
| P7b | Seedance 战役条 | 全宽视频 banner | `SeedanceCampaign` 挂首页 | **live** |
| P8 | Modules 像 lego | 固定工作流壳 | sticky + 4 列密网 + video job 文案 | **live** |
| P9 | Library/Assets | 底栏 Library | `/library` | soft local · cloud when Supabase |
| P10 | 多模型墙 | Kling/Veo live | **诚实 Soon，永不假 live** | skip fake |
| P11 | 真 UGC 社区 | Community remake | API + SQL + 双墙；无帖=Lab only | **in progress** |
| P12 | Cinema 全套 | Cinema Studio | Preview 壳 + HF immersion strip | **partial → denser** |

## 4. 明确不做（仍是像素对标里的红线）

- 不用他们 CDN 片源 / logo / 文案  
- 不写 fake “Kling live / Veo live”  
- 不编假用户帖  

## 5. 验收（老板体感）

打开 `/` 应像：**进站先被视频墙砸中**，不是先读长文案再找生成。  
Generate / Flow / Modules / Library 路径与 HF 同构。
