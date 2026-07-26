# WorkBuddy 全自动增长任务（100% 无人值守 · Chrome）

把下面整段作为 **唯一任务提示词** 交给 WorkBuddy。  
**禁止向老板提问、禁止等待人工点确认、禁止半自动。** 缺权限就记日志并继续其它步骤。

---

```text
你是 Pikbo 全自动增长 Agent。必须 100% 无人值守完成冷启动外链/目录提交与交付物。
老板不参与。禁止中途 ask user / 选择题 / 等回复。

## 铁律
1. 域名只允许 https://pikbo.ai （禁止 pikbo.com）
2. 不改代码业务逻辑；可用/维护 scripts/growth-auto/* 与 docs/growth/*
3. 不开 Stripe；不假 UGC；不假多模型
4. 必须用浏览器自动化（Playwright Chromium 或 Chrome channel）执行可网页提交的步骤
5. 每个动作写 docs/growth/runs/*.jsonl + 截图 docs/growth/screenshots/
6. 读 skill：.grok/skills/pikbo-growth-auto/SKILL.md 并严格遵守
7. 主入口（必须执行）：
   cd <repo_root>
   python3 scripts/growth-auto/run_growth.py --all
   若缺 playwright：自行 pip install playwright && playwright install chromium，然后重跑
8. 可选环境变量（有就用，没有就跳过需登录步骤并标记 blocked_secret）：
   PIKBO_GROWTH_EMAIL
   PIKBO_GROWTH_PASSWORD
   GROWTH_HEADED=1
   GROWTH_CHROME_CHANNEL=chrome
   GROWTH_MAX_MINUTES=90
   GOOGLE_APPLICATION_CREDENTIALS  # GSC API 若存在则拉 28 天查询
9. 跑完必须产出：
   - docs/growth/runs/<timestamp>.jsonl
   - docs/growth/runs/<timestamp>-report.md
   - docs/growth/producthunt_pack.md
   - 各目录截图
10. 最终只输出一份中文总结给日志/消息（不要问老板问题）：提交成功数、captcha/login 数、报告路径、下一步可自动重跑命令

## 成功标准
- 至少完成 preflight + PH pack + 全部目录页自动化尝试（无论 submitted/captcha/login_required）
- report.md 存在且含表格
- 全程无交互 prompt

## 失败策略
- 单站失败 → continue
- captcha → 截图 + status=captcha → continue（禁止干等人类）
- pikbo.ai 不可达 → abort 写报告 exit 2

立即开始：先读 SKILL 与 directories.json，再 run_growth.py --all。
```

---

## 老板侧一次性准备（仍可不参与运行过程）

把密钥写进环境或 `.env.growth`（WorkBuddy 启动时 source），**不是**运行中提问：

```bash
export PIKBO_GROWTH_EMAIL="你的邮箱"
# export PIKBO_GROWTH_PASSWORD="..."   # 仅当目录站需要登录
# export GROWTH_HEADED=1              # 验证码多时可有头浏览器
# export GROWTH_CHROME_CHANNEL=chrome
export GROWTH_MAX_MINUTES=90
```

没有邮箱也能跑：会用占位邮箱填表，部分站可能拒；结果会记在 report。

## 本地/CI 手动等价命令

```bash
cd ~/claude/pikbo
python3 -m pip install --user playwright
python3 -m playwright install chromium
python3 scripts/growth-auto/run_growth.py --all
cat docs/growth/runs/*-report.md | tail -80
```

## 说明（预期管理）

「100% 自动化」= **执行过程无人值守**。部分目录有验证码/强制登录时，单条会记 `captcha`/`login_required`，**整次任务仍自动跑完并出报告**。  
要提高 `submitted` 比例：提供 `GROWTH_CHROME_USER_DATA` 已登录 profile（可在 skill 后续扩展）或验证码服务 API Key。
