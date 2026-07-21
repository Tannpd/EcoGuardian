# EcoGuardian Fund — Evidence-Based Wildlife Conservation Protocol

**EcoGuardian Fund** is a Regenerative Finance (ReFi) smart contract that escrows wildlife conservation grants, releasing funds based on verified ecological impact rather than time milestones.

## ⚡ The Pitch: Why EcoGuardian Fund DIES without GenLayer

On traditional blockchains (Ethereum, Solana, etc.), smart contracts are fully deterministic and isolated from the outside world. This makes EcoGuardian Fund **impossible** to build because:
1. **No External Scraped Data**: Traditional contracts cannot access web pages or scrape dynamic environmental report PDFs directly.
2. **Oracle Centralization**: Relying on standard web-scraping oracles introduces a single point of failure and centralized manipulation.
3. **No Native AI Processing**: Evaluating dynamic animal population metrics, poaching trends, and scientific reports requires qualitative, natural language analysis. Traditional chains cannot run large language models on-chain.

**GenLayer solves all of this.** By using non-deterministic calls (`gl.nondet.web.render` and `gl.nondet.exec_prompt`) executed by a decentralized network of nodes, GenLayer allows the contract to:
- Directly read live environmental reports from submitted report URL parameters.
- Feed the comparative data into an AI consensus round to evaluate metrics against conservation goals.
- Run a custom validator that verifies the core boolean ecological recovery outcome (`is_recovering`), ensuring robust consensus.

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

- **Contract Address**: `0x24438946A2874987eBec87D9F45CC43c447b54DF`
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
