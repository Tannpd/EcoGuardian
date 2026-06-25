# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# =============================================================================
#  ecoguardian.py — EcoGuardian Fund: Wildlife Conservation Escrow Protocol
#  GenLayer Intelligent Contract (v0.2.16)
# =============================================================================

from genlayer import *
import json

class Contract(gl.Contract):
    """
    EcoGuardian Fund — Wildlife Conservation Escrow Protocol
    ========================================================
    A Regenerative Finance (ReFi) smart contract that holds conservation grants in
    escrow. Funds are released based on verified ecological impact rather than time.
    An NGO requests a milestone payout by submitting a field report URL. GenLayer
    AI nodes scrape the report, evaluate animal population recovery and anti-poaching
    milestones, and consensus-audit the boolean is_recovering decision to unlock funds.
    """

    # Monotonic grant counter
    grants_count:               u64

    # Storage Mappings (Pre-initialized by VM)
    grant_creator:              TreeMap[u64, Address]
    grant_ngo:                  TreeMap[u64, Address]
    grant_amount:               TreeMap[u64, u256]
    grant_conservation_goal:    TreeMap[u64, str]
    grant_report_url:           TreeMap[u64, str]
    grant_status:               TreeMap[u64, str]       # "ACTIVE", "RELEASED", "FAILED"
    grant_is_recovering:        TreeMap[u64, bool]
    grant_confidence_score:     TreeMap[u64, u256]      # 0 to 100
    grant_ecological_analysis:  TreeMap[u64, str]       # Scientific auditor breakdown

    # ═══════════════════════════════════════════════════════════════════
    # CONSTRUCTOR
    # ═══════════════════════════════════════════════════════════════════
    def __init__(self) -> None:
        self.grants_count = 0

    # ═══════════════════════════════════════════════════════════════════
    # PUBLIC WRITE: CREATE GRANT
    # ═══════════════════════════════════════════════════════════════════
    @gl.public.write
    def create_grant(self, ngo: Address, conservation_goal: str) -> int:
        """
        Philanthropist or DAO locks native GEN tokens, designating the NGO and milestone goals.
        """
        amount = int(gl.message.value)
        if amount <= 0:
            raise UserError("You must lock a positive GEN amount to fund a conservation grant.")

        if len(conservation_goal.strip()) == 0:
            raise UserError("Conservation goal description cannot be empty.")

        gid = self.grants_count

        self.grant_creator[gid] = gl.message.sender_address
        self.grant_ngo[gid] = ngo
        self.grant_amount[gid] = amount
        self.grant_conservation_goal[gid] = conservation_goal.strip()
        self.grant_report_url[gid] = ""
        self.grant_status[gid] = "ACTIVE"
        self.grant_is_recovering[gid] = False
        self.grant_confidence_score[gid] = 0
        self.grant_ecological_analysis[gid] = "Grant funded. NGO can request milestone payouts by submitting field reports."

        self.grants_count = int(gid) + 1
        return int(gid)

    # ═══════════════════════════════════════════════════════════════════
    # PUBLIC WRITE: AUDIT MILESTONE
    # ═══════════════════════════════════════════════════════════════════
    @gl.public.write
    def audit_milestone(self, grant_id: int, field_report_url: str) -> None:
        """
        Scrapes the environmental report and performs an AI-driven consensus audit.
        If milestone goals are verified (is_recovering is True), the locked grant is paid out.
        """
        if grant_id < 0 or grant_id >= int(self.grants_count):
            raise UserError("Grant does not exist.")

        status = self.grant_status.get(grant_id, "ACTIVE")
        if status != "ACTIVE" and status != "FAILED":
            raise UserError("Grant is not in active or failed state.")

        ngo = self.grant_ngo.get(grant_id, Address("0x0000000000000000000000000000000000000000"))
        amount = int(self.grant_amount.get(grant_id, 0))
        goal = self.grant_conservation_goal.get(grant_id, "")

        if amount <= 0:
            raise UserError("No locked funds found in this grant vault.")

        if len(field_report_url.strip()) == 0:
            raise UserError("Field report URL cannot be empty.")

        url_lower = field_report_url.lower().strip()
        if not (url_lower.startswith("http://") or url_lower.startswith("https://")):
            raise UserError("Invalid URL format. Must start with http:// or https://")

        self.grant_report_url[grant_id] = field_report_url.strip()
        self.grant_status[grant_id] = "ACTIVE"
        self.grant_ecological_analysis[grant_id] = "AI Ecological Scientists are auditing the field report metrics..."

        # ── Non-Deterministic Execution block ───────────────────────────
        def leader_fn() -> str:
            # 1. Scrape Field Report page
            try:
                report_raw = gl.nondet.web.render(field_report_url)
                report_text = report_raw.strip()
            except Exception as e:
                return json.dumps({
                    "error": "REPORT_SCRAPE_FAILED",
                    "is_recovering": False,
                    "confidence_score": 0,
                    "ecological_analysis": f"Failed to retrieve or render the environmental field report: {str(e)}"
                })

            if len(report_text) < 100:
                return json.dumps({
                    "error": "INSUFFICIENT_DATA",
                    "is_recovering": False,
                    "confidence_score": 0,
                    "ecological_analysis": "The scraped field report page contains insufficient text to evaluate wildlife status."
                })

            report_excerpt = report_text[:5000]

            # 2. AI Biological Auditor Prompt Construction
            prompt = f"""You are a chief ecological scientist and strict biological auditor evaluating a wildlife conservation grant milestone.
Your role is to verify if the submitted scientific field report contains empirical evidence that the conservation goal has been met.

Target Conservation Goal: {goal}
Field Report URL: {field_report_url}

Scraped Report Content:
--- START FIELD REPORT TEXT ---
{report_excerpt}
--- END FIELD REPORT TEXT ---

Please analyze:
1. POPULATION METRICS: Does the report show a positive recovery trend, population increase, or habitat expansion for the target species?
2. THREAT MITIGATION: Is there data verifying a significant decrease in poaching, logging, or illegal hunting?
3. VERDICT: Determine "is_recovering" (true or false). Set it to true ONLY if there is clear, quantitative, or scientific confirmation that the conservation goal is actively being achieved or surpassed.
4. CONFIDENCE: Rate your confidence in the report's quality and metrics from 0 to 100.

Your output MUST be a single, valid JSON object with EXACTLY the following keys:
{{
  "is_recovering": true | false,
  "confidence_score": <int between 0 and 100>,
  "ecological_analysis": "<2-3 sentences of scientific summary detailing the biological proof or lack thereof>"
}}
Do NOT wrap the JSON in markdown code blocks. Do NOT add any extra text or conversation. Only return the raw JSON."""

            try:
                raw_output = gl.nondet.exec_prompt(prompt)
            except Exception as e:
                return json.dumps({
                    "error": f"LLM_EXECUTION_FAILED: {str(e)}",
                    "is_recovering": False,
                    "confidence_score": 0,
                    "ecological_analysis": "AI node failed to execute biological audit prompt."
                })

            cleaned = raw_output.strip()
            # Clean markdown code blocks if present
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                inner = []
                for line in lines[1:]:
                    if line.strip() == "```":
                        break
                    inner.append(line)
                cleaned = "\n".join(inner).strip()

            try:
                parsed = json.loads(cleaned)
                is_recov = bool(parsed.get("is_recovering", False))
                score = int(parsed.get("confidence_score", 0))
                analysis_str = str(parsed.get("ecological_analysis", "No analysis details provided.")).strip()

                if score < 0: score = 0
                if score > 100: score = 100

                return json.dumps({
                    "is_recovering": is_recov,
                    "confidence_score": score,
                    "ecological_analysis": analysis_str[:1000]
                })
            except Exception as e:
                return json.dumps({
                    "error": f"JSON_PARSE_FAILED: {str(e)}",
                    "is_recovering": False,
                    "confidence_score": 0,
                    "ecological_analysis": f"AI response was not valid JSON: {cleaned}"
                })

        def validator_fn(leader_result: str) -> bool:
            """
            Semantic Validator: Core Boolean Consensus.
            Nodes must agree on the core boolean 'is_recovering' decision.
            Varying scores or analyses are accepted to ensure high throughput.
            """
            try:
                leader_data = json.loads(leader_result)
            except Exception:
                return False

            if "error" in leader_data:
                allowed_errors = {"REPORT_SCRAPE_FAILED", "INSUFFICIENT_DATA", "LLM_EXECUTION_FAILED", "JSON_PARSE_FAILED"}
                return any(err in str(leader_data.get("error", "")) for err in allowed_errors)

            validator_raw = leader_fn()
            try:
                validator_data = json.loads(validator_raw)
            except Exception:
                return True  # Abstain on local error

            if "error" in validator_data:
                return True

            leader_recov = bool(leader_data.get("is_recovering", False))
            validator_recov = bool(validator_data.get("is_recovering", False))

            return leader_recov == validator_recov

        # Run consensus
        consensus_json = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        try:
            res = json.loads(consensus_json)
        except Exception:
            self.grant_status[grant_id] = "FAILED"
            self.grant_ecological_analysis[grant_id] = "Consensus outcome was unparseable."
            return

        if "error" in res:
            self.grant_status[grant_id] = "FAILED"
            self.grant_ecological_analysis[grant_id] = f"Audit failed: {res.get('error')}. Info: {res.get('ecological_analysis')}"
            return

        is_recov = bool(res.get("is_recovering", False))
        score = int(res.get("confidence_score", 0))
        analysis_str = str(res.get("ecological_analysis", "AI biological audit completed."))

        self.grant_is_recovering[grant_id] = is_recov
        self.grant_confidence_score[grant_id] = score
        self.grant_ecological_analysis[grant_id] = analysis_str

        if is_recov:
            # milestone verified! release grant to NGO
            self.grant_amount[grant_id] = 0
            self.grant_status[grant_id] = "RELEASED"

            other = gl.get_contract_at(ngo)
            other.emit_transfer(value=u256(amount))
        else:
            # Fails to trigger release, remains locked and ACTIVE for future audits
            self.grant_status[grant_id] = "ACTIVE"

    # ═══════════════════════════════════════════════════════════════════
    # READ-ONLY VIEW METHODS
    # ═══════════════════════════════════════════════════════════════════
    @gl.public.view
    def get_grant(self, grant_id: int) -> str:
        """
        Returns JSON details of the grant.
        """
        if grant_id < 0 or grant_id >= int(self.grants_count):
            return "{}"

        creator = self.grant_creator.get(grant_id, Address("0x0000000000000000000000000000000000000000"))
        ngo = self.grant_ngo.get(grant_id, Address("0x0000000000000000000000000000000000000000"))
        amount = int(self.grant_amount.get(grant_id, 0))
        goal = self.grant_conservation_goal.get(grant_id, "")
        url = self.grant_report_url.get(grant_id, "")
        status = self.grant_status.get(grant_id, "ACTIVE")
        is_recov = bool(self.grant_is_recovering.get(grant_id, False))
        score = int(self.grant_confidence_score.get(grant_id, 0))
        analysis_str = self.grant_ecological_analysis.get(grant_id, "")

        return json.dumps({
            "id": grant_id,
            "creator": str(creator),
            "ngo": str(ngo),
            "amount": amount,
            "conservation_goal": goal,
            "field_report_url": url,
            "status": status,
            "is_recovering": is_recov,
            "confidence_score": score,
            "ecological_analysis": analysis_str
        })

    @gl.public.view
    def get_grants_count(self) -> int:
        return int(self.grants_count)
