// PK Simulator JavaScript Implementation

// Global variables
let pkChart = null;

// ODE Solver - Runge-Kutta 4th order
function rungeKutta4(dydt, y0, t0, t1, h) {
    const n = Math.ceil((t1 - t0) / h);
    const t = [];
    const y = [];
    
    let yi = [...y0];
    let ti = t0;
    
    t.push(ti);
    y.push([...yi]);
    
    for (let i = 0; i < n; i++) {
        const k1 = dydt(ti, yi).map(v => v * h);
        const k2 = dydt(ti + h/2, yi.map((v, j) => v + k1[j]/2)).map(v => v * h);
        const k3 = dydt(ti + h/2, yi.map((v, j) => v + k2[j]/2)).map(v => v * h);
        const k4 = dydt(ti + h, yi.map((v, j) => v + k3[j])).map(v => v * h);
        
        yi = yi.map((v, j) => v + (k1[j] + 2*k2[j] + 2*k3[j] + k4[j])/6);
        ti += h;
        
        t.push(ti);
        y.push([...yi]);
    }
    
    return { t, y };
}

// PK Models
function oneCompartmentModel(params) {
    const { CL, V } = params;
    
    return function(t, y) {
        const A1 = y[0]; // Amount in central compartment
        const dA1dt = -CL/V * A1;
        return [dA1dt];
    };
}

function twoCompartmentModel(params) {
    const { CL, V1, V2, Q } = params;
    
    return function(t, y) {
        const A1 = y[0]; // Amount in central compartment
        const A2 = y[1]; // Amount in peripheral compartment
        
        const dA1dt = -CL/V1 * A1 - Q/V1 * A1 + Q/V2 * A2;
        const dA2dt = Q/V1 * A1 - Q/V2 * A2;
        
        return [dA1dt, dA2dt];
    };
}

function threeCompartmentModel(params) {
    const { CL, V1, V2, V3, Q2, Q3 } = params;
    
    return function(t, y) {
        const A1 = y[0]; // Amount in central compartment
        const A2 = y[1]; // Amount in peripheral compartment 1
        const A3 = y[2]; // Amount in peripheral compartment 2
        
        const dA1dt = -CL/V1 * A1 - Q2/V1 * A1 + Q2/V2 * A2 - Q3/V1 * A1 + Q3/V3 * A3;
        const dA2dt = Q2/V1 * A1 - Q2/V2 * A2;
        const dA3dt = Q3/V1 * A1 - Q3/V3 * A3;
        
        return [dA1dt, dA2dt, dA3dt];
    };
}

// Simulate PK profile
function simulatePK(modelType, dose, doseType, nDoses, tau, params, simTime) {
    let model, y0, V_central;
    
    switch(modelType) {
        case 'one_comp':
            model = oneCompartmentModel(params);
            y0 = [0];
            V_central = params.V;
            break;
        case 'two_comp':
            model = twoCompartmentModel(params);
            y0 = [0, 0];
            V_central = params.V1;
            break;
        case 'three_comp':
            model = threeCompartmentModel(params);
            y0 = [0, 0, 0];
            V_central = params.V1;
            break;
    }
    
    const dt = 0.1; // Time step
    let times = [];
    let concentrations = [];
    
    if (doseType === 'single') {
        // Single dose
        y0[0] = dose; // Add dose to central compartment
        const result = rungeKutta4(model, y0, 0, simTime, dt);
        times = result.t;
        concentrations = result.y.map(y => y[0] / V_central);
    } else {
        // Multiple doses
        let currentTime = 0;
        let currentY = [...y0];
        
        for (let i = 0; i < nDoses; i++) {
            // Add dose
            currentY[0] += dose;
            
            // Simulate until next dose or end
            const endTime = (i < nDoses - 1) ? currentTime + tau : simTime;
            const result = rungeKutta4(model, currentY, currentTime, endTime, dt);
            
            // Store results (skip first point except for first dose to avoid duplicates)
            const startIdx = (i === 0) ? 0 : 1;
            times.push(...result.t.slice(startIdx));
            concentrations.push(...result.y.slice(startIdx).map(y => y[0] / V_central));
            
            // Update for next iteration
            currentTime = endTime;
            currentY = result.y[result.y.length - 1];
        }
    }
    
    return { times, concentrations };
}

