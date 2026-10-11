// engine.js - Multi-Agent Renewable Energy Orchestrator

class State {
    constructor() {
        this.solar = { max: 200, current: 150, forecast: 'Clear Sky' }; // 5 farms (MW)
        this.wind = { max: 120, current: 80, forecast: 'Steady' };     // 3 farms (MW)
        this.battery = { capacity: 100, soc: 60.0, status: 'Standby', maxChargeRate: 20, maxDischargeRate: 20 }; // % SOC & MW
        this.grid = { demand: 200, price: 45.00 };                     // MW & $/MWh
        this.tickCount = 0;
        this.time = "08:00";
        this.activeChaos = {
            cloud: false,
            wind: false,
            spike: false,
            demand: false
        };
    }

    advanceTime() {
        this.tickCount++;
        let [hours, minutes] = this.time.split(':').map(Number);
        minutes += 15;
        if (minutes >= 60) {
            minutes = 0;
            hours = (hours + 1) % 24;
        }
        this.time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    resetBaseline() {
        this.solar = { max: 200, current: 150, forecast: 'Clear Sky' };
        this.wind = { max: 120, current: 80, forecast: 'Steady' };
        this.battery = { capacity: 100, soc: 60.0, status: 'Standby', maxChargeRate: 20, maxDischargeRate: 20 };
        this.grid = { demand: 200, price: 45.00 };
        this.time = "08:00";
        this.tickCount = 0;
        this.activeChaos = { cloud: false, wind: false, spike: false, demand: false };
    }
}

class ForecastingAgent {
    applyNormalVariance(state) {
        // 1. Solar generation variance
        if (state.activeChaos.cloud) {
            // Constrained to storm levels (~42 - 48 MW)
            state.solar.forecast = 'Severe Cloud Shock';
            state.solar.current = Math.min(52, Math.max(38, state.solar.current + (Math.random() * 4 - 2)));
        } else {
            // Normal daylight curve (~142 - 158 MW)
            state.solar.forecast = 'Clear Sky';
            state.solar.current = Math.min(state.solar.max, Math.max(130, state.solar.current + (Math.random() * 8 - 4)));
        }

        // 2. Wind generation variance
        if (state.activeChaos.wind) {
            // High gale output (~115 - 120 MW)
            state.wind.forecast = 'Gale Front Surge';
            state.wind.current = Math.min(state.wind.max, Math.max(114, state.wind.current + (Math.random() * 4 - 2)));
        } else {
            // Normal steady wind (~74 - 86 MW)
            state.wind.forecast = 'Steady';
            state.wind.current = Math.min(95, Math.max(68, state.wind.current + (Math.random() * 6 - 3)));
        }

        // 3. Grid Demand variance
        if (state.activeChaos.demand) {
            // Heavy industrial surge (~315 - 325 MW)
            state.grid.demand = Math.min(335, Math.max(305, state.grid.demand + (Math.random() * 6 - 3)));
        } else {
            // Nominal grid baseline (~192 - 208 MW)
            state.grid.demand = Math.min(215, Math.max(188, state.grid.demand + (Math.random() * 6 - 3)));
        }

        // 4. Market Price variance
        if (state.activeChaos.spike) {
            // High LMP price spike ($340 - $360 / MWh)
            state.grid.price = Math.max(335, Math.min(365, state.grid.price + (Math.random() * 6 - 3)));
        } else {
            // Correlate with net demand loosely around $40 - $55 / MWh
            let renewableTotal = state.solar.current + state.wind.current;
            let netDemand = state.grid.demand - renewableTotal;
            let basePrice = 42 + (netDemand * 0.15) + (Math.random() * 4 - 2);
            state.grid.price = Math.max(25, Math.min(65, basePrice));
        }
    }
}

class StrategyAgent {
    determineCriteria(state) {
        let criteria = { profit: 50, stability: 50, lifespan: 50 };

        let renewableTotal = state.solar.current + state.wind.current;
        let netLoad = state.grid.demand - renewableTotal;

        // RULE 1: Extreme Price Spike -> Prioritize Profit Max (98%)
        if (state.activeChaos.spike || state.grid.price >= 250) {
            criteria.profit = 98;
            criteria.stability = 80; // Keep grid stable during dispatch
            criteria.lifespan = 25;  // Willing to cycle battery to capture $350/MWh
        }
        // RULE 2: Severe Supply Deficit (e.g. Cloud Shock or Demand Surge)
        else if (state.activeChaos.cloud || state.activeChaos.demand || netLoad > 50) {
            criteria.stability = 95; // Grid frequency and blackout prevention is #1
            criteria.profit = 35;
            criteria.lifespan = state.battery.soc <= 20 ? 85 : 55;
        }
        // RULE 3: Substantial Renewable Surplus (e.g. Wind Surge)
        else if (state.activeChaos.wind || netLoad < -70) {
            criteria.profit = 70;    // Monetize clean power export
            criteria.stability = 75;
            criteria.lifespan = 85;  // Smoothly charge battery at optimal C-rate
        }
        // RULE 4: Nominal Balanced Grid
        else {
            criteria.profit = 55;
            criteria.stability = 60;
            criteria.lifespan = 65;
        }

        // PHYSICAL CONSTRAINT OVERRIDE: Protect battery degradation if SOC reaches boundaries
        if (state.battery.soc <= 15) {
            criteria.lifespan = Math.max(criteria.lifespan, 95); // Lock down battery to avoid deep discharge
        } else if (state.battery.soc >= 92) {
            criteria.lifespan = Math.max(criteria.lifespan, 90); // Protect against overcharging
        }

        return criteria;
    }
}

class ActionOrchestrator {
    constructor() {
        this.lastActions = [];
    }

