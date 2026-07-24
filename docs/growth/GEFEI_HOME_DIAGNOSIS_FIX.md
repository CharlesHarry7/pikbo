# 哥飞首页诊断落地（2026-07-25）

**来源：** 老板转发 pikbo.ai 问题诊断清单。  
**原则：** 落地页 = 承接页；主词打透；正文够厚；CWV；GSC/外链。

| # | 诊断 | 动作 | 状态 |
|---|------|------|------|
| P0-1 | 纯跳转落地页 | 首页 `#home-tool` 嵌入 `LandingToolPanel`（真生成） | ✅ |
| P0-2 | URL 无关键词 | 根域保留品牌；主词页 `/tools/ai-toy-video-generator` + `/for/photo-to-video-for-toys` 内链强化 | ✅ 策略 |
| P1-3 | 关键词分散 | 主词 **AI toy video generator**；Title/H1/description 对齐 | ✅ `lib/site.ts` |
| P1-4/5 | 词数 + 完整词组 | `HomeSeoBody` SSR 长文 + “photo into short video” | ✅ |
| P1-6 | DR=0 | 继续免费目录（已 5 站）+ GSC（已验证） | 🔄 养站 |
| P2-7 | img 无宽高 | video/img 声明 width/height | ✅ 部分 |
| P2-8 | H2 关键词 | HomeSeoBody H2 含 AI toy video / photo into short video | ✅ |
| P2-9 | preload | 首屏 hero eager → metadata；墙仍 lazy | ✅ |
| P2-10 | GSC/外链 | GSC 已完成；目录进行中 | ✅/🔄 |

**验收：** 无痕打开 https://pikbo.ai → 首屏可见 H1 + 上传生成块，无需先点 /create。
