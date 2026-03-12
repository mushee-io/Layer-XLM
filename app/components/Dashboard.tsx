'use client';

import { useEffect, useMemo, useState } from 'react';
import { Horizon, Networks, Operation, TransactionBuilder, Asset } from '@stellar/stellar-sdk';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit/sdk';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';

type Links = {
  website: string;
  twitter: string;
  promptCost: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type SupportedWallet = {
  id: string;
  icon?: string;
  available?: boolean;
};

const server = new Horizon.Server('https://horizon-testnet.stellar.org');
const nativeAsset = Asset.native();
const PREFERRED_WALLETS = ['freighter', 'lobstr', 'rabet', 'albedo'];
const WALLET_LABELS: Record<string, string> = {
  freighter: 'Freighter',
  lobstr: 'LOBSTR',
  rabet: 'Rabet',
  albedo: 'Albedo'
};

let kitInitialized = false;

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function prettyWalletLabel(id: string) {
  return WALLET_LABELS[id?.toLowerCase?.()] || id || 'Stellar wallet';
}

export default function Dashboard({ onBack, links }: { onBack: () => void; links: Links }) {
  const [mode, setMode] = useState<'chat' | 'image' | 'tasks' | 'vault'>('chat');
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0.00 XLM');
  const [walletLabel, setWalletLabel] = useState('No wallet connected');
  const [wallets, setWallets] = useState<SupportedWallet[]>([]);
  const [walletModalLoading, setWalletModalLoading] = useState(false);
  const [input, setInput] = useState('');
  const [imagePrompt, setImagePrompt] = useState(
    'Create a clean abstract Mushee Cloud hero image in white, black, and blue.'
  );
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: 'assistant',
      content:
        'Welcome to Mushee Cloud. Connect a Stellar wallet, confirm a testnet XLM payment, and run prompts powered by Gemini.'
    }
  ]);

  const treasury = useMemo(
    () =>
      process.env.NEXT_PUBLIC_TREASURY_STELLAR_ADDRESS ||
      process.env.TREASURY_STELLAR_ADDRESS ||
      'GAQJARPI6MTGTCX6BB7UZLLBQ2DCZCJDI47OHKUEGQBSJCDHTRSQOCY4',
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function setupWalletKit() {
      try {
        if (!kitInitialized) {
          StellarWalletsKit.init({ modules: defaultModules() });
          StellarWalletsKit.setNetwork(Networks.TESTNET as any);
          kitInitialized = true;
        }

        const supported = await StellarWalletsKit.refreshSupportedWallets();
        if (cancelled) return;

        const normalized = supported
          .map((wallet: any) => ({
            id: wallet.id,
            icon: wallet.icon,
            available: typeof wallet.isAvailable === 'function' ? undefined : true
          }))
          .sort((a, b) => {
            const ai = PREFERRED_WALLETS.indexOf(a.id.toLowerCase());
            const bi = PREFERRED_WALLETS.indexOf(b.id.toLowerCase());
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
          });

        setWallets(normalized);
      } catch (error) {
        console.error(error);
      }
    }

    setupWalletKit();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshBalance(address: string) {
    const account = await server.loadAccount(address);
    const xlm = account.balances.find((item: any) => item.asset_type === 'native');
    setBalance(`${Number(xlm?.balance || 0).toFixed(2)} XLM`);
  }

  async function connectWallet() {
    try {
      setWalletModalLoading(true);

      if (!kitInitialized) {
        StellarWalletsKit.init({ modules: defaultModules() });
        StellarWalletsKit.setNetwork(Networks.TESTNET as any);
        kitInitialized = true;
      }

      const { address } = await StellarWalletsKit.authModal();

      if (!address) {
        throw new Error('Wallet connection was cancelled.');
      }

      const module = StellarWalletsKit.selectedModule as any;
      const activeId = module?.id || 'stellar wallet';

      setWalletAddress(address);
      setWalletLabel(prettyWalletLabel(activeId));
      setConnected(true);

      await refreshBalance(address);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Wallet connection failed.';
      alert(
        message.includes('cancel')
          ? message
          : 'Could not open a Stellar wallet. Make sure Freighter, LOBSTR Signer, Rabet, or Albedo is installed and allowed for this site, then try again.'
      );
    } finally {
      setWalletModalLoading(false);
    }
  }

  async function sendPayment() {
    if (!connected || !walletAddress) {
      throw new Error('Connect a Stellar wallet first.');
    }

    if (walletAddress === treasury) {
      throw new Error(
        'Connected wallet cannot be the same as the treasury wallet. Use a separate testnet wallet.'
      );
    }

    const amount = Number(links.promptCost);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid prompt cost configuration.');
    }

    const source = await server.loadAccount(walletAddress);
    const tx = new TransactionBuilder(source, {
      fee: '10000',
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(
        Operation.payment({
          destination: treasury,
          asset: nativeAsset,
          amount: amount.toFixed(2)
        })
      )
      .setTimeout(180)
      .build();

    const signed = await StellarWalletsKit.signTransaction(tx.toXDR(), {
      networkPassphrase: Networks.TESTNET,
      address: walletAddress
    });

    if (!signed?.signedTxXdr) {
      throw new Error('Transaction signing failed.');
    }

    const result = await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedXdr: signed.signedTxXdr })
    });

    const data = await result.json();

    if (!result.ok) {
      throw new Error(data.error || 'Payment failed.');
    }

    await refreshBalance(walletAddress);
    return data.hash as string;
  }

  async function runPrompt() {
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { id: uid(), role: 'user', content: userText }]);
    setInput('');
    setLoading(true);

    try {
      const txHash = await sendPayment();

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chat',
          prompt: userText,
          txHash
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gemini request failed.');
      }

      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: data.text }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: message }]);
    } finally {
      setLoading(false);
    }
  }

  async function runImagePrompt() {
    setLoading(true);

    try {
      const txHash = await sendPayment();

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'image',
          prompt: imagePrompt,
          txHash
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Image prompt failed.');
      }

      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: data.text }]);
      setMode('chat');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: message }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-root">
      <aside className="sidebar">
        <div className="sidebar-brand sidebar-brand-textonly">
          <div>
            <div className="brand-kicker">MUSHEE</div>
            <div className="brand-title">Cloud Dashboard</div>
            <div className="brand-subtitle">Prompt workspace</div>
          </div>
        </div>

        <button className="secondary-btn full" onClick={onBack}>
          Back to landing
        </button>

        <div className="menu-list">
          {[
            ['chat', 'New chat'],
            ['image', 'Generate image'],
            ['tasks', 'Tasks'],
            ['vault', 'Vault']
          ].map(([key, label]) => (
            <button
              key={key}
              className={`menu-item ${mode === key ? 'active' : ''}`}
              onClick={() => setMode(key as any)}
            >
              <span>{label}</span>
              {key === 'vault' ? <small>Locked</small> : null}
            </button>
          ))}
        </div>

        <section className="side-card">
          <h3>Wallet</h3>
          <p>Stellar ecosystem wallet flow</p>

          <div className="wallet-buttons">
            <button
              className="primary-btn full blue"
              onClick={connectWallet}
              disabled={walletModalLoading}
            >
              {walletModalLoading
                ? 'Opening wallet modal…'
                : connected
                ? `Connected: ${walletLabel}`
                : 'Connect wallet'}
            </button>

            <div className="wallet-option-grid">
              {['freighter', 'lobstr', 'rabet', 'albedo'].map((id) => {
                const installed = wallets.find(
                  (wallet) => wallet.id.toLowerCase() === id
                )?.available;

                return (
                  <button
                    key={id}
                    className="wallet-chip blue-chip"
                    onClick={connectWallet}
                    type="button"
                  >
                    <span>{prettyWalletLabel(id)}</span>
                    <small>{installed === false ? 'Install first' : 'Open connect'}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="wallet-help">
            The connect modal now supports Stellar wallet choices including Freighter, LOBSTR,
            Rabet, and Albedo on testnet. Pick any supported wallet there, approve the site, then
            sign the prompt payment.
          </div>

          <div className="wallet-info">
            <div>
              <strong>Connected with:</strong> {walletLabel}
            </div>
            <div>
              <strong>Balance:</strong> {balance}
            </div>
            <div>
              <strong>Network:</strong> Stellar testnet
            </div>
            <div>
              <strong>Settlement:</strong> SHX on mainnet
            </div>
            {walletAddress ? (
              <div className="address-line">
                <strong>Wallet:</strong> {walletAddress}
              </div>
            ) : null}
          </div>
        </section>

        <section className="side-card soft-blue">
          <h3>Claim faucet</h3>
          <p>Testnet balance tools</p>
          <div className="faucet-copy">Claim testnet XLM to explore the prompt flow.</div>
          <a
            className="secondary-btn full"
            href="https://laboratory.stellar.org/#account-creator?network=test"
            target="_blank"
            rel="noreferrer"
          >
            Claim testnet XLM
          </a>
        </section>
      </aside>

      <main className="main-panel">
        <div className="dashboard-topbar">
          <div>
            <div className="muted">Mushee Cloud</div>
            <h1>AI workspace with Stellar-powered prompt payments</h1>
          </div>

          <div className="badge-row">
            <span className="soft-badge">UK incorporated</span>
            <span className="soft-badge">XLM testnet live</span>
            <span className="soft-badge">SHX settlement later</span>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="workspace-card">
            <div className="workspace-head">
              <div>
                <h2>
                  {mode === 'chat'
                    ? 'Chat'
                    : mode === 'image'
                    ? 'Image generation'
                    : mode === 'tasks'
                    ? 'Task runner'
                    : 'Vault'}
                </h2>
                <p>
                  Generate copy, explore concepts, create visuals, and test the Stellar-powered
                  payment flow in one premium workspace.
                </p>
              </div>
              <button className="secondary-btn">New</button>
            </div>

            {mode === 'chat' ? (
              <>
                <div className="chat-scroll">
                  {messages.map((message) => (
                    <div key={message.id} className={`chat-row ${message.role}`}>
                      <div className={`bubble ${message.role}`}>{message.content}</div>
                    </div>
                  ))}

                  {loading ? (
                    <div className="chat-row assistant">
                      <div className="bubble assistant">Thinking…</div>
                    </div>
                  ) : null}
                </div>

                <div className="composer">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Mushee Cloud to write, reason, summarize, or generate product-ready content..."
                  />
                  <div className="composer-footer">
                    <span>Prompt cost: {links.promptCost} XLM on Stellar testnet</span>
                    <button className="primary-btn blue" onClick={runPrompt} disabled={loading}>
                      Run prompt
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {mode === 'image' ? (
              <div className="image-grid">
                <div className="image-controls">
                  <label>Image prompt</label>
                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                  />
                  {[
                    'Create a futuristic blue-white AI cloud visual',
                    'Generate a clean product mockup for Mushee Cloud',
                    'Design an abstract Stellar x AI poster'
                  ].map((item) => (
                    <button
                      key={item}
                      className="secondary-btn full"
                      onClick={() => setImagePrompt(item)}
                    >
                      {item}
                    </button>
                  ))}
                  <button
                    className="primary-btn full"
                    onClick={runImagePrompt}
                    disabled={loading}
                  >
                    Generate image
                  </button>
                </div>

                <div className="image-preview">
                  <div className="image-preview-inner">
                    <h3>Image output preview</h3>
                    <p>
                      Use Gemini image workflows or wire your preferred image generation route
                      here. Results, prompt metadata, and payment receipts can appear in this
                      panel.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {mode === 'tasks' ? (
              <div className="task-grid">
                {[
                  ['Write taxes', 'Generate tax-style summaries and structured financial notes.'],
                  ['Draft content', 'Create launch announcements, grant drafts, and social posts.'],
                  ['Research mode', 'Summarize concepts and prepare structured responses quickly.']
                ].map(([title, copy]) => (
                  <article className="task-card" key={title}>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                    <button className="secondary-btn full">Open task</button>
                  </article>
                ))}
              </div>
            ) : null}

            {mode === 'vault' ? (
              <div className="vault-state">
                <h3>Vault coming soon</h3>
                <p>
                  Reserve this section for token tools, higher-tier automations, or future premium
                  actions settled with SHX on mainnet.
                </p>
              </div>
            ) : null}
          </section>

          <div className="right-rail">
            <section className="side-card">
              <h3>Flow</h3>
              <p>How Mushee Cloud works today</p>
              <div className="steps">
                {[
                  'Open the Stellar wallet modal and choose Freighter, LOBSTR, Rabet, or Albedo.',
                  'Use testnet XLM to simulate on-chain usage payments.',
                  'Verify treasury settlement and run Gemini actions.',
                  'Move the same architecture to SHX on Stellar mainnet.'
                ].map((step, idx) => (
                  <div className="step" key={step}>
                    <span>{idx + 1}</span>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="side-card">
              <h3>Project details</h3>
              <p>For ecosystem reviewers</p>
              <div className="wallet-info">
                <div>
                  <strong>Website:</strong>{' '}
                  <a href={links.website} target="_blank" rel="noreferrer">
                    mushee.xyz
                  </a>
                </div>
                <div>
                  <strong>Twitter:</strong>{' '}
                  <a href={links.twitter} target="_blank" rel="noreferrer">
                    @mushee_io
                  </a>
                </div>
                <div className="address-line">
                  <strong>Treasury:</strong> {treasury}
                </div>
                <div>
                  <strong>Model:</strong> Google Gemini
                </div>
              </div>
            </section>

            <section className="side-card soft-blue">
              <h3>Security note</h3>
              <p>Before production deployment</p>
              <div className="wallet-help">
                Keep Gemini and treasury configuration in environment variables, run payment
                submission on secure server routes, and move the settlement asset from testnet XLM
                to SHX on Stellar mainnet.
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
