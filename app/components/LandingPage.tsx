'use client';

import Image from 'next/image';

type Links = {
  website: string;
  twitter: string;
  promptCost: string;
};

function RainLayer() {
  const items = Array.from({ length: 22 }).map((_, i) => ({
    id: i,
    left: `${4 + ((i * 4.2) % 92)}%`,
    duration: `${5 + (i % 5)}s`,
    delay: `${(i % 7) * 0.8}s`,
    size: 22 + (i % 6) * 8,
    opacity: 0.07 + (i % 4) * 0.03
  }));

  return (
    <div className="rain-layer" aria-hidden="true">
      {items.map((item) => (
        <Image
          key={item.id}
          src="/stronghold-logo.jpg"
          alt=""
          width={item.size}
          height={item.size}
          className="rain-item"
          style={{
            left: item.left,
            width: item.size,
            height: item.size,
            opacity: item.opacity,
            animationDuration: item.duration,
            animationDelay: item.delay
          }}
        />
      ))}
    </div>
  );
}

function GlassBars() {
  return (
    <div className="glass-bars" aria-hidden="true">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="glass-bar"
          style={{
            height: `${120 + ((i * 37) % 160)}px`,
            animationDelay: `${i * 0.22}s`
          }}
        />
      ))}
    </div>
  );
}

export default function LandingPage({ onOpen, links }: { onOpen: () => void; links: Links }) {
  return (
    <div className="landing-root">
      <RainLayer />
      <div className="landing-gradient" />
      <GlassBars />

      <header className="header shell">
        <div className="brand-wrap">
          <Image src="/stronghold-logo.jpg" alt="Mushee Cloud" width={40} height={40} className="brand-logo" />
          <div>
            <div className="brand-kicker">MUSHEE</div>
            <div className="brand-title">Mushee Cloud</div>
          </div>
        </div>
        <nav className="header-links">
          <a href={links.website} target="_blank" rel="noreferrer">Website</a>
          <a href={links.twitter} target="_blank" rel="noreferrer">Twitter</a>
          <button className="primary-btn" onClick={onOpen}>Open dashboard</button>
        </nav>
      </header>

      <main className="hero shell">
        <section className="hero-copy">
          <div className="pill">UK incorporated · Stellar payment flow · SHX mainnet settlement layer</div>
          <h1>
            Run AI on <span>Stellar testnet</span> now, settle with SHX on mainnet later.
          </h1>
          <p>
            Mushee Cloud is a premium AI workspace for prompts, images, and creative tasks. The current payment flow is demonstrated on Stellar testnet using XLM, with SHX positioned as the intended settlement asset on mainnet.
          </p>
          <div className="cta-row">
            <button className="primary-btn lg" onClick={onOpen}>Open dashboard</button>
            <a className="secondary-btn" href={links.website} target="_blank" rel="noreferrer">Visit mushee.xyz</a>
          </div>
          <div className="stat-grid">
            <article className="stat-card">
              <div className="stat-label">Payments</div>
              <div className="stat-value">{links.promptCost} XLM</div>
              <div className="stat-copy">Base prompt cost on Stellar testnet.</div>
            </article>
            <article className="stat-card">
              <div className="stat-label">Treasury</div>
              <div className="stat-value small">Treasury-ready</div>
              <div className="stat-copy">Configured for Stellar testnet settlement.</div>
            </article>
            <article className="stat-card">
              <div className="stat-label">Modes</div>
              <div className="stat-value">Prompt · Image · Tasks</div>
              <div className="stat-copy">A single workspace for Gemini-powered output.</div>
            </article>
          </div>
        </section>

        <section className="preview-card">
          <div className="preview-topbar">
            <div className="traffic-lights">
              <span />
              <span />
              <span className="blue" />
            </div>
            <div className="preview-badge">Gemini powered</div>
          </div>
          <div className="preview-body">
            <div className="preview-head">
              <div>
                <div className="muted">Quick start</div>
                <div className="preview-title">Write, generate, and run tasks.</div>
              </div>
              <div className="wallet-pill">Balance: 128.41 XLM</div>
            </div>
            <div className="starter-list">
              {[
                'Write a clean product intro for Mushee Cloud',
                'Generate a funding update for a blockchain grant',
                'Turn this idea into a landing page headline',
                'Draft a post announcing SHX-powered AI payments'
              ].map((item) => (
                <button key={item} className="starter-item">{item}</button>
              ))}
            </div>
            <div className="prompt-bar">
              <input readOnly value="Turn Mushee Cloud into a premium SHX AI experience" />
              <button className="primary-btn">Run</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