    formulateCluster(state, criteria) {
        let actions = [];
        let renewableTotal = state.solar.current + state.wind.current;
        let netLoad = state.grid.demand - renewableTotal; // Positive = deficit, Negative = surplus

        // Physical limits
        const SOC_MIN_FLOOR = 5.0; // Never allow battery below 5%
        const SOC_MAX_CEILING = 95.0; // Never allow battery above 95%

        // SCENARIO A: Market Price Spike Active (Arbitrage Opportunity)
        if (criteria.profit >= 90) {
            if (state.battery.soc > 15) {
                // Discharge maximum rate into high-value market
                let availableCapacity = state.battery.soc - SOC_MIN_FLOOR;
                let dischargeAmt = Math.min(state.battery.maxDischargeRate, availableCapacity);
                
                state.battery.soc = Math.max(SOC_MIN_FLOOR, state.battery.soc - dischargeAmt);
                state.battery.status = `Discharging (${dischargeAmt.toFixed(1)} MW)`;
                actions.push(`⚡ Discharge Battery (${dischargeAmt.toFixed(1)} MW) at $${state.grid.price.toFixed(0)}/MWh`);

                let netAfterBattery = netLoad - dischargeAmt;
                if (netAfterBattery > 0) {
                    actions.push(`🔌 Import Residual Load (${netAfterBattery.toFixed(1)} MW)`);
                } else if (netAfterBattery < 0) {
                    actions.push(`💰 Export Wholesale Power (+${Math.abs(netAfterBattery).toFixed(1)} MW)`);
                }
                actions.push(`📈 Peak Arbitrage Captured (+$${(dischargeAmt * state.grid.price).toFixed(0)}/h revenue)`);
            } else {
                // Battery reached safety floor
                state.battery.status = 'Protected Floor (SOC 5%)';
                actions.push(`🛡️ BESS Floor Lock (5% SOC protected from degradation)`);
                actions.push(`🔌 Market Power Import (${netLoad.toFixed(1)} MW)`);
            }
        }
        // SCENARIO B: Renewable Deficit (Demand > Generation)
        else if (netLoad > 0) {
            if (state.battery.soc > 15) {
                // Battery provides buffer support
                let availableCapacity = state.battery.soc - SOC_MIN_FLOOR;
                let dischargeAmt = Math.min(state.battery.maxDischargeRate, netLoad, availableCapacity);
                
                state.battery.soc = Math.max(SOC_MIN_FLOOR, state.battery.soc - dischargeAmt);
                state.battery.status = `Discharging (${dischargeAmt.toFixed(1)} MW)`;
                actions.push(`⚡ Buffer Discharge (${dischargeAmt.toFixed(1)} MW)`);

                let remainingDeficit = netLoad - dischargeAmt;
                if (remainingDeficit > 0) {
                    actions.push(`🔌 Import Balance from Grid (${remainingDeficit.toFixed(1)} MW at $${state.grid.price.toFixed(2)})`);
                }
                actions.push(`🛡️ Grid Stability Sustained (N-1 Safe)`);
            } else {
                // Battery depleted / at safety reserve floor
                state.battery.status = 'Reserve Hold (SOC 5%)';
                actions.push(`🛡️ Battery Reserve Protection Engaged (5.0% floor hold)`);
                actions.push(`🔌 Firm Grid Import (${netLoad.toFixed(1)} MW at $${state.grid.price.toFixed(2)})`);
                actions.push(`⚠️ Load Demand Covered 100% (Zero Blackout)`);
            }
        }
        // SCENARIO C: Renewable Surplus (Generation > Demand)
        else if (netLoad < 0) {
            let surplus = Math.abs(netLoad);
            if (state.battery.soc < SOC_MAX_CEILING) {
                let headroom = SOC_MAX_CEILING - state.battery.soc;
                let chargeAmt = Math.min(state.battery.maxChargeRate, surplus, headroom);

                state.battery.soc = Math.min(SOC_MAX_CEILING, state.battery.soc + chargeAmt);
                state.battery.status = `Charging (+${chargeAmt.toFixed(1)} MW)`;
                actions.push(`🔋 Fast Charge Battery (+${chargeAmt.toFixed(1)} MW Clean Energy)`);

                let remainingSurplus = surplus - chargeAmt;
                if (remainingSurplus > 0) {
                    actions.push(`💰 Export Surplus to Grid (+${remainingSurplus.toFixed(1)} MW at $${state.grid.price.toFixed(2)})`);
                }
                actions.push(`🌿 Zero Carbon Curtailment Achieved`);
            } else {
                // Battery full
                state.battery.status = 'Fully Charged (95% Saturation)';
                actions.push(`🔋 Battery Saturation Hold (95% upper limit preserved)`);
                actions.push(`💰 Export Clean Generation (+${surplus.toFixed(1)} MW)`);
            }
        }
        // SCENARIO D: Equilibrium
        else {
            state.battery.status = 'Standby';
            actions.push(`⚖️ Grid In Equilibrium (Net Δ: 0.0 MW)`);
            actions.push(`🔄 Spinning Reserves Calibrated`);
        }

        // Clamp battery strictly
        state.battery.soc = Math.max(SOC_MIN_FLOOR, Math.min(SOC_MAX_CEILING, Math.round(state.battery.soc * 10) / 10));

        this.lastActions = actions;
        return actions;
    }
}

class OrchestratorEngine {
    constructor(uiCallback) {
        this.state = new State();
        this.forecaster = new ForecastingAgent();
        this.strategy = new StrategyAgent();
        this.orchestrator = new ActionOrchestrator();
        this.uiCallback = uiCallback;
    }

