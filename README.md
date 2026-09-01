# 🕷️ WebSense AI
## Multi-Agent Financial Intelligence System

### HACKVERSE 2026 — PS-01

WebSense AI is a **multi-agent financial intelligence platform** designed to help retail investors understand market behaviour through multiple independent AI agents.

Instead of relying on a single black-box AI response, WebSense AI separates financial analysis into specialized agents for **technical momentum, market activity, sentiment, and fundamentals/regulatory evidence**.

These agents operate in parallel, retrieve supporting evidence where required, and pass their structured outputs to a **Synthesis Agent** that generates a transparent and personalized market interpretation.

> ⚠️ **Disclaimer:** WebSense AI is a hackathon prototype intended for research and demonstration. It does not provide financial advice or guaranteed investment recommendations.

---

# 🚀 The Problem

Retail investors often have to analyze information from many different sources:

- Price movements
- Technical indicators
- Trading volume
- News
- Market sentiment
- Company fundamentals
- Regulatory information
- Portfolio concentration
- Personal risk tolerance

The challenge is not simply finding this information — it is **connecting all of it together and understanding what it means for a particular investor**.

A generic AI-generated answer can also hide its reasoning and provide little visibility into the evidence behind a conclusion.

### Our Goal

WebSense AI addresses this by creating a transparent pipeline where:

**Market Evidence → Specialist Agents → Retrieved Evidence → Synthesis → Personalized Insight**

Every major stage can be inspected through the dashboard.

---

# 💡 Our Solution

WebSense AI combines four major ideas:

### 1. Multi-Agent Intelligence

Different agents specialize in different aspects of financial analysis.

### 2. Retrieval-Augmented Generation

Relevant financial and regulatory documents are retrieved to ground agent reasoning in source material.

### 3. Risk-Aware Personalization

The same market evidence can be interpreted differently for Conservative, Moderate, and Aggressive investors.

### 4. Transparent Synthesis

A final synthesis layer combines all available evidence and explicitly shows agreement, disagreement, confidence, risks, and missing information.

---

# 🧠 Complete System Architecture

```mermaid
flowchart TD

    A["👤 User"] --> B["🖥️ WebSense AI Dashboard"]

    B --> C["🎯 User Profile<br/>Risk • Horizon • Portfolio"]

    B --> D["📈 Selected Stock / Ticker"]

    D --> E["📥 Market Data Ingestion"]

    E --> F["⚙️ Multi-Agent Orchestrator"]

    F --> G["📈 Momentum / Technical Agent"]
    F --> H["📊 Volume / Market Activity Agent"]
    F --> I["📰 Sentiment Agent"]
    F --> J["🏦 Fundamentals / Regulatory Agent"]

    K["📚 Financial & Regulatory Documents"] --> L["🔎 RAG Retrieval"]
    L --> J
    L --> I

    G --> M["📦 Structured Agent Outputs"]
    H --> M
    I --> M
    J --> M

    M --> N["🧠 Synthesis Agent"]

    C --> N

    N --> O["🎯 Personalized Recommendation"]

    O --> P["📊 Signal + Confidence"]
    O --> Q["💡 Supporting Factors"]
    O --> R["⚠️ Risks & Missing Evidence"]
    O --> S["🔗 Citations / Sources"]

    O --> T["💾 Persist Analysis Session"]

    T --> U["📈 Performance Log"]

    P --> B
    Q --> B
    R --> B
    S --> B
    U --> B

