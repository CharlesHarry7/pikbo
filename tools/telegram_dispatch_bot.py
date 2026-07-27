#!/usr/bin/env python3
"""
Pikbo 老板 Telegram 总控（最小版）

你在手机上发一句话 → 写入 docs/DISPATCH.md → 回复「开工口令」
三个 AI 用同一句口令 pull 后各干各的。

用法：
  export TELEGRAM_BOT_TOKEN=从BotFather拿到的token
  export TELEGRAM_CHAT_ID=你的聊天id（可选，不设则接受所有人——仅自用时请设置）
  export PIKBO_REPO=/Users/x/claude/pikbo
  python3 tools/telegram_dispatch_bot.py

获取 chat_id：先给机器人发任意消息，看终端打印的 chat id，再写入环境变量。
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
CHAT_ALLOW = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
REPO = Path(os.environ.get("PIKBO_REPO", Path(__file__).resolve().parents[1]))
DISPATCH = REPO / "docs" / "DISPATCH.md"
OFFSET_FILE = Path.home() / ".pikbo_telegram_offset"

API = f"https://api.telegram.org/bot{TOKEN}"

START_PROMPT = """紧急上线冲刺。仓库：https://github.com/CharlesHarry7/pikbo
git fetch && git checkout main && git pull --ff-only
必读 docs/DISPATCH.md（只做分给你的一节）+ docs/LAUNCH.md + STATUS
分支 agent/<你>/launch-* ，提交 [你]，做完立刻 push，勾 DISPATCH
不要 force-push main，不要提交密钥。速度优先。"""


def api(method: str, **params):
    url = f"{API}/{method}"
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=data)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def send(chat_id: int, text: str):
    # Telegram message limit ~4096
    for i in range(0, len(text), 3500):
        api("sendMessage", chat_id=chat_id, text=text[i : i + 3500])


def load_offset() -> int:
    try:
        return int(OFFSET_FILE.read_text().strip())
    except Exception:
        return 0


def save_offset(n: int) -> None:
    OFFSET_FILE.write_text(str(n))


def write_dispatch(boss_text: str) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    body = f"""# 老板指令板（只改这一份）

> 手机 Telegram / 老板一句话写入。Agent 只做自己区块。

**更新时间：** {now}

---

## 老板原话

```
{boss_text.strip()}
```

---

## 拆工（Agent 认领）

### 给 Grok（工程 / 部署 / 支付）
- [ ] 读懂老板原话里的工程项并执行
- [ ] 部署 / 域名 / 环境变量 / API / 修 bug
- [ ] 更新 STATUS + HANDOFF；需要时改本文件勾选

**分支：** `agent/grok/...`　**提交：** `[grok]`

### 给 Codex / GPT（首页 / 转化 / 样片）
- [ ] 读懂老板原话里的产品/视觉项并执行
- [ ] 首页、文案、样片、转化；勿大改 session/stripe

**分支：** `agent/gpt/...`　**提交：** `[gpt]`

### 给 Claude（SEO / 内容）
- [ ] 读懂老板原话里的内容/SEO 项并执行
- [ ] effects / for / toys 质量扩展；勿重写支付

**分支：** `agent/claude/...`　**提交：** `[claude]`

---

## 三个 Agent 同一句开工口令

```text
{START_PROMPT}
```
"""
    DISPATCH.parent.mkdir(parents=True, exist_ok=True)
    DISPATCH.write_text(body, encoding="utf-8")


def handle_text(chat_id: int, text: str) -> None:
    text = (text or "").strip()
    if not text:
        return

    if text in ("/start", "/help", "帮助"):
        send(
            chat_id,
            "Pikbo 老板总控\n\n"
            "直接发目标，例如：\n"
            "派活：本周 pikbo.ai 上线，首页要样片\n\n"
            "或：/status 查看当前 DISPATCH 摘要\n"
            "我会写入 GitHub 仓库的 docs/DISPATCH.md，并给你开工口令。",
        )
        return

    if text.startswith("/status"):
        if DISPATCH.exists():
            snippet = DISPATCH.read_text(encoding="utf-8")[:1500]
            send(chat_id, "当前 DISPATCH 摘要：\n\n" + snippet)
        else:
            send(chat_id, "还没有 DISPATCH.md")
        return

    # strip optional prefix
    for p in ("派活：", "派活:", "指令：", "指令:", "/dispatch "):
        if text.startswith(p):
            text = text[len(p) :].strip()
            break

    write_dispatch(text)
    send(
        chat_id,
        "✅ 已写入 docs/DISPATCH.md\n\n"
        "请把下面「同一句开工口令」发给 Grok / Codex / Claude（三个窗口各贴一次）：\n\n"
        f"{START_PROMPT}\n\n"
        "（可选）在电脑仓库目录执行 git add docs/DISPATCH.md && git commit && git push\n"
        f"路径：{DISPATCH}",
    )


def main() -> int:
    if not TOKEN:
        print("Set TELEGRAM_BOT_TOKEN first (from @BotFather)", file=sys.stderr)
        return 1
    if not REPO.is_dir():
        print(f"PIKBO_REPO not found: {REPO}", file=sys.stderr)
        return 1

    print(f"Pikbo dispatch bot running. repo={REPO}")
    print("Send any message to your bot. Chat ids will be printed.")
    offset = load_offset()

    while True:
        try:
            res = api(
                "getUpdates",
                offset=offset,
                timeout=30,
                allowed_updates=json.dumps(["message"]),
            )
        except Exception as e:
            print("poll error:", e)
            time.sleep(3)
            continue

        for upd in res.get("result", []):
            offset = max(offset, upd["update_id"] + 1)
            save_offset(offset)
            msg = upd.get("message") or {}
            chat = msg.get("chat") or {}
            chat_id = chat.get("id")
            text = msg.get("text") or ""
            print(f"chat_id={chat_id} text={text[:80]!r}")

            if CHAT_ALLOW and str(chat_id) != CHAT_ALLOW:
                print("ignore: chat not allowed")
                continue
            if chat_id is None:
                continue
            try:
                handle_text(int(chat_id), text)
            except Exception as e:
                print("handle error:", e)
                try:
                    send(int(chat_id), f"出错了：{e}")
                except Exception:
                    pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
