#!/usr/bin/env python3
"""Safely publish an already-committed growth branch.

Historical versions of this helper created GitHub objects directly and updated
``main``. That bypassed normal review and read a GitHub credential from macOS
Keychain. This replacement never reads, accepts, or prints a token.

The default is a dry run. A real push requires ``--execute`` and is allowed only
from an ``agent/grok/*`` branch. Authentication is delegated to the user's
normal Git credential helper by ``git push``.
"""

from __future__ import annotations

import argparse
import pathlib
import subprocess
import sys

ALLOWED_PREFIX = "agent/grok/"
FORBIDDEN_BRANCHES = {"main", "master"}


def git(repo: pathlib.Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=repo,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(message or f"git {' '.join(args)} failed")
    return result.stdout.strip()


def validate_branch(branch: str) -> None:
    if branch in FORBIDDEN_BRANCHES or not branch.startswith(ALLOWED_PREFIX):
        raise ValueError(
            "refusing push: growth automation may publish only "
            f"{ALLOWED_PREFIX}* branches (got {branch!r})"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Preview or push the current agent/grok/* branch. "
            "Dry-run is the default."
        )
    )
    parser.add_argument(
        "--repo",
        type=pathlib.Path,
        default=pathlib.Path.cwd(),
        help="local Pikbo checkout (default: current directory)",
    )
    parser.add_argument(
        "--remote",
        default="origin",
        help="Git remote to use (default: origin)",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="perform the push after all safety checks",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo = args.repo.expanduser().resolve()

    try:
        branch = git(repo, "branch", "--show-current")
        validate_branch(branch)
        status = git(repo, "status", "--porcelain")
        head = git(repo, "rev-parse", "--short", "HEAD")
        remote = git(repo, "remote", "get-url", args.remote)
    except (RuntimeError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2

    if status:
        print(
            "ERROR: refusing push with uncommitted changes; commit and review "
            "the exact files first",
            file=sys.stderr,
        )
        return 2

    print("Growth branch publish plan")
    print(f"  repository: {repo}")
    print(f"  remote: {args.remote} ({remote})")
    print(f"  branch: {branch}")
    print(f"  commit: {head}")
    print(f"  command: git push --set-upstream {args.remote} HEAD:{branch}")

    if not args.execute:
        print("DRY RUN: no network write performed. Re-run with --execute.")
        return 0

    try:
        subprocess.run(
            [
                "git",
                "push",
                "--set-upstream",
                args.remote,
                f"HEAD:{branch}",
            ],
            cwd=repo,
            check=True,
        )
    except subprocess.CalledProcessError as error:
        print(f"ERROR: git push failed with exit {error.returncode}", file=sys.stderr)
        return error.returncode or 1

    print(f"Pushed reviewed branch {branch}; main was not updated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
