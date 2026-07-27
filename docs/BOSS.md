# 老板怎么指挥三个 AI（最省事版）

你不是程序员，你是**派活的人**。  
目标：**说一遍，三个人都干活**。

**先读作战令：** [`FIRST_PRINCIPLES.md`](./FIRST_PRINCIPLES.md)（马斯克五步：需求 → 删 → 简 → 快 → 自动）  
**AI 分工：** [`ROLES.md`](./ROLES.md) — Claude 写代码 · GPT 写 PRD · Grok 增长/协调  
**公网上线：** [`LAUNCH.md`](./LAUNCH.md)（现在最大阻塞是域名+Vercel，不是再堆功能）

---

## 方法一：只跟一个 AI 说（最推荐）

1. 只打开 **Grok**（或你最常用的一个）  
2. 用大白话说目标，例如：  
   > 域名 pikbo.ai 要上线，三个 agent 都要干活  
3. 让 TA **改 `docs/DISPATCH.md` 并 push 到 GitHub**  
4. 你把下面「同一句开工口令」**复制两次**，分别发给 Codex 和 Claude  

他们会自己 pull，读 DISPATCH，只做自己那块。

**你只说一次人话 + 复制同一段口令两次。**

---

## 方法二：Telegram 总控（手机派活）

完整步骤见：[`tools/README_TELEGRAM.md`](../tools/README_TELEGRAM.md)

1. @BotFather 建机器人，拿到 Token  
2. 本机运行 `python3 tools/telegram_dispatch_bot.py`  
3. 手机发：`派活：本周上线 pikbo.ai，首页要样片`  
4. 机器人写入 `docs/DISPATCH.md`，并回复**同一句开工口令**  
5. 口令贴到三个 AI 窗口（目前需各贴一次；自动开三个 agent 是下一阶段）

---

## 方法三：直接改 GitHub 网页（不用终端）

1. 打开  
   https://github.com/CharlesHarry7/pikbo/blob/main/docs/DISPATCH.md
2. 点铅笔编辑  
3. 在「老板原话」里写你的目标  
4. Commit  
5. 发开工口令给三个 AI  

---

## 你不要做的事

- 不要给三个人写三份不同的长 prompt  
- 不要让三个人同时「重做整个网站」  
- 不要在聊天里贴 API 密钥  

---

## 默认分工（死记即可）

| 谁 | 干什么 |
|---|---|
| **Grok** | 部署、域名、支付、API、修挂 |
| **Codex/GPT** | 首页、文案、样片、好看 |
| **Claude** | SEO、效果页、内容 |

---

## 同一句开工口令（收藏）

```text
仓库：https://github.com/CharlesHarry7/pikbo
git fetch && git checkout main && git pull --ff-only
必读 docs/DISPATCH.md（只做分给你的一节）+ STATUS + HANDOFF
分支 agent/<你>/<topic>，提交前缀 [你]，做完 push 并更新 DISPATCH/STATUS
```