// Calculate PK metrics
function calculateMetrics(times, concentrations, doseType, nDoses, tau) {
    const metrics = {};
    
    if (doseType === 'single') {
        metrics.Cmax = Math.max(...concentrations);
        metrics.Tmax = times[concentrations.indexOf(metrics.Cmax)];
        
        // Calculate AUC using trapezoidal rule
        let auc = 0;
        for (let i = 1; i < times.length; i++) {
            auc += (times[i] - times[i-1]) * (concentrations[i] + concentrations[i-1]) / 2;
        }
        metrics.AUC = auc;
    } else {
        // Find steady-state interval (last dosing interval)
        const lastDoseTime = (nDoses - 1) * tau;
        const ssIndices = times.map((t, i) => ({ t, i }))
            .filter(item => item.t >= lastDoseTime && item.t < lastDoseTime + tau)
            .map(item => item.i);
        
        const ssConc = ssIndices.map(i => concentrations[i]);
        const ssTimes = ssIndices.map(i => times[i]);
        
        metrics.Cmax_ss = Math.max(...ssConc);
        metrics.Cmin_ss = Math.min(...ssConc);
        metrics.Tmax_ss = ssTimes[ssConc.indexOf(metrics.Cmax_ss)] - lastDoseTime;
        
        // Calculate AUC for steady-state interval
        let auc_ss = 0;
        for (let i = 1; i < ssTimes.length; i++) {
            auc_ss += (ssTimes[i] - ssTimes[i-1]) * (ssConc[i] + ssConc[i-1]) / 2;
        }
        metrics.AUCtau_ss = auc_ss;
        
        // Accumulation ratio
        const firstDoseIndices = times.map((t, i) => ({ t, i }))
            .filter(item => item.t <= tau)
            .map(item => item.i);
        const firstDoseCmax = Math.max(...firstDoseIndices.map(i => concentrations[i]));
        metrics.AccumulationRatio = metrics.Cmax_ss / firstDoseCmax;
    }
    
    return metrics;
}

// Calculate parameter summary
function calculateParamSummary(modelType, params) {
    const summary = {};
    
    switch(modelType) {
        case 'one_comp':
            summary['Clearance (CL)'] = `${params.CL} L/h`;
            summary['Volume (V)'] = `${params.V} L`;
            summary['Half-life (t½)'] = `${(0.693 * params.V / params.CL).toFixed(2)} h`;
            break;
        case 'two_comp':
            const alpha = 0.5 * ((params.CL/params.V1 + params.Q/params.V1 + params.Q/params.V2) + 
                Math.sqrt(Math.pow(params.CL/params.V1 + params.Q/params.V1 + params.Q/params.V2, 2) - 
                4 * params.CL/params.V1 * params.Q/params.V2));
            const beta = 0.5 * ((params.CL/params.V1 + params.Q/params.V1 + params.Q/params.V2) - 
                Math.sqrt(Math.pow(params.CL/params.V1 + params.Q/params.V1 + params.Q/params.V2, 2) - 
                4 * params.CL/params.V1 * params.Q/params.V2));
            
            summary['Clearance (CL)'] = `${params.CL} L/h`;
            summary['Central Volume (V1)'] = `${params.V1} L`;
            summary['Peripheral Volume (V2)'] = `${params.V2} L`;
            summary['Inter-compartmental Clearance (Q)'] = `${params.Q} L/h`;
            summary['Alpha Half-life'] = `${(0.693/alpha).toFixed(2)} h`;
            summary['Beta Half-life'] = `${(0.693/beta).toFixed(2)} h`;
            break;
        case 'three_comp':
            summary['Clearance (CL)'] = `${params.CL} L/h`;
            summary['Central Volume (V1)'] = `${params.V1} L`;
            summary['Peripheral Volume 1 (V2)'] = `${params.V2} L`;
            summary['Peripheral Volume 2 (V3)'] = `${params.V3} L`;
            summary['Inter-compartmental Clearance 1 (Q2)'] = `${params.Q2} L/h`;
            summary['Inter-compartmental Clearance 2 (Q3)'] = `${params.Q3} L/h`;
            break;
    }
    
    return summary;
}