    tick() {
        this.uiCallback({ type: 'log', subtype: 'system', msg: `--- Tick ${this.state.tickCount + 1} (${this.state.time}) Initiated ---` });
        
        this.state.advanceTime();
        this.forecaster.applyNormalVariance(this.state);
        
        let criteria = this.strategy.determineCriteria(this.state);
        let renewableTotal = (this.state.solar.current + this.state.wind.current).toFixed(1);
        let netLoad = (this.state.grid.demand - (this.state.solar.current + this.state.wind.current)).toFixed(1);

        this.uiCallback({ 
            type: 'log', 
            subtype: 'thought', 
            msg: `[PERCEPTION] Total Gen: ${renewableTotal} MW (Solar ${this.state.solar.current.toFixed(0)} MW, Wind ${this.state.wind.current.toFixed(0)} MW) | Demand: ${this.state.grid.demand.toFixed(0)} MW | Net Δ: ${netLoad} MW | Price: $${this.state.grid.price.toFixed(2)}` 
        });

        this.uiCallback({
            type: 'log',
            subtype: 'thought',
            msg: `[STRATEGY] Optimality Weights -> Profit: ${criteria.profit}% | Stability: ${criteria.stability}% | Lifespan: ${criteria.lifespan}%`
        });

        let actions = this.orchestrator.formulateCluster(this.state, criteria);
        this.uiCallback({ type: 'log', subtype: 'action', msg: `[ORCHESTRATOR] Cluster: ${actions.join(' | ')}` });

        // Update UI
        this.uiCallback({ 
            type: 'update', 
            state: this.state, 
            criteria: criteria, 
            actions: actions,
            activeChaos: this.state.activeChaos 
        });
    }

