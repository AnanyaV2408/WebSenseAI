# 🕷️ WebSense AI — Multi-Agent Financial Intelligence System

> **HACKVERSE 2026 — PS-01**

WebSense AI is a multi-agent financial intelligence platform designed to help retail investors understand market signals through **parallel AI agents, retrieval-augmented generation (RAG), and risk-aware personalization**.

Instead of relying on a single AI response, WebSense AI separates financial analysis into specialized agents and combines their structured outputs through a synthesis layer.

> ⚠️ **Disclaimer:** WebSense AI is a hackathon prototype for financial research and demonstration. It is not financial advice.

---

# 🚀 The Problem

Financial information is fragmented across:

- Price and technical indicators
- Trading volume
- News and sentiment
- Company fundamentals
- Regulatory documents
- Individual investor risk profiles

A single generic recommendation does not adequately account for these independent signals or the investor receiving the recommendation.

## Our Approach

WebSense AI creates a transparent reasoning pipeline:

**Market Evidence → Parallel Specialist Agents → RAG Evidence → Synthesis → Personalized Recommendation**

---

# 🧠 System Architecture

```mermaid
flowchart TD

    A[Market Data] --> B[Analysis Orchestrator]

    B --> C[Momentum / Technical Agent]
    B --> D[Volume / Market Activity Agent]
    B --> E[Sentiment & Fundamentals Agent]

    C --> F[Structured Agent Outputs]
    D --> F
    E --> F

    R[Financial & Regulatory Documents] --> S[Document Chunking]
    S --> T[Retrieval / Vector Search]
    T --> E

    F --> G[Synthesis Agent]

    U[User Risk Profile] --> G
    V[Investment Horizon] --> G
    W[Portfolio Holdings & Concentration] --> G

    G --> X[Personalized Recommendation]

    X --> Y[Dashboard]
    F --> Y
    T --> Y


