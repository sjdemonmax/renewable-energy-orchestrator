# Agentic Renewable Energy Orchestrator

This repository contains the working prototype for the ET AI Hackathon (Problem Statement 4: Utilities).

## Architecture Overview
Our solution is a browser-based, Multi-Agent Orchestrator designed to handle the volatility of renewable energy integration (solar, wind, batteries) into the power grid. It operates on 15-minute cycles ("ticks") and balances competing objectives (Profit vs. Grid Stability).

### Multi-Agent System
1. **Forecasting Agent**: Ingests telemetry and simulates normal grid variances and extreme weather chaos.
2. **Strategy Agent**: Dynamically alters the Optimality Criteria weights based on the state of the grid.
3. **Simulation & Orchestrator Agent**: Formulates candidate action clusters, validates them against strict physical constraints, and executes the optimal cluster.

## 9-Blocker Grid Justification
*   **Depth (D3)**: Handles heterogeneous, volatile inputs with demonstrable reliability through a deterministic physical constraint layer (ensuring the AI cannot hallucinate dangerous commands).
*   **Features (F3)**: Determines optimal *clusters* of actions (F1), adjusts optimality criteria dynamically for uncertainty (F2), and uses simulated look-ahead logic before execution (F3).

## How to Run the Demo
This prototype is a pure static web application. No complex backend or build steps are required.
1. Clone this repository to your local machine.
2. Open the `index.html` file in any modern web browser.
3. Use the **Simulation Controls** on the right side of the dashboard to trigger ticks or inject chaos (Price Spikes, Cloud Cover).
