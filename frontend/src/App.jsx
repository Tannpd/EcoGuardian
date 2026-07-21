import React, { useState, useEffect } from 'react';
import { 
  useEcoGuardian, 
  formatGen 
} from './useEcoGuardian';
import { 
  Award, 
  BookOpen, 
  Coins, 
  Sparkles, 
  Plus, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Terminal, 
  Clock,
  Shield,
  Activity,
  Globe
} from 'lucide-react';

export default function App() {
  const {
    address,
    grants,
    contractBalance,
    loading,
    error,
    txHash,
    txStatus,
    connectWallet,
    fetchGrantsState,
    createGrant,
    auditMilestone,
    contractAddress
  } = useEcoGuardian();

  // Form states
  const [ngoAddress, setNgoAddress] = useState('');
  const [conservationGoal, setConservationGoal] = useState('');
  const [fundingAmount, setFundingAmount] = useState('1.5');
  const [reportUrl, setReportUrl] = useState('');

  // Interactive UI states
  const [selectedGrantId, setSelectedGrantId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [localError, setLocalError] = useState('');

  // Add system logs
  const addLog = (message, hash = '') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [{ timestamp, message, hash }, ...prev]);
  };

  // Preset loaders
  const setPreset = (goalText, reportText, ngoAddr) => {
    setConservationGoal(goalText);
    setNgoAddress(ngoAddr || '0x0000000000000000000000000000000000000000');
    setReportUrl(reportText);
    addLog(`Loaded preset conservation targets`);
  };

  // Log status updates
  useEffect(() => {
    if (txStatus) addLog(txStatus, txHash);
  }, [txStatus, txHash]);

  // Log error updates
  useEffect(() => {
    if (error) {
      addLog(`Error: ${error}`);
      setLocalError(error);
    }
  }, [error]);

  // Set default selected grant when grants change
  useEffect(() => {
    if (grants.length > 0 && selectedGrantId === null) {
      setSelectedGrantId(grants[0].id);
    }
  }, [grants, selectedGrantId]);

  const handleCreateGrant = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!ngoAddress || !conservationGoal || !fundingAmount) {
      setLocalError('Please fill in all grant specifications.');
      return;
    }

    try {
      addLog(`Funding conservation grant for NGO: ${ngoAddress}...`);
      await createGrant(ngoAddress, conservationGoal, fundingAmount);
      // Clear form
      setNgoAddress('');
      setConservationGoal('');
      addLog(`Grant funded successfully!`);
    } catch (err) {
      addLog(`Failed: ${err.message}`);
    }
  };

  const handleAudit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!selectedGrantId || !reportUrl) {
      setLocalError('Please select a grant and enter a report URL.');
      return;
    }

    try {
      addLog(`Requesting audit on grant #${selectedGrantId} with report...`);
      await auditMilestone(selectedGrantId, reportUrl);
      addLog(`Milestone audit transaction completed.`);
    } catch (err) {
      addLog(`Audit failed: ${err.message}`);
    }
  };

  const selectedGrant = grants.find(g => g.id === selectedGrantId);

  // Circle Gauge Offset Calculations
  const getStrokeOffset = (score) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius; // ~251.3
    const percentage = Number(score || 0);
    return circumference - (percentage / 100) * circumference;
  };

  return (
    <div className="app-container">
      {/* HEADER SECTION */}
      <header className="observatory-header">
        <div className="header-radar-scope">
          <span className="radar-sweep-dot"></span>
          Global Earth Observatory Telemetry Feed
        </div>
        <h1 className="header-title">ECOGUARDIAN FUND</h1>
        <p className="header-subtitle">
          Regenerative Finance (ReFi) smart contracts that escrow and release wildlife conservation grants automatically upon verified biological milestones.
        </p>
      </header>

      {/* SYSTEM STATUS DECK */}
      <div className="observatory-deck">
        <div className="deck-metrics">
          <div className="deck-metric-item">
            <span className="deck-metric-label">Observatory Coordinator</span>
            <span className="deck-metric-value">
              {address ? `${address.substring(0, 10)}...${address.substring(address.length - 8)}` : 'DISCONNECTED'}
            </span>
          </div>
          <div className="deck-metric-item">
            <span className="deck-metric-label">Escrow Contract</span>
            <span className="deck-metric-value">
              {contractAddress ? `${contractAddress.substring(0, 10)}...${contractAddress.substring(contractAddress.length - 8)}` : '0x00000...'}
            </span>
          </div>
          <div className="deck-metric-item">
            <span className="deck-metric-label">Total Escrow Funds</span>
            <span className="deck-metric-value">
              {formatGen(contractBalance)} GEN
            </span>
          </div>
        </div>
        <div>
          {address ? (
            <button className="cyan-outline-btn" onClick={() => fetchGrantsState()} disabled={loading} style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
              {loading ? 'Refreshing...' : 'Refresh Scope'}
            </button>
          ) : (
            <button className="cyan-btn" onClick={connectWallet} disabled={loading} style={{ padding: '0.6rem 1rem' }}>
              {loading ? 'Connecting...' : 'Connect Terminal'}
            </button>
          )}
        </div>
      </div>

      {localError && (
        <div className="toast-error">
          <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          {localError}
        </div>
      )}

      {/* OBSERVATORY RACKS */}
      <div className="observatory-racks">
        
        {/* LEFT PANEL: GRANTS & CONSERVATION DECK */}
        <section className="telemetry-card">
          <h2 className="card-heading">
            <Globe size={18} color="var(--color-cyan)" /> Conservation Deck
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
            DAO coordinators lock grant funding in the escrow pool, setting empirical conservation metrics. 
            NGOs submit environmental report papers to audit targets and release funds.
          </p>

          <form className="observatory-form" onSubmit={handleCreateGrant}>
            <div className="observatory-group">
              <label className="observatory-label">NGO Wallet Address</label>
              <input
                className="observatory-input"
                type="text"
                placeholder="0x..."
                value={ngoAddress}
                onChange={(e) => setNgoAddress(e.target.value)}
              />
            </div>

            <div className="observatory-group">
              <label className="observatory-label">Conservation Milestones (Target Goal)</label>
              <textarea
                className="observatory-input"
                style={{ resize: 'vertical', minHeight: '80px' }}
                placeholder="e.g. Increase tiger population by 5% and reduce poaching"
                value={conservationGoal}
                onChange={(e) => setConservationGoal(e.target.value)}
              />
            </div>

            <div className="observatory-group">
              <label className="observatory-label">Funding Grant Amount (GEN)</label>
              <input
                className="observatory-input"
                type="number"
                step="0.1"
                min="0.1"
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
              />
            </div>

            <button type="submit" className="cyan-btn" disabled={loading || !address}>
              {loading ? 'Deploying Grant...' : (
                <>
                  <Plus size={18} /> Deploy Conservation Grant
                </>
              )}
            </button>
          </form>

          {/* TEST PRESETS */}
          <div className="presets-list">
            <span className="observatory-label">Simulated Audit Targets</span>

            <button 
              className="preset-card"
              style={{ borderLeft: '3px solid var(--color-cyan)', background: 'rgba(2, 240, 240, 0.05)' }}
              onClick={() => setPreset(
                'Increase target tiger population by 15% and verify zero poaching activity.',
                'https://eco-guardian-navy.vercel.app/mock_report.txt',
                '0x6E7aEC161189e81c8a127ebE0b80886e90D2fD8d'
              )}
            >
              <div className="preset-info">
                <span className="preset-title" style={{ color: 'var(--color-cyan)' }}>Bengal Tigers (Vercel Live)</span>
                <span className="preset-goal">Audit milestone using live Vercel mock report (will approve consensus).</span>
              </div>
              <Shield size={16} color="var(--color-cyan)" />
            </button>
            
            <button 
              className="preset-card"
              onClick={() => setPreset(
                'Increase the local Bengal tiger population in Sunderbans by 5% and reduce poaching incidents.',
                'https://www.conservationresearch.org/bengal-tiger-milestone-recovery-report',
                '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
              )}
            >
              <div className="preset-info">
                <span className="preset-title">Bengal Tigers (Will Approve)</span>
                <span className="preset-goal">Report details population growth of 8% and anti-poaching success.</span>
              </div>
              <Shield size={16} color="var(--color-green)" />
            </button>

            <button 
              className="preset-card"
              onClick={() => setPreset(
                'Reduce illegal deforestation in the Amazon Basin reserve by 20% compared to previous year.',
                'https://www.conservationresearch.org/amazon-deforestation-satellite-audit',
                '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
              )}
            >
              <div className="preset-info">
                <span className="preset-title">Amazon Canopy (Will Reject)</span>
                <span className="preset-goal">Satellite imagery details high illegal logging activity in core areas.</span>
              </div>
              <Shield size={16} color="var(--color-amber)" />
            </button>

            <button 
              className="preset-card"
              onClick={() => setPreset(
                'Verify rhino birth rate increase of 3% in Kruger Park.',
                'https://www.conservationresearch.org/inconclusive-short-report-kruger',
                '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
              )}
            >
              <div className="preset-info">
                <span className="preset-title">Rhino Birthrate (Will Fail / No Data)</span>
                <span className="preset-goal">Brief, inconclusive article lacking empirical population data metrics.</span>
              </div>
              <Shield size={16} color="var(--color-text-muted)" />
            </button>
          </div>
        </section>

        {/* RIGHT PANEL: SCIENTIFIC TELEMETRY TERMINAL */}
        <section className="telemetry-card scientific-terminal">
          <h2 className="card-heading">
            <Activity size={18} color="var(--color-cyan)" /> Scientific Terminal
          </h2>

          {!selectedGrant ? (
            <div className="terminal-empty-state">
              <Globe size={40} className="radar-sweep-dot" style={{ background: 'transparent', boxShadow: 'none', animation: 'pulse 1.5s infinite' }} />
              <p>Select a conservation grant from the registry to inspect satellite telemetry and ecological milestones.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
              <div className="terminal-grid">
                <div className="telemetry-fields">
                  <div className="telemetry-field">
                    <span className="telemetry-label">NGO Destination Address</span>
                    <span className="telemetry-value" style={{ fontSize: '1rem', wordBreak: 'break-all' }}>
                      {selectedGrant.ngo}
                    </span>
                  </div>
                  <div className="telemetry-field">
                    <span className="telemetry-label">Locked Escrow Payout</span>
                    <span className="telemetry-value" style={{ color: 'var(--color-cyan)' }}>
                      {formatGen(selectedGrant.amount)} GEN
                    </span>
                  </div>
                  <div className="telemetry-field">
                    <span className="telemetry-label">Target Conservation Milestone</span>
                    <span className="telemetry-value" style={{ fontSize: '1rem', fontStyle: 'italic' }}>
                      {selectedGrant.conservation_goal}
                    </span>
                  </div>
                </div>

                {/* CIRCULAR DIAL FOR CONFIDENCE */}
                <div className="dial-container">
                  <div className="circular-dial">
                    <svg width="100" height="100">
                      <circle cx="50" cy="50" r="40" className="dial-bg" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        className="dial-value" 
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={getStrokeOffset(selectedGrant.confidence_score)}
                      />
                    </svg>
                    <div className="dial-text">
                      <span className="dial-percentage">
                        {selectedGrant.status === 'RELEASED' || selectedGrant.confidence_score > 0 ? `${Number(selectedGrant.confidence_score)}` : '--'}
                      </span>
                      <span className="dial-label">Conf.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SATELLITE FEED LOGS */}
              <div className="satellite-telemetry-feed">
                <p>{selectedGrant.ecological_analysis}</p>
              </div>

              {/* BLOOMING ACTION VERDICT AREA */}
              <div className="blooming-action-area">
                {selectedGrant.status === 'RELEASED' && (
                  <span className="blooming-status-badge recovering">
                    [ Funds Disbursed - Impact Verified ]
                  </span>
                )}
                
                {selectedGrant.status === 'ACTIVE' && selectedGrant.field_report_url !== '' && selectedGrant.confidence_score > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', width: '100%' }}>
                    <span className="blooming-status-badge failed">
                      [ Goal Not Met - Funds Locked ]
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      Report audited. The ecosystem did not show sufficient recovery to release funds. NGO can submit newer progress reports.
                    </span>
                  </div>
                )}

                {selectedGrant.status === 'ACTIVE' && (selectedGrant.field_report_url === '' || selectedGrant.confidence_score === 0) && (
                  <span className="blooming-status-badge pending">
                    Awaiting Milestone Field Report
                  </span>
                )}

                {selectedGrant.status === 'FAILED' && (
                  <span className="blooming-status-badge failed">
                    Consensus Audit Failed
                  </span>
                )}
              </div>

              {/* PAYOUT REQUEST INPUT */}
              {selectedGrant.status === 'ACTIVE' && (
                <form className="observatory-form" onSubmit={handleAudit} style={{ borderTop: '1px solid rgba(22, 54, 34, 0.4)', paddingTop: '1.25rem' }}>
                  <div className="observatory-group">
                    <label className="observatory-label">Field Audit Report URL</label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <input
                        className="observatory-input"
                        style={{ flex: 1 }}
                        type="url"
                        placeholder="e.g. https://wwf.org/tiger-population-report"
                        value={reportUrl}
                        onChange={(e) => setReportUrl(e.target.value)}
                      />
                      <button type="submit" className="cyan-btn" disabled={loading || !address} style={{ padding: '0 1.25rem' }}>
                        {loading ? 'Auditing...' : 'Audit Milestone'}
                      </button>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Submit biological report or environmental audit paper. AI validators will verify population metrics.
                    </span>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>

      {/* BOTTOM SECTION: GRANTS REGISTRY */}
      <section className="registry-container">
        <h2 className="section-label">
          <Clock size={16} /> Conservation Grant Registry
        </h2>
        <div className="registry-table-wrap">
          <table className="telemetry-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>NGO Destination</th>
                <th>Goal Overview</th>
                <th>Escrow Amount</th>
                <th>Milestone Status</th>
                <th>Telemetry Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {grants.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    No conservation grants funded yet. Deploy one using the registry deck.
                  </td>
                </tr>
              ) : (
                grants.map((gr) => (
                  <tr 
                    key={gr.id} 
                    className={selectedGrantId === gr.id ? 'active-row' : ''}
                    onClick={() => setSelectedGrantId(gr.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>#{gr.id}</td>
                    <td>{gr.ngo.substring(0, 10)}...</td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {gr.conservation_goal}
                    </td>
                    <td>{formatGen(gr.amount)} GEN</td>
                    <td>
                      <span className={`status-tag ${gr.status.toLowerCase()}`}>
                        {gr.status}
                      </span>
                    </td>
                    <td>{gr.status === 'ACTIVE' && gr.field_report_url === '' ? '—' : `${gr.confidence_score} pts`}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="cyan-outline-btn"
                        onClick={() => setSelectedGrantId(gr.id)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PITCH AND ARCHITECTURE SECTION */}
      <section className="pitch-deck">
        <h2 className="pitch-title">Why EcoGuardian Fund DIES Without GenLayer</h2>
        <div className="pitch-grid">
          <div className="pitch-column">
            <h3>The Conservation Accountability Gap</h3>
            <p>
              Traditional charity grants are distributed based on time milestones or trusting manual NGO reporting. This leads to <strong>inefficiencies, corruption, and greenwashing</strong>. 
              On standard blockchains like Ethereum, smart contracts are completely isolated and cannot read biological research journals, look at satellite report data, or confirm wildlife population metrics.
            </p>
            <p>
              Relying on standard Web2 centralized APIs introduces oracle manipulation risks, while manual data entry defeats the trustless purpose of web3.
            </p>
          </div>
          <div className="pitch-column">
            <h3>The GenLayer ReFi Solution</h3>
            <p>
              EcoGuardian Fund leverages GenLayer's <strong>Intelligent Contracts</strong> to make ecological grant funding trustless:
            </p>
            <ul>
              <li>
                <strong>Verifiable Biological Auditing:</strong> Scrapes dense environmental PDFs and reports dynamically inside the VM using <code>gl.nondet.web.render</code>.
              </li>
              <li>
                <strong>AI Chief Ecological Scientist:</strong> Parses scientific charts, coordinates, and anti-poaching metrics, ensuring that grant funding is strictly tied to empirical impact.
              </li>
              <li>
                <strong>Consensus on Core Milestones:</strong> validator nodes verify the recovery boolean (<code>is_recovering</code>) to reach consensus, allowing for natural linguistic variations in reports while securing token transfers.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FLOATING LOGS DRAWER TOGGLE */}
      <button 
        className="logs-terminal-toggle" 
        onClick={() => setIsLogsOpen(!isLogsOpen)}
        title="View Telemetry Logs"
      >
        <Terminal size={22} />
      </button>

      {/* FLOATING LOGS TERMINAL */}
      <div className={`logs-terminal-drawer ${isLogsOpen ? 'open' : ''}`}>
        <div className="logs-terminal-header">
          <h3 className="logs-terminal-title">Observatory Terminal Logs</h3>
          <button className="logs-terminal-close" onClick={() => setIsLogsOpen(false)}>×</button>
        </div>
        <div className="logs-terminal-body">
          {logs.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No telemetry logged. Fund a grant or request audit.</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="log-entry">
                <span className="log-time">[{log.timestamp}]</span>
                <span className="log-msg">{log.message}</span>
                {log.hash && (
                  <span className="log-sub">
                    Tx Hash: {log.hash}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
