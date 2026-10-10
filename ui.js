// ui.js

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const els = {
        time: document.getElementById('current-time'),
        tickCount: document.getElementById('tick-count'),
        
        valSolar: document.getElementById('val-solar'),
        barSolar: document.getElementById('bar-solar'),
        forSolar: document.getElementById('forecast-solar'),
        
        valWind: document.getElementById('val-wind'),
        barWind: document.getElementById('bar-wind'),
        forWind: document.getElementById('forecast-wind'),
        
        valBattery: document.getElementById('val-battery'),
        barBattery: document.getElementById('bar-battery'),
        statBattery: document.getElementById('status-battery'),
        
        valDemand: document.getElementById('val-demand'),
        barDemand: document.getElementById('bar-demand'),
        valPrice: document.getElementById('val-price'),
        
        critProfit: document.getElementById('crit-profit'),
        critStability: document.getElementById('crit-stability'),
        critLifespan: document.getElementById('crit-lifespan'),
        
        logContainer: document.getElementById('agent-log'),
        lastActions: document.getElementById('last-action-list'),
        
        btnTick: document.getElementById('btn-tick'),
        btnAuto: document.getElementById('btn-auto'),
        
        btnChaosCloud: document.getElementById('btn-chaos-cloud'),
        btnChaosWind: document.getElementById('btn-chaos-wind'),
        btnChaosSpike: document.getElementById('btn-chaos-spike'),
        btnChaosDemand: document.getElementById('btn-chaos-demand'),
    };

    let autoRunInterval = null;

    // Callback from Engine
    function engineCallback(event) {
        if (event.type === 'log') {
            appendLog(event.msg, event.subtype);
        } else if (event.type === 'update') {
            updateUI(event.state, event.criteria, event.actions);
        }
    }

    const engine = new window.OrchestratorEngine(engineCallback);

    function updateUI(state, criteria, actions) {
        // Time
        els.time.textContent = state.time;
        els.tickCount.textContent = state.tickCount;

        // Solar
        els.valSolar.textContent = state.solar.current.toFixed(0);
        els.barSolar.style.width = `${(state.solar.current / state.solar.max) * 100}%`;
        els.forSolar.textContent = state.solar.forecast;
        els.forSolar.style.color = state.solar.forecast === 'Cloudy' ? 'var(--accent-red)' : 'var(--text-muted)';

        // Wind
        els.valWind.textContent = state.wind.current.toFixed(0);
        els.barWind.style.width = `${(state.wind.current / state.wind.max) * 100}%`;
        els.forWind.textContent = state.wind.forecast;
        els.forWind.style.color = state.wind.forecast === 'Surge' ? 'var(--accent-blue)' : 'var(--text-muted)';

        // Battery
        els.valBattery.textContent = state.battery.soc.toFixed(0);
        els.barBattery.style.width = `${state.battery.soc}%`;
        els.statBattery.textContent = state.battery.status;
        
        // Grid
        els.valDemand.textContent = state.grid.demand.toFixed(0);
        els.barDemand.style.width = `${(state.grid.demand / 400) * 100}%`; // Assuming 400 is max scale
        els.valPrice.textContent = state.grid.price.toFixed(2);
        els.valPrice.style.color = state.grid.price > 100 ? 'var(--accent-red)' : 'var(--text-main)';

        // Criteria
        els.critProfit.style.width = `${criteria.profit}%`;
        els.critStability.style.width = `${criteria.stability}%`;
        els.critLifespan.style.width = `${criteria.lifespan}%`;

        // Action Summary
        els.lastActions.innerHTML = '';
        actions.forEach(act => {
            const li = document.createElement('li');
            li.textContent = act;
            els.lastActions.appendChild(li);
        });
    }

    function appendLog(message, type) {
        const div = document.createElement('div');
        div.className = `log-entry ${type}`;
        div.textContent = `[${engine.state.time}] ${message}`;
        els.logContainer.appendChild(div);
        
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
            els.btnAuto.classList.remove('primary-btn');
            els.btnAuto.classList.add('secondary-btn');
        } else {
            engine.tick();
            autoRunInterval = setInterval(() => engine.tick(), 2500); // 2.5s per tick
            els.btnAuto.textContent = 'Auto Run (On)';
            els.btnAuto.classList.remove('secondary-btn');
            els.btnAuto.classList.add('primary-btn');
        }
    });

    els.btnChaosCloud.addEventListener('click', () => engine.injectChaos('cloud'));
    els.btnChaosWind.addEventListener('click', () => engine.injectChaos('wind'));
    els.btnChaosSpike.addEventListener('click', () => engine.injectChaos('spike'));
    els.btnChaosDemand.addEventListener('click', () => engine.injectChaos('demand'));

    // Initial render
    engine.uiCallback({ type: 'update', state: engine.state, criteria: {profit:50, stability:50, lifespan:50}, actions: ['System Ready'] });
});