    toggleChaos(type) {
        const isCurrentlyActive = !!this.state.activeChaos[type];
        const nextState = !isCurrentlyActive;
        this.state.activeChaos[type] = nextState;

        if (nextState) {
            // Turning ON
            switch(type) {
                case 'cloud':
                    this.state.solar.forecast = 'Severe Cloud Shock';
                    this.state.solar.current = 45; // 70% immediate reduction
                    this.uiCallback({ type: 'log', subtype: 'alert', msg: `🚨 PERTURBATION ACTIVATED: Severe Cloud Cover (-70% Solar). Generation curtailed to 45.0 MW.` });
                    break;
                case 'wind':
                    this.state.wind.forecast = 'Gale Front Surge';
                    this.state.wind.current = 120; // Max capacity
                    this.uiCallback({ type: 'log', subtype: 'alert', msg: `🚨 PERTURBATION ACTIVATED: Gale Wind Surge. Turbines operating at 120.0 MW (100% capacity).` });
                    break;
                case 'spike':
                    this.state.grid.price = 350.00; // Extreme price spike
                    this.uiCallback({ type: 'log', subtype: 'alert', msg: `🚨 MARKET VOLATILITY ACTIVATED: LMP Price Surge detected at $350.00/MWh! Peak arbitrage window open.` });
                    break;
                case 'demand':
                    this.state.grid.demand = 320; // Industrial spike
                    this.uiCallback({ type: 'log', subtype: 'alert', msg: `🚨 DEMAND SHOCK ACTIVATED: Industrial load surge (+120 MW). Total grid demand is now 320.0 MW.` });
                    break;
            }
        } else {
            // Turning OFF
            switch(type) {
                case 'cloud':
                    this.state.solar.forecast = 'Clear Sky';
                    this.state.solar.current = 150;
                    this.uiCallback({ type: 'log', subtype: 'alert', msg: `☁️ PERTURBATION CLEARED: Storm cloud passed. Solar output restored to 150.0 MW nominal.` });
                    break;
                case 'wind':
                    this.state.wind.forecast = 'Steady';
                    this.state.wind.current = 80;
                    this.uiCallback({ type: 'log', subtype: 'alert', msg: `💨 PERTURBATION CLEARED: Gale front passed. Wind output restored to 80.0 MW baseline.` });
                    break;
                case 'spike':
                    this.state.grid.price = 45.00;
                    this.uiCallback({ type: 'log', subtype: 'alert', msg: `📈 MARKET NORMALIZED: Wholesale price stabilized to $45.00/MWh spot rate.` });
                    break;
                case 'demand':
                    this.state.grid.demand = 200;
                    this.uiCallback({ type: 'log', subtype: 'alert', msg: `🏭 DEMAND NORMALIZED: Industrial load returned to 200.0 MW baseline.` });
                    break;
            }
        }

        // Immediately evaluate tick so UI and state update in the exact same event loop
        this.tick();
    }

    resetAll() {
        this.state.resetBaseline();
        this.uiCallback({ type: 'log', subtype: 'system', msg: `🔄 SYSTEM RESET: All scenarios cleared. Telemetry and battery returned to initial equilibrium.` });
        this.tick();
    }
}

// Export for UI binding
window.OrchestratorEngine = OrchestratorEngine;
