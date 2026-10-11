# 💸 LendMatch — AI-Powered P2P Micro-Lending Matchmaker

> **Built for the ACES Hackathon**  
> A smart, transparent web application that helps investors invest in peer-to-peer micro-loans safely using Artificial Intelligence.

---

## 🌟 What is LendMatch?

Peer-to-peer (P2P) lending gives small businesses and individuals access to quick loans. But for everyday investors, picking the right loans is hard and risky:
- *Which borrowers are likely to pay back on time?*
- *How should you split your budget across multiple loans to minimize risk?*

**LendMatch solves this.** You simply enter your budget and choose your comfort level with risk. LendMatch analyzes borrower profiles with a live Machine Learning AI model and automatically creates an optimized, diversified investment plan.

---

## ✨ Key Features (Simple & Easy)

- 🤖 **AI Risk Scoring**: Uses a real-time Machine Learning model hosted on Hugging Face to estimate each borrower's likelihood of default.
- 🎯 **Smart Budget Allocator**: Automatically spreads your budget across the best matching loans to protect your capital.
- 🚦 **Clear Color-Coded Risk Badges**:
  - 🟢 **Low Risk**: Borrowers with very low default probability ($\le 5\%$).
  - 🟡 **Moderate Risk**: Balanced risk and return ($5\% - 12\%$).
  - 🔴 **High Risk**: Higher yield, but higher risk ($> 12\%$).
- ⚡ **1-Click Demo Profiles**: Test the app immediately with preset buttons:
  - **Conservative**: Lower risk, steady returns.
  - **Balanced**: Everyday balanced portfolio.
  - **Aggressive**: Maximum yield for higher risk appetite.
- 🛡️ **Zero Budget Overrun Guarantee**: The algorithm ensures you never exceed your investment budget.
- 📊 **Interactive Architecture Diagram**: An interactive visual map of the entire system (`docs/architecture.html`).

---

## 🚀 How It Works in 3 Steps

```
   1. Set Budget & Goals       2. AI Risk Evaluation         3. Get Your Investment Plan
┌─────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────────┐
│ Enter budget (e.g. $10k)│──▶│ AI model predicts default │──▶│ Instant custom loan portfolio │
│ Choose risk tolerance   │   │ probability for borrowers │   │ with projected profit & yields│
└─────────────────────────┘   └───────────────────────────┘   └───────────────────────────────┘
```

---

## 💻 How to Run the Project Locally

You only need **Node.js** (v18 or higher) installed on your computer.

### Step 1: Clone the Repository
```bash
git clone https://github.com/bhaveshhete/ACES-Hackathon.git
cd ACES-Hackathon
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start the App
```bash
npm run dev
```

### Step 4: Open in Your Browser
Visit [http://localhost:3000](http://localhost:3000) to start using LendMatch!

---

## 🧪 Testing & Code Quality

This project is fully tested with **105 automated unit and integration tests**:

```bash
# Run all automated tests
npm run test

# Check TypeScript types (0 errors)
npm run typecheck

# Check code linting
npm run lint
```

---

## 🛠️ Built With

- **Frontend & App Framework**: [Next.js](https://nextjs.org/) (React 18), TypeScript
- **Styling**: Tailwind CSS & Modern UI Components
- **Machine Learning**: Hugging Face Spaces (`JensBender/loan-default-prediction-pipeline`) with scikit-learn
- **Backend APIs**: Next.js Server Route Handlers (plus optional standalone Python FastAPI backend in `backend/`)
- **Testing**: [Vitest](https://vitest.dev/) (105 tests passing)

---

## 📁 Project Structure at a Glance

```
├── src/
│   ├── app/                # Web pages and Next.js API routes (/api/match, /api/predict)
│   ├── components/         # Clean UI components (Cards, Sliders, Charts, Status Badges)
│   └── lib/                # Core logic: Financial math, AI adapter, Allocation engine
├── backend/                # Optional standalone Python FastAPI service
├── docs/                   # Hackathon demo script & interactive visual architecture
│   ├── demo-script.md      # 3-minute pitch & demo walkthrough for judges
│   └── architecture.html   # Visual interactive system diagram
└── package.json            # Scripts & project dependencies
```

---

## 📄 Helpful Guides

- 🎙️ [3-Minute Judge Demo Script](./docs/demo-script.md) — Step-by-step walkthrough for hackathon presentations.
- 🗺️ [Visual Architecture Diagram](./docs/architecture.html) — Double-click to open in any web browser.

---

## ⚠️ Hackathon & Financial Disclaimer

*All borrower records and financial figures displayed are synthetic for demonstration purposes. AI default probabilities are calculated by a machine learning model trained on historical data. This project is a hackathon technology demonstration and does not constitute official financial advice.*

