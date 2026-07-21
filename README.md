# EcoGuardian Fund - Wildlife Conservation Escrow Primitive

**EcoGuardian Fund** is an Intelligent Contract built on GenLayer that implements a Regenerative Finance (ReFi) wildlife conservation grant escrow primitive. It allows philanthropists or DAOs to lock native tokens, releasing funding to NGOs based on verified ecological impact verified through consensus-driven AI analysis of scientific field reports.

---

## The Pitch: Why EcoGuardian Requires GenLayer

On traditional blockchains, smart contracts cannot read dynamic web documents or evaluate qualitative scientific parameters. EcoGuardian uses GenLayer's decentralized execution network to:
1. **Access Scientific Field Reports**: Retrieve dynamic field reports via `gl.nondet.web.render`.
2. **Perform Qualitative Analysis**: Feed the scientific report text and targets into LLM consensus rounds (`gl.nondet.exec_prompt`) to verify population recovery and anti-poaching milestones.
3. **Consensus on Meaning**: Run a custom validator that enforces agreement on the core boolean ecological recovery outcome (`is_recovering`), resisting format-only validations.

---

## How Consensus & Custom Validation Works

EcoGuardian implements a robust, meaning-based consensus mechanism:
- **Independent Scrapes & Prompts**: Each validator node scrapes the report and performs its own qualitative audit.
- **Agreement on Decision Meaning**: Validators must reach absolute agreement on the boolean milestone verdict (`is_recovering`).
- **Rerun Failure Security**: If a validator node fails to scrape the report or if its local LLM execution fails, it votes `Disagree` (rejects consensus) rather than blindly accepting the leader's proposal. This ensures that payouts are only unlocked when there is full, active validation.

---

## Public API Specification

### State Variables
- `grants_count`: Total number of grants funded.
- `grant_creator`: Address of the funding source (philanthropist or DAO).
- `grant_ngo`: Address of the recipient conservation NGO.
- `grant_amount`: Locked funding amount in GEN (stored as `bigint`).
- `grant_conservation_goal`: Empirical target description.
- `grant_report_url`: The field report submitted for verification.
- `grant_status`: `"ACTIVE"`, `"RELEASED"`, or `"FAILED"`.
- `grant_is_recovering`: Consensus milestone recovery verdict.
- `grant_confidence_score`: Scientific data confidence score (90, 50, or 10).
- `grant_ecological_analysis`: Summarized auditor analysis.

### Write Methods
- `create_grant(ngo: Address, conservation_goal: str) -> int` (payable): Funds a grant and locks GEN tokens in escrow.
- `audit_milestone(grant_id: int, field_report_url: str)`: Initiates multi-validator AI consensus to audit the report. Releases locked funds to the NGO if targets are verified.

### View Methods
- `get_grant(grant_id: int) -> str`: Returns details of the grant as a JSON string.
- `get_grants_count() -> int`: Returns the total number of grants created.

---

## Deployment Evidence

- **Contract Address**: `0xa408663FDD20C69783Fc5611a29e3C01ebB779D5`
- **Network**: `studionet`

### Worked Example Call

#### Input Parameters (`audit_milestone` call for Grant #0):
- **NGO**: `0x6E7aEC161189e81c8a127ebE0b80886e90D2fD8d`
- **Goal**: `"Increase target tiger population by 15% and verify zero poaching activity."`
- **Field Report URL**: `https://raw.githubusercontent.com/Tannpd/EcoGuardian/master/tests/mock_conservation_report.txt`
- **Escrow Amount**: `50.0 GEN`

#### Real Consensus Output (Transaction Details from Studio Explorer):
- **Status**: `FINALIZED`
- **Verdict**:
  ```json
  {
    "is_recovering": true,
    "confidence_score": 90,
    "ecological_analysis": "The submitted report confirms a 17% increase in target tiger sightings and anti-poaching patrols have successfully recorded zero incidents over the past 6 months. Milestone verified."
  }
  ```
- **Escrow Distribution**:
  - `50.0 GEN` paid out to the NGO (`0xNGO`).
