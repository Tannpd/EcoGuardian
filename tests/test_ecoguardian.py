# =============================================================================
#  test_ecoguardian.py - EcoGuardian Contract Integration Test Suite
# =============================================================================

import sys
import os
import json
import unittest
import py_compile
from unittest.mock import MagicMock

# --- Mocking structure to simulate the GenLayer SDK runtime ------------------
class MockContractBase:
    pass

class MockMessage:
    def __init__(self, sender="0x1111111111111111111111111111111111111111", value=0):
        self.sender_address = sender
        self.value = value

class MockWeb:
    def __init__(self):
        self.url_to_content = {}
        self.fail_on_next = False
    def render(self, url):
        if self.fail_on_next:
            raise Exception("Simulated scrape failure")
        if "404" in url:
            raise Exception("404 Link Blocked")
        if "empty" in url:
            return ""
        if "short" in url:
            return "short"
        return self.url_to_content.get(url, "Wildlife conservation report: population metrics show a clear recovery trend with species increase and reduced poaching threat.")

class MockNondet:
    def __init__(self):
        self.web = MockWeb()
        self.exec_prompt_responses = []
        self.response_index = 0
        self.fail_on_next = False
        
    def exec_prompt(self, prompt):
        if self.fail_on_next:
            raise Exception("Simulated LLM failure")
        if self.response_index < len(self.exec_prompt_responses):
            res = self.exec_prompt_responses[self.response_index]
            self.response_index += 1
            return res
        return json.dumps({
            "is_recovering": True,
            "confidence_score": 90,
            "ecological_analysis": "Target species shows significant recovery trend."
        })

class MockVM:
    def __init__(self, mock_nondet):
        self.mock_nondet = mock_nondet
        self.fail_validator_render = False
        self.fail_validator_llm = False
    def run_nondet_unsafe(self, leader_fn, validator_fn):
        leader_res = leader_fn()
        if self.fail_validator_render:
            self.mock_nondet.web.fail_on_next = True
        if self.fail_validator_llm:
            self.mock_nondet.fail_on_next = True
        consensus = validator_fn(leader_res)
        
        # Reset flags
        self.mock_nondet.web.fail_on_next = False
        self.mock_nondet.fail_on_next = False
        
        if consensus:
            return leader_res
        raise RuntimeError("Consensus not reached")

class MockGl:
    def __init__(self):
        self.message = MockMessage()
        self.nondet = MockNondet()
        self.vm = MockVM(self.nondet)
        self.Contract = MockContractBase
        self.public = self._create_public_decorator()
        self.mock_transfers = {}

    def _create_public_decorator(self):
        class MockDecorator:
            def __call__(self, func):
                return func
            def __getattr__(self, name):
                return self
        class MockPublic:
            def __init__(self):
                self.view = MockDecorator()
                self.write = MockDecorator()
        return MockPublic()

    def get_contract_at(self, addr):
        mock_other = MagicMock()
        def emit_transfer_mock(value):
            self.mock_transfers[str(addr)] = value
        mock_other.emit_transfer = emit_transfer_mock
        return mock_other

class MockTreeMap(dict):
    def get(self, key, default=None):
        return super().get(key, default)

# Instantiate global mock using MagicMock for standard exports
mock_genlayer = MagicMock()
mock_genlayer.TreeMap = MockTreeMap
mock_genlayer.Address = str
mock_genlayer.bigint = int
mock_genlayer.UserError = Exception
mock_genlayer.gl = MockGl()

# Inject mock genlayer sdk into sys.modules
sys.modules['genlayer'] = mock_genlayer

# Now import the contract
from contracts.ecoguardian import Contract, Address, UserError, TreeMap, bigint

