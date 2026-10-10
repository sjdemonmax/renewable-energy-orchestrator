// engine.js

class State {
    constructor() {
        this.solar = { max: 200, current: 150, forecast: 'Clear' }; // 5 farms (MW)
        this.wind = { max: 120, current: 80, forecast: 'Steady' }; // 3 farms (MW)
        this.battery = { capacity: 100, soc: 60, status: 'Idle', maxChargeRate: 20, maxDischargeRate: 20 }; // 2 systems (% and MW)
        this.grid = { demand: 200, price: 45 }; // MW and $/MWh
        this.tickCount = 0;
        this.time = "08:00";
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
}

class ForecastingAgent {
    applyNormalVariance(state) {
        // Natural fluctuations
        if (state.solar.forecast !== 'Cloudy') {
            state.solar.current = Math.min(state.solar.max, Math.max(0, state.solar.current + (Math.random() * 10 - 5)));
        }
        if (state.wind.forecast !== 'Surge') {
            state.wind.current = Math.min(state.wind.max, Math.max(0, state.wind.current + (Math.random() * 20 - 10)));
        }
        
        // Demand fluctuates slowly
        state.grid.demand = Math.max(100, state.grid.demand + (Math.random() * 10 - 5));
        
        // Price correlates with demand and renewables availability loosely
        if (state.grid.price < 200) { // If not spiked
            let renewableTotal = state.solar.current + state.wind.current;
            let netDemand = state.grid.demand - renewableTotal;
            state.grid.price = Math.max(20, 30 + (netDemand * 0.5) + (Math.random() * 5));
        }
    }
}

class StrategyAgent {
    determineCriteria(state) {
        let criteria = { profit: 50, stability: 50, lifespan: 50 };
        
        // If price is very high, maximize profit
        if (state.grid.price > 100) {
            criteria.profit = 90;
            criteria.lifespan = 30; // willing to degrade battery
        }
        
        // If supply is critically low compared to demand, max stability
        let renewableTotal = state.solar.current + state.wind.current;
        if (renewableTotal + state.battery.maxDischargeRate < state.grid.demand) {
            criteria.stability = 100;
            criteria.profit = 20; // profit is secondary to keeping lights on
        }

        // If battery is low or high, protect lifespan
        if (state.battery.soc < 20 || state.battery.soc > 90) {
            criteria.lifespan = 90;
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
        let netLoad = state.grid.demand - renewableTotal;

        // F3: Scenario simulation (simplified deterministic checks)
        // Check 1: Do we need to discharge battery or buy power?
        if (netLoad > 0) {
            if (criteria.profit > 70 && state.battery.soc > 20) {
                // High price, sell/discharge
                let dischargeAmt = Math.min(state.battery.maxDischargeRate, (state.battery.soc / 100) * state.battery.capacity);
                actions.push(`Discharge Battery (${dischargeAmt.toFixed(1)} MW)`);
                state.battery.soc -= (dischargeAmt / state.battery.capacity) * 100;
                state.battery.status = 'Discharging';
            } else if (criteria.stability > 80 && state.battery.soc > 10) {
                // Emergency discharge for stability
                actions.push(`Emergency Discharge Battery (Max)`);
                state.battery.soc -= (state.battery.maxDischargeRate / state.battery.capacity) * 100;
                state.battery.status = 'Discharging';
            } else {
                // Buy from grid
                actions.push(`Buy Power from Market (${netLoad.toFixed(1)} MW at $${state.grid.price.toFixed(2)})`);
                state.battery.status = 'Idle';
            }
        } 
        // Check 2: Do we have excess power to charge or sell?
        else if (netLoad < 0) {
            let excess = Math.abs(netLoad);
            if (criteria.lifespan > 70 || criteria.profit > 70) {
                // Sell if profit high, or charge if lifespan/soc needs it
                if (state.battery.soc < 95) {
                    let chargeAmt = Math.min(state.battery.maxChargeRate, excess);
                    actions.push(`Charge Battery (${chargeAmt.toFixed(1)} MW)`);
                    state.battery.soc += (chargeAmt / state.battery.capacity) * 100;
                    state.battery.status = 'Charging';
                    excess -= chargeAmt;
                }
            }
            if (excess > 0 && state.grid.price > 30) {
                actions.push(`Sell Excess Power (${excess.toFixed(1)} MW)`);
            } else if (excess > 0) {
                actions.push(`Curtail Renewables (${excess.toFixed(1)} MW)`);
                // Curtail wind first (often easier than solar in some grids)
                state.wind.current -= excess * 0.5;
                state.solar.current -= excess * 0.5;
            }
        } else {
             state.battery.status = 'Idle';
        }

        if (actions.length === 0) {
            actions.push("Hold state. Grid balanced.");
        }

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
        this.uiCallback = uiCallback; // Function to call when state updates
        this.autoRunInterval = null;
    }

    tick() {
        this.uiCallback({ type: 'log', subtype: 'system', msg: `--- Tick ${this.state.tickCount + 1} Initiated ---` });
        
        this.state.advanceTime();
        this.forecaster.applyNormalVariance(this.state);
        
        let criteria = this.strategy.determineCriteria(this.state);
        this.uiCallback({ type: 'log', subtype: 'thought', msg: `Evaluated State: Net Load = ${(this.state.grid.demand - (this.state.solar.current + this.state.wind.current)).toFixed(1)} MW. Price = $${this.state.grid.price.toFixed(2)}.` });
        
        let actions = this.orchestrator.formulateCluster(this.state, criteria);
        this.uiCallback({ type: 'log', subtype: 'action', msg: `Executing Cluster: ${actions.join(' | ')}` });

        // Reset forecasts if they were altered by chaos
        if(this.state.solar.forecast === 'Cloudy' && Math.random() > 0.5) { this.state.solar.forecast = 'Clear'; this.state.solar.current = 150; }
        if(this.state.wind.forecast === 'Surge' && Math.random() > 0.5) { this.state.wind.forecast = 'Steady'; this.state.wind.current = 80; }
        if(this.state.grid.price > 150 && Math.random() > 0.3) { this.state.grid.price = 50; }

        this.uiCallback({ type: 'update', state: this.state, criteria: criteria, actions: actions });
    }

    injectChaos(type) {
        this.uiCallback({ type: 'log', subtype: 'alert', msg: `EXTERNAL EVENT: ${type.toUpperCase()}` });
        switch(type) {
            case 'cloud':
                this.state.solar.forecast = 'Cloudy';
                this.state.solar.current *= 0.3; // 70% drop
                break;
            case 'wind':
                this.state.wind.forecast = 'Surge';
                this.state.wind.current = this.state.wind.max;
                break;
            case 'spike':
                this.state.grid.price = 350; // Huge price spike
                break;
            case 'demand':
                this.state.grid.demand += 100;
                break;
        }
        // Force an immediate tick evaluation on chaos
        this.tick();
    }
}

// Export for UI binding
window.OrchestratorEngine = OrchestratorEngine;
