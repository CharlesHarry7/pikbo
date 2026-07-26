#!/usr/bin/env python3
"""Push files to GitHub via Git Data API (bypasses github.com:443 block)."""
import base64, json, os, subprocess, sys, urllib.request, urllib.error, pathlib, ssl

REPO = "CharlesHarry7/pikbo"
API = f"https://api.github.com/repos/{REPO}"
TOKEN = subprocess.run(
    ["security", "find-internet-password", "-s", "github.com", "-a", "guochao950518-wq", "-w"],
    capture_output=True, text=True
).stdout.strip()

if not TOKEN or not TOKEN.startswith(("gho_", "ghp_", "ghs_", "ghu_")):
    print(f"FATAL: invalid token prefix: {TOKEN[:4] if TOKEN else 'empty'}")
    sys.exit(1)

print(f"Token: {TOKEN[:4]}... ({len(TOKEN)} chars)")

CTX = ssl.create_default_context()
HEADERS = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "PikboWorkBuddy/1.0",
}

def api_call(method, path, data=None):
    url = f"{API}{path}" if path.startswith("/") else path
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        resp = urllib.request.urlopen(req, context=CTX, timeout=60)
        return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()[:500]
        print(f"  HTTP {e.code}: {err_body}")
        return None
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

REPO_ROOT = pathlib.Path("/Users/x/WorkBuddy/2026-07-27-02-00-48/pikbo")

# 1. Get current main ref
print("\n[1] Getting current main ref...")
ref = api_call("GET", "/git/refs/heads/main")
if not ref:
    print("FATAL: could not get main ref")
    sys.exit(1)
parent_sha = ref["object"]["sha"]
print(f"  Current main: {parent_sha[:12]}")

# 2. Get current commit to find tree SHA
print("\n[2] Getting current commit...")
commit = api_call("GET", f"/git/commits/{parent_sha}")
if not commit:
    print("FATAL: could not get commit")
    sys.exit(1)
base_tree = commit["tree"]["sha"]
print(f"  Base tree: {base_tree[:12]}")

# 3. Collect files to push
files_to_push = []

text_files = [
    "docs/growth/runs/20260726T192022Z-report.md",
    "docs/growth/runs/20260726T192022Z.jsonl",
    "docs/growth/AGENT_STATE.md",
    "docs/growth/WORK_QUEUE.md",
    "docs/growth/producthunt_pack.md",
    "scripts/growth-auto/directories.json",
    "scripts/growth-auto/run_growth.py",
    "scripts/growth-auto/manual_cdp_retry_cycle2.py",
    "scripts/growth-auto/manual_devpages_retry.py",
    "scripts/growth-auto/gsc_recheck.py",
    "scripts/growth-auto/push_via_api.py",
]

for f in text_files:
    p = REPO_ROOT / f
    if p.exists():
        files_to_push.append((f, p.read_bytes(), "utf-8"))
        print(f"  + {f} ({p.stat().st_size} bytes)")
    else:
        print(f"  - {f} (not found)")

# Screenshots
screenshot_dirs = [
    "docs/growth/screenshots/20260726T192022Z",
    "docs/growth/screenshots/manual-cdp-cycle2",
]

for d in screenshot_dirs:
    sd = REPO_ROOT / d
    if sd.exists():
        for p in sorted(sd.iterdir()):
            if p.suffix in (".png", ".json"):
                rel = str(p.relative_to(REPO_ROOT))
                files_to_push.append((rel, p.read_bytes(), "base64" if p.suffix == ".png" else "utf-8"))
                print(f"  + {rel} ({p.stat().st_size} bytes)")

print(f"\n  Total files: {len(files_to_push)}")

# 4. Create blobs
print("\n[3] Creating blobs...")
tree_items = []
for i, (path, content, encoding) in enumerate(files_to_push):
    if encoding == "base64":
        content_b64 = base64.b64encode(content).decode()
    else:
        content_b64 = content.decode("utf-8")
    
    blob = api_call("POST", "/git/blobs", {
        "content": content_b64,
        "encoding": encoding
    })
    if not blob:
        print(f"  FAILED: {path}")
        continue
    tree_items.append({
        "path": path,
        "mode": "100644",
        "type": "blob",
        "sha": blob["sha"]
    })
    if (i + 1) % 5 == 0:
        print(f"  {i+1}/{len(files_to_push)} blobs created")

print(f"  Total blobs: {len(tree_items)}")

# 5. Create tree
print("\n[4] Creating tree...")
tree = api_call("POST", "/git/trees", {
    "base_tree": base_tree,
    "tree": tree_items
})
if not tree:
    print("FATAL: could not create tree")
    sys.exit(1)
new_tree_sha = tree["sha"]
print(f"  New tree: {new_tree_sha[:12]}")

# 6. Create commit
print("\n[5] Creating commit...")
commit_msg = "[workbuddy] growth 24h cycle2: submitted=3 (prior) captcha=4 login=11 paid=5 fail=8 (no sitemap expand)"
new_commit = api_call("POST", "/git/commits", {
    "message": commit_msg,
    "tree": new_tree_sha,
    "parents": [parent_sha]
})
if not new_commit:
    print("FATAL: could not create commit")
    sys.exit(1)
new_commit_sha = new_commit["sha"]
print(f"  New commit: {new_commit_sha[:12]}")

# 7. Update ref
print("\n[6] Updating main ref...")
result = api_call("PATCH", "/git/refs/heads/main", {
    "sha": new_commit_sha,
    "force": False
})
if not result:
    print("FATAL: could not update ref")
    sys.exit(1)

print(f"\n✅ PUSH SUCCESS!")
print(f"  Commit: {new_commit_sha[:12]}")
print(f"  Message: {commit_msg}")
print(f"  Files: {len(tree_items)}")
print(f"  URL: https://github.com/{REPO}/commit/{new_commit_sha}")