class TestEcoGuardian(unittest.TestCase):
    def setUp(self):
        # Initialize contract
        self.contract = Contract()
        self.contract.grants_count = 0
        
        # Manually initialize TreeMap storage properties as MockTreeMap
        for field, f_type in self.contract.__class__.__annotations__.items():
            if 'TreeMap' in str(f_type):
                setattr(self.contract, field, MockTreeMap())
                
        # Reset Mock SDK state
        mock_genlayer.gl.message = MockMessage()
        mock_genlayer.gl.nondet = MockNondet()
        mock_genlayer.gl.vm = MockVM(mock_genlayer.gl.nondet)
        mock_genlayer.gl.mock_transfers = {}
        
        # Shortcut aliases for test case compatibility
        mock_genlayer.message = mock_genlayer.gl.message
        mock_genlayer.nondet = mock_genlayer.gl.nondet
        mock_genlayer.vm = mock_genlayer.gl.vm
        mock_genlayer.mock_transfers = mock_genlayer.gl.mock_transfers

    def test_reproducible_compilation(self):
        # Verify the contract compiles cleanly in python
        contract_path = os.path.join("contracts", "ecoguardian.py")
        self.assertTrue(py_compile.compile(contract_path))

    def test_create_grant_invalid_value(self):
        mock_genlayer.message.sender_address = "0xCreator"
        mock_genlayer.message.value = bigint(0)
        with self.assertRaises(UserError) as context:
            self.contract.create_grant("0xNGO", "Save tigers")
        self.assertIn("must lock a positive GEN amount", str(context.exception))

    def test_create_grant_empty_goal(self):
        mock_genlayer.message.sender_address = "0xCreator"
        mock_genlayer.message.value = bigint(100 * 10**18)
        with self.assertRaises(UserError) as context:
            self.contract.create_grant("0xNGO", "   ")
        self.assertIn("Conservation goal description cannot be empty", str(context.exception))

    def test_create_grant_success(self):
        mock_genlayer.message.sender_address = "0xCreator"
        mock_genlayer.message.value = bigint(50 * 10**18)
        gid = self.contract.create_grant("0xNGO", "Protect rhinos")
        
        self.assertEqual(gid, 0)
        self.assertEqual(int(self.contract.grants_count), 1)
        self.assertEqual(self.contract.grant_creator.get(str(gid)), "0xCreator")
        self.assertEqual(self.contract.grant_ngo.get(str(gid)), "0xNGO")
        self.assertEqual(self.contract.grant_amount.get(str(gid)), bigint(50 * 10**18))
        self.assertEqual(self.contract.grant_status.get(str(gid)), "ACTIVE")

    def test_audit_milestone_invalid_id(self):
        with self.assertRaises(UserError) as context:
            self.contract.audit_milestone(99, "https://url.com")
        self.assertIn("Grant does not exist", str(context.exception))

    def test_audit_milestone_inactive_status(self):
        mock_genlayer.message.sender_address = "0xCreator"
        mock_genlayer.message.value = bigint(10 * 10**18)
        gid = self.contract.create_grant("0xNGO", "Protect rhinos")
        self.contract.grant_status[str(gid)] = "RELEASED"
        
        with self.assertRaises(UserError) as context:
            self.contract.audit_milestone(gid, "https://url.com")
        self.assertIn("not in active or failed state", str(context.exception))

    def test_audit_milestone_empty_url(self):
        mock_genlayer.message.sender_address = "0xCreator"
        mock_genlayer.message.value = bigint(10 * 10**18)
        gid = self.contract.create_grant("0xNGO", "Protect rhinos")
        
        with self.assertRaises(UserError) as context:
            self.contract.audit_milestone(gid, "  ")
        self.assertIn("URL cannot be empty", str(context.exception))

    def test_audit_milestone_invalid_url_scheme(self):
        mock_genlayer.message.sender_address = "0xCreator"
        mock_genlayer.message.value = bigint(10 * 10**18)
        gid = self.contract.create_grant("0xNGO", "Protect rhinos")
        
        with self.assertRaises(UserError) as context:
            self.contract.audit_milestone(gid, "ftp://invalid-url.com")
        self.assertIn("Must start with http:// or https://", str(context.exception))

    def test_audit_milestone_success_recovering(self):
        # 1. Create grant
        mock_genlayer.message.sender_address = "0xCreator"
        mock_genlayer.message.value = bigint(100 * 10**18)
        gid = self.contract.create_grant("0xNGO", "Protect rhinos")
        
        # 2. Mock AI consensus showing successful recovery
        leader_out = json.dumps({
            "is_recovering": True,
            "confidence_score": 90,
            "ecological_analysis": "Rhino population increased by 15% this year."
        })
        validator_out = json.dumps({
            "is_recovering": True,
            "confidence_score": 90,
            "ecological_analysis": "Verified population metrics show positive recovery."
        })
        mock_genlayer.nondet.exec_prompt_responses = [leader_out, validator_out]
        
        # 3. Audit milestone
        self.contract.audit_milestone(gid, "https://reports.com/rhino-success")
        
        # 4. Assertions
        self.assertEqual(self.contract.grant_status.get(str(gid)), "RELEASED")
        self.assertEqual(self.contract.grant_is_recovering.get(str(gid)), True)
        self.assertEqual(int(self.contract.grant_confidence_score.get(str(gid))), 90)
        
        # Verify payout (100 * 10**18) was transferred to NGO
        self.assertEqual(self.contract.grant_amount.get(str(gid)), bigint(0))
        self.assertEqual(mock_genlayer.mock_transfers["0xNGO"], bigint(100 * 10**18))

    def test_audit_milestone_fail_not_recovering(self):
        # 1. Create grant
        mock_genlayer.message.sender_address = "0xCreator"
        mock_genlayer.message.value = bigint(50 * 10**18)
        gid = self.contract.create_grant("0xNGO", "Protect rhinos")
        
        # 2. Mock AI consensus showing no recovery
        leader_out = json.dumps({
            "is_recovering": False,
            "confidence_score": 50,
            "ecological_analysis": "Rhino population remains static. Poaching threat unchanged."
        })
        validator_out = json.dumps({
            "is_recovering": False,
            "confidence_score": 50,
            "ecological_analysis": "Rhino population static. Goals not yet met."
        })
        mock_genlayer.nondet.exec_prompt_responses = [leader_out, validator_out]
        
        # 3. Audit milestone
        self.contract.audit_milestone(gid, "https://reports.com/rhino-static")
        
        # 4. Assertions (Should remain ACTIVE, funds locked)
        self.assertEqual(self.contract.grant_status.get(str(gid)), "ACTIVE")
        self.assertEqual(self.contract.grant_is_recovering.get(str(gid)), False)
        self.assertEqual(int(self.contract.grant_confidence_score.get(str(gid))), 50)
        self.assertEqual(self.contract.grant_amount.get(str(gid)), bigint(50 * 10**18))
        self.assertNotIn("0xNGO", mock_genlayer.mock_transfers)

    def test_audit_milestone_consensus_failure_decision_mismatch(self):
        # 1. Create grant
        mock_genlayer.message.sender_address = "0xCreator"
        mock_genlayer.message.value = bigint(50 * 10**18)
        gid = self.contract.create_grant("0xNGO", "Protect rhinos")
        
        # 2. Mock discrepancy: Leader says recovering, Validator says not recovering
        leader_out = json.dumps({
            "is_recovering": True,
            "confidence_score": 90,
            "ecological_analysis": "Rhinos recovering."
        })
        validator_out = json.dumps({
            "is_recovering": False,
            "confidence_score": 10,
            "ecological_analysis": "Rhinos not recovering."
        })
        mock_genlayer.nondet.exec_prompt_responses = [leader_out, validator_out]
        
        # 3. Audit milestone should raise consensus failure
        with self.assertRaises(RuntimeError) as context:
            self.contract.audit_milestone(gid, "https://reports.com/rhinos")
        self.assertIn("Consensus not reached", str(context.exception))

    def test_audit_milestone_validator_rerun_failure_rejects_consensus(self):
        # 1. Create grant
        mock_genlayer.message.sender_address = "0xCreator"
        mock_genlayer.message.value = bigint(50 * 10**18)
        gid = self.contract.create_grant("0xNGO", "Protect rhinos")
        
        # 2. Mock leader to succeed
        leader_out = json.dumps({
            "is_recovering": True,
            "confidence_score": 90,
            "ecological_analysis": "Rhinos recovering."
        })
        mock_genlayer.nondet.exec_prompt_responses = [leader_out]
        
        # 3. Enable validator-only LLM execution failure
        mock_genlayer.vm.fail_validator_llm = True
        
        # 4. Audit milestone should raise consensus failure instead of approving (VERIFIED STAFF FIX)
        with self.assertRaises(RuntimeError) as context:
            self.contract.audit_milestone(gid, "https://reports.com/rhinos")
        self.assertIn("Consensus not reached", str(context.exception))

    def test_audit_milestone_validator_scrape_failure_rejects_consensus(self):
        # 1. Create grant
        mock_genlayer.message.sender_address = "0xCreator"
        mock_genlayer.message.value = bigint(50 * 10**18)
        gid = self.contract.create_grant("0xNGO", "Protect rhinos")
        
        # 2. Mock leader to succeed
        leader_out = json.dumps({
            "is_recovering": True,
            "confidence_score": 90,
            "ecological_analysis": "Rhinos recovering."
        })
        mock_genlayer.nondet.exec_prompt_responses = [leader_out]
        
        # 3. Enable validator-only scrape failure
        mock_genlayer.vm.fail_validator_render = True
        
        # 4. Audit milestone should raise consensus failure (VERIFIED STAFF FIX)
        with self.assertRaises(RuntimeError) as context:
            self.contract.audit_milestone(gid, "https://reports.com/rhinos")
        self.assertIn("Consensus not reached", str(context.exception))

    def test_get_grant_empty(self):
        res = self.contract.get_grant(99)
        self.assertEqual(res, "{}")

    def test_get_grant_success(self):
        mock_genlayer.message.sender_address = "0xCreator"
        mock_genlayer.message.value = bigint(50 * 10**18)
        gid = self.contract.create_grant("0xNGO", "Protect rhinos")
        
        res_str = self.contract.get_grant(gid)
        res = json.loads(res_str)
        self.assertEqual(res["id"], gid)
        self.assertEqual(res["creator"], "0xCreator")
        self.assertEqual(res["ngo"], "0xNGO")
        self.assertEqual(res["amount"], 50 * 10**18)
        self.assertEqual(res["status"], "ACTIVE")

if __name__ == '__main__':
    unittest.main()
