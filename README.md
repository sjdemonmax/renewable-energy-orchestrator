# Agentic Renewable Energy Orchestrator

This repository contains the working prototype for the ET AI Hackathon (Problem Statement 4: Utilities - Renewable energy orchestrator).

## Architecture Overview
Our solution is a browser-based, Multi-Agent Orchestrator designed to handle the volatility of renewable energy integration (solar, wind, batteries) into the power grid. It operates on 15-minute cycles ("ticks") and balances competing objectives (Profit vs. Grid Stability).

### Multi-Agent System
1. **Forecasting Agent**: Ingests telemetry and simulates normal grid variances and extreme weather chaos.
2. **Strategy Agent**: Dynamically alters the Optimality Criteria weights based on the state of the grid.
3. **Simulation & Orchestrator Agent**: Formulates candidate action clusters, validates them against strict physical constraints, and executes the optimal cluster.

## 9-Blocker Grid Justification
*   **Depth (D3)**: Handles heterogeneous, volatile inputs with demonstrable reliability through a deterministic physical constraint layer (ensuring the AI cannot hallucinate dangerous commands).
*   **Features (F3)**: Determines optimal *clusters* of actions (F1), adjusts optimality criteria dynamically for uncertainty (F2), and uses simulated look-ahead logic before execution (F3).

---

## Installation Steps & Environment Setup
This prototype is a pure client-side web application designed for maximum portability and ease of execution for the judges. There is no complex backend, database, or build pipeline required.

**To run the project:**
1. Clone this repository to your local machine:
   ```bash
   git clone <YOUR-GITHUB-REPO-URL>
   cd renewable-orchestrator
   ```
2. Open the `index.html` file in any modern web browser (Chrome, Firefox, Safari, Edge).
   * *Option A:* Simply double-click the `index.html` file in your file explorer.
   * *Option B:* If you prefer a local server, run `python3 -m http.server 8080` in the directory and navigate to `http://localhost:8080` in your browser.

## Dependencies
*   **Zero External Dependencies:** This project is built using 100% Vanilla JavaScript, HTML5, and CSS3. 
*   It does not require Node.js, npm, or any external libraries/frameworks (like React or Vue) to run.
*   **Fonts:** It uses Google Fonts (Inter) via a standard CDN link in the HTML head.

## API Documentation
*   **N/A - Client-Side Simulation:** As this is a standalone prototype demonstrating agentic logic, all "API" interactions between the agents (Forecasting, Strategy, Orchestrator) are handled internally via JavaScript class methods within `engine.js`. There are no external REST APIs required to run the simulation.

---

## How to Use the Dashboard
Once the `index.html` file is open in your browser:
1. **Observe the Telemetry:** The left panel shows the current state of Solar, Wind, Batteries, and Grid Demand.
2. **Start the Engine:** Click the **"Auto Run"** button on the right panel to begin the 15-minute tick simulation.
3. **Inject Chaos (Uncertainty):** Use the buttons on the right to simulate real-world volatility:
    *   *Cloud Cover:* Drops solar output drastically.
    *   *Wind Surge:* Maxes out wind generation.
    *   *Price Spike:* Simulates a surge in market electricity prices.
4. **Watch the Agent Think:** Observe the center panel to see the "Chain of Thought" as the Strategy Agent adjusts its criteria (Profit vs. Stability) and the Orchestrator selects action clusters based on your injected chaos.
