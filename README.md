# EcoGuardian Fund — Evidence-Based Wildlife Conservation Protocol

**EcoGuardian Fund** is a Regenerative Finance (ReFi) smart contract that escrows wildlife conservation grants, releasing funds based on verified ecological impact rather than time milestones.

## ⚡ The Pitch: Why EcoGuardian Fund DIES without GenLayer

On traditional blockchains (Ethereum, Solana, etc.), smart contracts are fully deterministic and isolated from the outside world. This makes EcoGuardian Fund **impossible** to build because:
1. **No External Scraped Data**: Traditional contracts cannot access web pages or scrape dynamic environmental report PDFs directly.
2. **Oracle Centralization**: Relying on standard web-scraping oracles introduces a single point of failure and centralized manipulation.
3. **No Native AI Processing**: Evaluating dynamic animal population metrics, poaching trends, and scientific reports requires qualitative, natural language analysis. Traditional chains cannot run large language models on-chain.

**GenLayer solves all of this.** By using non-deterministic calls (`gl.nondet.web.render` and `gl.nondet.exec_prompt`) executed by a decentralized network of nodes, GenLayer allows the contract to:
- Directly read live environmental reports from submitted report URLs.
- Feed the comparative data into an AI "Chief Ecological Scientist" to evaluate metrics against conservation goals.
- Run a custom consensus validator that verifies the core boolean recovery outcome (`is_recovering`) to reach consensus, allowing for natural linguistic variations in reports while securing token transfers.

---

## 🛠️ Project Structure

```
EcoGuardian/
├── contracts/
│   └── ecoguardian.py       # GenLayer Intelligent Smart Contract (v0.2.16)
├── frontend/                # Observatory Telemetry Dashboard (React + Vite)
└── README.md                # Documentation
```

---

## 🚀 How to Deploy on GenLayer Studio

1. **Access GenLayer Studio**: Open the GenLayer Studio developer environment.
2. **Create Contract File**: Create a new file named `ecoguardian.py` under the contracts section.
3. **Paste Code**: Copy the contents of [ecoguardian.py](contracts/ecoguardian.py) and paste it into the editor.
4. **Deploy**: Build and deploy the contract using the Studio interface. Save the returned contract address.

---

## 🖥️ How to Run the Frontend Dashboard

1. **Navigate to Frontend**:
   ```bash
   cd frontend
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**:
   Create a `.env` file in the `frontend` folder and set your deployed contract address:
   ```env
   VITE_CONTRACT_ADDRESS=0x4f84aD8EaBA93ABD1A5132A66955EFFfFb4A5B17
   ```
4. **Launch Dev Server**:
   ```bash
   npm run dev
   ```
5. **Open Browser**: Open your browser to the local address displayed (e.g., `http://localhost:5173`) to access the Observatory Telemetry Dashboard.

---

## 🌐 How to Push to GitHub & Deploy to Vercel

### 1. Push to GitHub
Open your terminal in the root directory `D:\Gen\EcoGuardian` and run:
```bash
git init
git add .
git commit -m "feat: initial commit for EcoGuardian Fund dApp"
# Create a new public repository on GitHub and link it:
git remote add origin https://github.com/your-username/eco-guardian.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel
Deploy the frontend directly to Vercel using the Vercel CLI:
```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```
During the setup, configure the production environment variable:
- Key: `VITE_CONTRACT_ADDRESS`
- Value: `0x4f84aD8EaBA93ABD1A5132A66955EFFfFb4A5B17`
