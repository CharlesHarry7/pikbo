#!/usr/bin/env python3
"""Safety tests for the growth branch publisher."""

import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).with_name("push_via_api.py")
SPEC = importlib.util.spec_from_file_location("growth_push", SCRIPT)
assert SPEC and SPEC.loader
growth_push = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(growth_push)


class BranchBoundaryTest(unittest.TestCase):
    def test_accepts_grok_agent_branch(self) -> None:
        growth_push.validate_branch("agent/grok/growth-truth")

    def test_rejects_main(self) -> None:
        with self.assertRaises(ValueError):
            growth_push.validate_branch("main")

    def test_rejects_other_agent_branch(self) -> None:
        with self.assertRaises(ValueError):
            growth_push.validate_branch("agent/workbuddy/direct-main")

    def test_rejects_similar_prefix(self) -> None:
        with self.assertRaises(ValueError):
            growth_push.validate_branch("agent/grokish/growth-truth")


if __name__ == "__main__":
    unittest.main()
