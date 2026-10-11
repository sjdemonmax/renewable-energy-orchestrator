// ui.js - Frontend Orchestrator Controller & DOM Bindings

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const els = {
        time: document.getElementById('current-time'),
        tickCount: document.getElementById('tick-count'),
        systemStatus: document.getElementById('system-status'),
        
        // Solar
        valSolar: document.getElementById('val-solar'),
        barSolar: document.getElementById('bar-solar'),
        forSolar: document.getElementById('forecast-solar'),
        badgeSolar: document.getElementById('badge-solar'),
        
        // Wind
        valWind: document.getElementById('val-wind'),
        barWind: document.getElementById('bar-wind'),
        forWind: document.getElementById('forecast-wind'),
        badgeWind: document.getElementById('badge-wind'),
        
        // Battery
        valBattery: document.getElementById('val-battery'),
        barBattery: document.getElementById('bar-battery'),
        statBattery: document.getElementById('status-battery'),
        badgeBattery: document.getElementById('badge-battery'),
        
        // Grid
        valDemand: document.getElementById('val-demand'),
        barDemand: document.getElementById('bar-demand'),
        valPrice: document.getElementById('val-price'),
        badgeGrid: document.getElementById('badge-grid'),
        
        // Criteria
        critProfit: document.getElementById('crit-profit'),
        valCritProfit: document.getElementById('val-crit-profit'),
        critStability: document.getElementById('crit-stability'),
        valCritStability: document.getElementById('val-crit-stability'),
        critLifespan: document.getElementById('crit-lifespan'),
        valCritLifespan: document.getElementById('val-crit-lifespan'),
        
        // Logs & Actions
        logContainer: document.getElementById('agent-log'),
        lastActions: document.getElementById('last-action-list'),
        
        // Main Controls
        btnTick: document.getElementById('btn-tick'),
        btnAuto: document.getElementById('btn-auto'),
        
        // Chaos Buttons
        btnChaosCloud: document.getElementById('btn-chaos-cloud'),
        btnChaosWind: document.getElementById('btn-chaos-wind'),
        btnChaosSpike: document.getElementById('btn-chaos-spike'),
        btnChaosDemand: document.getElementById('btn-chaos-demand'),
        btnChaosReset: document.getElementById('btn-chaos-reset'),
    };

    let autoRunInterval = null;

    // Callback from OrchestratorEngine
    function engineCallback(event) {
        if (event.type === 'log') {
            appendLog(event.msg, event.subtype);
        } else if (event.type === 'update') {
            updateUI(event.state, event.criteria, event.actions, event.activeChaos);
        }
    }

    const engine = new window.OrchestratorEngine(engineCallback);

    function updateUI(state, criteria, actions, activeChaos = {}) {
        // Time & Tick
        els.time.textContent = state.time;
        els.tickCount.textContent = state.tickCount;

        // Solar
        els.valSolar.textContent = state.solar.current.toFixed(0);
        els.barSolar.style.width = `${Math.min(100, (state.solar.current / state.solar.max) * 100)}%`;
        els.forSolar.textContent = state.solar.forecast;
        
        if (activeChaos.cloud) {
            els.badgeSolar.textContent = 'Storm (-70%)';
            els.badgeSolar.className = 'card-badge orange';
        } else {
            els.badgeSolar.textContent = 'Clear Sky';
            els.badgeSolar.className = 'card-badge';
        }

        // Wind
        els.valWind.textContent = state.wind.current.toFixed(0);
        els.barWind.style.width = `${Math.min(100, (state.wind.current / state.wind.max) * 100)}%`;
        els.forWind.textContent = state.wind.forecast;

        if (activeChaos.wind) {
            els.badgeWind.textContent = 'Gale Surge';
            els.badgeWind.className = 'card-badge blue';
        } else {
            els.badgeWind.textContent = 'Steady';
            els.badgeWind.className = 'card-badge';
        }

        // Battery
        els.valBattery.textContent = state.battery.soc.toFixed(1);
        els.barBattery.style.width = `${Math.min(100, state.battery.soc)}%`;
        els.statBattery.textContent = state.battery.status;

        if (state.battery.status.includes('Discharging')) {
            els.badgeBattery.textContent = 'Discharging';
            els.badgeBattery.className = 'card-badge red';
        } else if (state.battery.status.includes('Charging')) {
            els.badgeBattery.textContent = 'Charging';
            els.badgeBattery.className = 'card-badge green';
        } else if (state.battery.status.includes('Floor')) {
            els.badgeBattery.textContent = 'Floor Lock (5%)';
            els.badgeBattery.className = 'card-badge orange';
        } else {
            els.badgeBattery.textContent = 'Standby';
            els.badgeBattery.className = 'card-badge purple';
        }

        // Grid
        els.valDemand.textContent = state.grid.demand.toFixed(0);
        els.barDemand.style.width = `${Math.min(100, (state.grid.demand / 400) * 100)}%`;
        els.valPrice.textContent = state.grid.price.toFixed(2);

        if (activeChaos.spike || state.grid.price > 200) {
            els.badgeGrid.textContent = 'Price Spike 🚨';
            els.badgeGrid.className = 'card-badge green';
            els.valPrice.style.color = '#34d399';
        } else if (activeChaos.demand) {
            els.badgeGrid.textContent = 'Heavy Load 🏭';
            els.badgeGrid.className = 'card-badge red';
            els.valPrice.style.color = 'var(--text-main)';
        } else {
            els.badgeGrid.textContent = 'Normal';
            els.badgeGrid.className = 'card-badge';
            els.valPrice.style.color = 'var(--text-main)';
        }

        // Criteria Bars & Numerical Percentages
        els.critProfit.style.width = `${criteria.profit}%`;
        els.valCritProfit.textContent = `${criteria.profit}%`;

        els.critStability.style.width = `${criteria.stability}%`;
        els.valCritStability.textContent = `${criteria.stability}%`;

        els.critLifespan.style.width = `${criteria.lifespan}%`;
        els.valCritLifespan.textContent = `${criteria.lifespan}%`;

        // Update Button Active Toggles
        updateChaosButtonState(els.btnChaosCloud, !!activeChaos.cloud);
        updateChaosButtonState(els.btnChaosWind, !!activeChaos.wind);
        updateChaosButtonState(els.btnChaosSpike, !!activeChaos.spike);
        updateChaosButtonState(els.btnChaosDemand, !!activeChaos.demand);

        // Action Summary
        els.lastActions.innerHTML = '';
        actions.forEach(act => {
            const li = document.createElement('li');
            li.textContent = act;
            els.lastActions.appendChild(li);
        });
    }

    function updateChaosButtonState(button, isActive) {
        if (!button) return;
        const indicator = button.querySelector('.toggle-indicator');
        if (isActive) {
            button.classList.add('active');
            if (indicator) indicator.textContent = 'ACTIVE';
        } else {
            button.classList.remove('active');
            if (indicator) indicator.textContent = 'OFF';
        }
    }

    function appendLog(message, type) {
        const div = document.createElement('div');
        div.className = `log-entry ${type}`;
        div.textContent = `[${engine.state.time}] ${message}`;
        els.logContainer.appendChild(div);

        // Keep last 40 logs max for clean memory
        while (els.logContainer.children.length > 40) {
            els.logContainer.removeChild(els.logContainer.firstChild);
        }

        // Auto scroll to bottom
        els.logContainer.scrollTop = els.logContainer.scrollHeight;
    }

    // Event Listeners
    els.btnTick.addEventListener('click', () => {
        engine.tick();
    });

    els.btnAuto.addEventListener('click', () => {
        if (autoRunInterval) {
            clearInterval(autoRunInterval);
            autoRunInterval = null;
            els.btnAuto.textContent = 'Auto Run (Off)';
            els.btnAuto.classList.remove('active-run');
            els.systemStatus.textContent = '● MANUAL STEPPING';
            els.systemStatus.style.color = '#94a3b8';
        } else {
            engine.tick();
            autoRunInterval = setInterval(() => engine.tick(), 2500); // 2.5s per tick
            els.btnAuto.textContent = 'Auto Run (Active)';
            els.btnAuto.classList.add('active-run');
            els.systemStatus.textContent = '● AUTONOMOUS ONLINE';
            els.systemStatus.style.color = '#34d399';
        }
    });

    // Chaos Toggles (Instant Deterministic Click)
    els.btnChaosCloud.addEventListener('click', () => engine.toggleChaos('cloud'));
    els.btnChaosWind.addEventListener('click', () => engine.toggleChaos('wind'));
    els.btnChaosSpike.addEventListener('click', () => engine.toggleChaos('spike'));
    els.btnChaosDemand.addEventListener('click', () => engine.toggleChaos('demand'));

    // Reset Scenarios to Baseline
    els.btnChaosReset.addEventListener('click', () => {
        engine.resetAll();
    });

    // Initial render
    engine.uiCallback({ 
        type: 'update', 
        state: engine.state, 
        criteria: { profit: 55, stability: 60, lifespan: 65 }, 
        actions: ['System Online. 8 Asset Clusters Operational.'],
        activeChaos: engine.state.activeChaos 
    });
});
