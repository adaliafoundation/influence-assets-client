# Influence Assets Client — Codebase Overview

## Folder & File Hierarchy

```
influence-assets-client/
├── public/                          # Static assets served by CRA
│   ├── index.html                   # HTML entry point
│   ├── manifest.json                # PWA manifest
│   ├── robots.txt
│   └── *.png, *.ico                 # Favicons & logos
│
├── src/
│   ├── index.js                     # React entry point (React 17, providers setup)
│   ├── App.js                       # Root component (Router, ThemeProvider, alerts)
│   ├── index.css                    # Global styles
│   ├── theme.js                     # styled-components theme (colors, fonts, cursors)
│   ├── reportWebVitals.js
│   ├── service-worker.js            # PWA service worker
│   ├── serviceWorkerRegistration.js
│   ├── setupTests.js
│   │
│   ├── app/                         # Page-level views (the "screens")
│   │   ├── Manager.js               # Layout shell — routes between all pages
│   │   ├── Connect.js               # Landing/connect wallet page
│   │   ├── Bridge.js                # NFT asset bridging (L1↔L2)
│   │   ├── Claim.js                 # Claim SWAY tokens (Arvad crew assignments)
│   │   ├── ClaimEthereum.js         # Claim SWAY from Ethereum testnets
│   │   ├── ClaimStarknet.js         # Claim SWAY from Starknet testnets
│   │   ├── BridgeSwayStarknet.js    # Bridge SWAY token: Ethereum → Starknet
│   │   ├── BridgeSwayEthereum.js    # Bridge SWAY token: Starknet → Ethereum
│   │   ├── ReceiveSwayEthereum.js   # Finalize receiving SWAY on Ethereum (L1)
│   │   └── Designate.js             # Designate a mainnet beneficiary address
│   │
│   ├── components/                  # Reusable UI components
│   │   ├── Alerts.js                # Toast notification system
│   │   ├── AssetCard.js             # Single asset display card
│   │   ├── AssetSelector.js         # Grid of selectable assets with tabs
│   │   ├── Badge.js, BonusIcons.js  # Visual indicators
│   │   ├── BorderWrap.js            # Styled border wrapper
│   │   ├── BrightButton.js          # Primary action button
│   │   ├── Button.js                # Base button
│   │   ├── ClaimSwayDialog.js       # Dialog: claim SWAY before bridging
│   │   ├── ConditionalContent.js    # Show/hide content by screen size
│   │   ├── DelegateConfirm.js       # Dialog: confirm crew delegation
│   │   ├── DestinationConfirm.js    # Dialog: confirm destination wallet address
│   │   ├── Dialog.js                # Base modal dialog
│   │   ├── Header.js                # Top header bar (account info, tabs, logout)
│   │   ├── Icons.js                 # SVG icon components (SwayIcon, etc.)
│   │   ├── L2L1Dialog.js            # Dialog: L2→L1 bridge status tracker
│   │   ├── MintCrewmateDialog.js    # Dialog: mint crewmate from asteroid
│   │   ├── OnClickLink.js           # Clickable link component
│   │   ├── OrphanDialog.js          # Dialog: recover orphaned bridge transactions
│   │   ├── Tabs.js                  # Tab navigation component
│   │   ├── WalletConnectDialog.js   # Dialog: wallet selection/connection
│   │   └── assets/                  # SVGs and images (logos, icons, backgrounds)
│   │
│   ├── contexts/
│   │   └── WalletContext.js         # React Context providing L1+L2 wallet state
│   │
│   ├── hooks/
│   │   ├── useStore.js              # Zustand global state store (THE central state)
│   │   ├── useL1Wallet.js           # Ethereum (L1) wallet: connection + smart contract calls
│   │   ├── useL2Wallet.js           # Starknet (L2) wallet: connection + smart contract calls
│   │   ├── useInterval.js           # setInterval hook
│   │   ├── useScreenSize.js         # Responsive breakpoint hook
│   │   └── useServiceWorker.js      # PWA update detection
│   │
│   └── lib/
│       ├── api.js                   # Axios HTTP client to the Influence backend API
│       ├── assets.js                # Asset type mappings (contract addresses, bridge configs)
│       └── blockchain/
│           ├── chain.js             # Ethereum chain config (Infura/Alchemy URLs)
│           └── connectors.js        # web3-react connector setup (MetaMask, Coinbase, WalletConnect)
│
├── patches/
│   └── cephes+1.2.0.patch          # patch-package fix
│
├── package.json                     # Dependencies, scripts
├── server.js                        # Express production server (HTTPS, compression, SPA fallback)
├── server.webpack.config.js         # Webpack config for bundling server.js
├── config-overrides.js              # CRA webpack overrides (via react-app-rewired)
├── auth.js                          # Basic auth middleware (optional, password-protected)
├── prebuild.js                      # Heroku prebuild script (writes .env from env vars)
├── cache_bust.sh                    # Post-deploy cache busting
├── app.json                         # Heroku app configuration (env var definitions)
├── Procfile                         # Heroku: `web: node server.js`
├── static.json                      # Heroku static file serving config
├── .babelrc, .npmrc, .nvmrc         # Toolchain config
└── .gitignore, LICENSE, README.md
```

---

## Top-Level Summary