// Update UI based on selections
function updateUI() {
    const modelType = document.getElementById('modelType').value;
    const doseType = document.getElementById('doseType').value;
    
    // Show/hide dose parameters
    document.getElementById('multipleDoseParams').style.display = 
        doseType === 'multiple' ? 'block' : 'none';
    
    // Show/hide model parameters
    document.getElementById('oneCompParams').style.display = 
        modelType === 'one_comp' ? 'block' : 'none';
    document.getElementById('twoCompParams').style.display = 
        modelType === 'two_comp' ? 'block' : 'none';
    document.getElementById('threeCompParams').style.display = 
        modelType === 'three_comp' ? 'block' : 'none';
}

// Run simulation
function runSimulation() {
    // Get input values
    const modelType = document.getElementById('modelType').value;
    const doseType = document.getElementById('doseType').value;
    const dose = parseFloat(document.getElementById('dose').value);
    const nDoses = doseType === 'multiple' ? parseInt(document.getElementById('nDoses').value) : 1;
    const tau = doseType === 'multiple' ? parseFloat(document.getElementById('tau').value) : 0;
    const simTime = parseFloat(document.getElementById('simTime').value);
    
    // Get model parameters
    let params = {};
    switch(modelType) {
        case 'one_comp':
            params = {
                CL: parseFloat(document.getElementById('CL').value),
                V: parseFloat(document.getElementById('V').value)
            };
            break;
        case 'two_comp':
            params = {
                CL: parseFloat(document.getElementById('CL2').value),
                V1: parseFloat(document.getElementById('V1').value),
                V2: parseFloat(document.getElementById('V2').value),
                Q: parseFloat(document.getElementById('Q').value)
            };
            break;
        case 'three_comp':
            params = {
                CL: parseFloat(document.getElementById('CL3').value),
                V1: parseFloat(document.getElementById('V1_3').value),
                V2: parseFloat(document.getElementById('V2_3').value),
                V3: parseFloat(document.getElementById('V3').value),
                Q2: parseFloat(document.getElementById('Q2').value),
                Q3: parseFloat(document.getElementById('Q3').value)
            };
            break;
    }
    
    // Run simulation
    const result = simulatePK(modelType, dose, doseType, nDoses, tau, params, simTime);
    
    // Calculate metrics
    const metrics = calculateMetrics(result.times, result.concentrations, doseType, nDoses, tau);
    const paramSummary = calculateParamSummary(modelType, params);
    
    // Calculate dose times for visualization
    const doseTimes = [];
    for (let i = 0; i < nDoses; i++) {
        doseTimes.push(i * tau);
    }
    
    // Update chart
    updateChart(result.times, result.concentrations, modelType, doseTimes, doseType);
    
    // Update tables
    updateTables(paramSummary, metrics, doseType);
}

// Update chart
function updateChart(times, concentrations, modelType, doseTimes, doseType) {
    const ctx = document.getElementById('pkChart').getContext('2d');
    
    if (pkChart) {
        pkChart.destroy();
    }
    
    const modelName = {
        'one_comp': 'One Compartment',
        'two_comp': 'Two Compartment',
        'three_comp': 'Three Compartment'
    }[modelType];
    
    // Find min and max for better scaling
    const minConc = Math.min(...concentrations.filter(c => c > 0));
    const maxConc = Math.max(...concentrations);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 102, 204, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 102, 204, 0.01)');
    
    pkChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: times,
            datasets: [{
                label: 'Plasma Concentration',
                data: concentrations,
                borderColor: '#0066cc',
                backgroundColor: gradient,
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#0066cc',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: `PK Profile - ${modelName} Model`,
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    padding: 20
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 14
                        },
                        usePointStyle: true,
                        pointStyle: 'line'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            return `Time: ${context[0].parsed.x.toFixed(1)} hours`;
                        },
                        label: function(context) {
                            return `Concentration: ${context.parsed.y.toFixed(3)} mg/L`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Time (hours)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: true,
                        borderColor: '#333'
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return value;
                        }
                    }
                },
                y: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'Plasma Concentration (mg/L)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    min: minConc * 0.5,
                    max: maxConc * 2,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: true,
                        borderColor: '#333'
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        callback: function(value, index, values) {
                            // Format the tick labels nicely
                            const logValue = Math.log10(value);
                            if (Math.abs(logValue - Math.round(logValue)) < 0.01) {
                                // It's a power of 10
                                if (value >= 1) {
                                    return value.toFixed(0);
                                } else {
                                    return value.toFixed(-Math.floor(Math.log10(value)));
                                }
                            }
                            return '';
                        },
                        autoSkip: false,
                        maxTicksLimit: 10
                    }
                }
            },
            plugins: {
                annotation: {
                    annotations: doseTimes.map((doseTime, index) => ({
                        type: 'line',
                        xMin: doseTime,
                        xMax: doseTime,
                        borderColor: 'rgba(255, 99, 132, 0.8)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        label: {
                            enabled: true,
                            content: `Dose ${index + 1}`,
                            position: 'start',
                            backgroundColor: 'rgba(255, 99, 132, 0.8)',
                            font: {
                                size: 11
                            }
                        }
                    }))
                }
            }
        }
    });
}

// Update tables
function updateTables(paramSummary, metrics, doseType) {
    // Update parameter table
    const paramTable = document.getElementById('paramTable').getElementsByTagName('tbody')[0];
    paramTable.innerHTML = '';
    
    for (const [key, value] of Object.entries(paramSummary)) {
        const row = paramTable.insertRow();
        row.insertCell(0).textContent = key;
        row.insertCell(1).textContent = value;
    }
    
    // Update metrics table
    const metricsTable = document.getElementById('metricsTable').getElementsByTagName('tbody')[0];
    metricsTable.innerHTML = '';
    
    const metricLabels = {
        'Cmax': 'Cmax',
        'Tmax': 'Tmax',
        'AUC': 'AUC(0-inf)',
        'Cmax_ss': 'Cmax,ss',
        'Cmin_ss': 'Cmin,ss',
        'Tmax_ss': 'Tmax,ss',
        'AUCtau_ss': 'AUCtau,ss',
        'AccumulationRatio': 'Accumulation Ratio'
    };
    
    for (const [key, value] of Object.entries(metrics)) {
        const row = metricsTable.insertRow();
        row.insertCell(0).textContent = metricLabels[key];
        
        let formattedValue;
        if (key.includes('max') || key.includes('min')) {
            formattedValue = `${value.toFixed(2)} mg/L`;
        } else if (key.includes('Tmax')) {
            formattedValue = `${value.toFixed(2)} h`;
        } else if (key.includes('AUC')) {
            formattedValue = `${value.toFixed(2)} mg·h/L`;
        } else if (key === 'AccumulationRatio') {
            formattedValue = value.toFixed(2);
        } else {
            formattedValue = value.toFixed(2);
        }
        
        row.insertCell(1).textContent = formattedValue;
    }
}

// Export chart as image
function exportChart() {
    if (pkChart) {
        const link = document.createElement('a');
        link.download = 'pk-profile.png';
        link.href = pkChart.toBase64Image();
        link.click();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    document.getElementById('modelType').addEventListener('change', updateUI);
    document.getElementById('doseType').addEventListener('change', updateUI);
    document.getElementById('simulateBtn').addEventListener('click', runSimulation);
    document.getElementById('exportBtn').addEventListener('click', exportChart);
    
    // Initialize UI
    updateUI();
    
    // Run initial simulation
    runSimulation();
});