This is the **Influence Asset Manager** — a React SPA built by Unstoppable Games that lets players of the Influence space strategy game manage their on-chain NFT assets (Asteroids, Crewmates, Crews, Ships) and SWAY tokens across **Ethereum (L1)** and **Starknet (L2)**. It's essentially a **cross-chain bridge UI + token claim tool**.

**Tech stack:** React 17, styled-components, Zustand (state), react-query, ethers.js (L1), starknet.js (L2), web3-react (L1 wallet connectors), starknetkit (L2 wallet connectors), deployed on Heroku.

---

## Main Flows

### 1. Wallet Connection (`Connect.js` → `WalletContext.js`)

The entry point. The user picks a tab (**Assets**, **Sway**, or **Designate**) and then connects either an Ethereum or Starknet wallet.

- **L1 (Ethereum):** `useL1Wallet.js` uses `web3-react` with MetaMask, Coinbase Wallet, or WalletConnect connectors (`connectors.js`). It handles chain switching, eager reconnection, and exposes a `tx` object with `call()` and `execute()` methods for every supported contract interaction.
- **L2 (Starknet):** `useL2Wallet.js` uses `starknetkit` to connect ArgentX, Braavos, Argent Mobile, or Argent Web Wallet. Same `tx.call()`/`tx.execute()` pattern.
- `WalletContext.js` wraps both and provides them to the entire app. It also handles wallet integrity checks — if the connected address doesn't match the stored session, it deselects the account.

After connection, `api.getWalletAssets()` fetches the user's on-chain assets from the Influence backend API and populates the Zustand store (`useStore.js`).

### 2. NFT Bridging: L1 ↔ L2 (`Bridge.js`)

The core feature. Users select NFT assets (Asteroids, Crewmates, Crews, Ships) and bridge them between Ethereum and Starknet.

- **L1 → L2:** Calls `bridgeToStarknet()` on the Ethereum bridge contract (estimating the L1→L2 message fee first via Starknet RPC). The app then polls the API to track transit status until the asset owner changes on L2.
- **L2 → L1:** Calls `bridge_to_l1()` on the Starknet asset contract. This is a two-step process — after L2 confirmation, the user must wait for L1 acceptance (~6+ hours), then call `bridgeFromStarknet()` on the Ethereum bridge contract to finalize.
- Bridging status is tracked through 4 states: `0` (idle) → `1` (pending approval) → `2` (in progress) → `3` (complete).
- **Orphaned transactions** (assets stuck mid-bridge) are detected and surfaced via `OrphanDialog`.
- Before bridging from L1, the app checks for unclaimed SWAY or unminted crewmates and prompts the user to handle those first (`MintCrewmateDialog`, `ClaimSwayDialog`).
- Max 25 assets per bridge transaction.

### 3. SWAY Token Claims (`Claim.js`, `ClaimEthereum.js`, `ClaimStarknet.js`)

Users claim SWAY (the game's governance/utility token) earned through gameplay:

- **Arvad Crew Assignments** (`Claim.js`): Select asteroids and crewmates, then call `claimAssignmentSway()` on the SwayGovernor Ethereum contract. At least one crewmate must be included per claim. Max 50 assets per transaction.
- **Ethereum Testnet claims** (`ClaimEthereum.js`): Claim SWAY allocated from Ethereum testnet participation using Merkle proofs via `claimTesterPhase1Sway()`.
- **Starknet Testnet claims** (`ClaimStarknet.js`): Similar but calls `ClaimTestnetSway` on the Starknet Dispatcher contract.

### 4. SWAY Token Bridging (`BridgeSwayStarknet.js`, `BridgeSwayEthereum.js`, `ReceiveSwayEthereum.js`)

Separate from NFT bridging — this moves fungible SWAY tokens:

- **Ethereum → Starknet** (`BridgeSwayStarknet.js`): Two-step: (1) Approve SWAY spend, (2) Call `deposit()` on the SwayBridge contract with a message fee. Takes ~3 minutes.
- **Starknet → Ethereum** (`BridgeSwayEthereum.js`): Call `initiate_withdrawal()` on the Starknet Sway contract. Takes ~12 hours for L1 acceptance.
- **Receive on Ethereum** (`ReceiveSwayEthereum.js`): Finalize the L2→L1 withdrawal by calling `withdraw()` on the Ethereum SwayBridge contract.

### 5. Crew Delegation (`Bridge.js` — delegate button)

When viewing Crews on Starknet (L2), users can delegate crew control to another address by calling `DelegateCrew` via the Starknet Dispatcher contract. This is accessed through a "Delegate" button in the Bridge page's asset view.

### 6. Account Designation (`Designate.js`)

A Starknet Sepolia feature (conditionally shown). Users designate a Starknet mainnet address to receive SWAY claims earned from testnet participation. Calls the `designate()` function on a Starknet contract.

### 7. State Management (`useStore.js`)

A single Zustand store (persisted to localStorage as `influence-bridge`) holds all app state:

- Connected wallet info (`fromLayer`, `fromAccount`)
- Asset lists (`asteroids`, `crewmates`, `crews`, `ships`) with selection and bridging status
- Transaction tracking (`pendingTransactions`, `inTransit`, `orphanedTransactions`)
- UI state (`mode`, `assetTab`, `overallBridgingStatus`, `overallClaimingStatus`)
- Dispatchers for every state mutation (immer-based immutable updates)
