// Ivabradine Population PK Simulator

// Global variables
let pkChart = null;
let simulationData = null;

// Random number generator for normal distribution
function normalRandom(mean, sd) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * sd + mean;
}

// Log-normal distribution for PK parameters
function logNormalRandom(median, cv) {
    const variance = Math.log(1 + (cv/100) * (cv/100));
    const mu = Math.log(median) - variance/2;
    const sigma = Math.sqrt(variance);
    return Math.exp(normalRandom(mu, sigma));
}

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

// Two-compartment model with first-order absorption
function twoCompartmentOralModel(params) {
    const { CL, V1, V2, Q, Ka } = params;
    
    return function(t, y) {
        const A_depot = y[0];  // Amount in depot (gut)
        const A1 = y[1];       // Amount in central compartment
        const A2 = y[2];       // Amount in peripheral compartment
        
        // Differential equations
        const dA_depot_dt = -Ka * A_depot;
        const dA1_dt = Ka * A_depot - CL/V1 * A1 - Q/V1 * A1 + Q/V2 * A2;
        const dA2_dt = Q/V1 * A1 - Q/V2 * A2;
        
        return [dA_depot_dt, dA1_dt, dA2_dt];
    };
}

// Generate individual PK parameters with covariates
function generateIndividualParams(popParams, covariates) {
    const { weight, sex } = covariates;
    const weightNorm = weight / 70; // Normalize to 70 kg
    
    // Apply allometric scaling
    const CL_i = logNormalRandom(popParams.CL, popParams.CL_CV) * Math.pow(weightNorm, 0.75);
    const V1_i = logNormalRandom(popParams.V1, popParams.V1_CV) * weightNorm;
    const V2_i = popParams.V2 * weightNorm; // No IIV on V2
    const Q_i = popParams.Q * Math.pow(weightNorm, 0.75); // No IIV on Q
    const Ka_i = logNormalRandom(popParams.Ka, popParams.Ka_CV);
    const F_i = Math.min(1, logNormalRandom(popParams.F, popParams.F_CV));
    
    return { CL: CL_i, V1: V1_i, V2: V2_i, Q: Q_i, Ka: Ka_i, F: F_i };
}

// Simulate one individual
function simulateIndividual(dose, dosing, nDoses, params, simTime) {
    const dt = 0.1; // Time step
    const tau = 12; // 12-hour dosing interval for BID
    
    // Initial conditions
    let y0 = [0, 0, 0]; // [depot, central, peripheral]
    let times = [];
    let concentrations = [];
    
    if (dosing === 'single') {
        // Single dose
        y0[0] = dose * params.F; // Dose in mg with bioavailability
        const model = twoCompartmentOralModel(params);
        const result = rungeKutta4(model, y0, 0, simTime, dt);
        times = result.t;
        // Central concentration in mg/L
        concentrations = result.y.map(y => y[1] / params.V1);
    } else {
        // Multiple doses
        let currentTime = 0;
        let currentY = [...y0];
        
        for (let i = 0; i < nDoses; i++) {
            // Add dose to depot in mg
            currentY[0] += dose * params.F;
            
            // Simulate until next dose or end
            const endTime = Math.min(currentTime + tau, simTime);
            const model = twoCompartmentOralModel(params);
            const result = rungeKutta4(model, currentY, currentTime, endTime, dt);
            
            // Store results
            const startIdx = (i === 0) ? 0 : 1;
            times.push(...result.t.slice(startIdx));
            // Central concentration in mg/L
            concentrations.push(...result.y.slice(startIdx).map(y => y[1] / params.V1));
            
            // Update for next iteration
            currentTime = endTime;
            currentY = result.y[result.y.length - 1];
            
            if (currentTime >= simTime) break;
        }
    }
    
    return { times, concentrations };
}

// Simulate population
function simulatePopulation() {
    // Show loading state
    const btn = document.getElementById('simulateBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Simulating...';
    btn.disabled = true;
    
    setTimeout(() => {
        // Get input values
        const nSubjects = parseInt(document.getElementById('nSubjects').value);
        const dose = parseFloat(document.getElementById('dose').value);
        const dosing = document.getElementById('dosing').value;
        const nDoses = parseInt(document.getElementById('nDoses').value);
        const simTime = parseFloat(document.getElementById('simTime').value);
    
    // Population parameters
    const popParams = {
        CL: parseFloat(document.getElementById('CL').value),
        V1: parseFloat(document.getElementById('V1').value),
        V2: parseFloat(document.getElementById('V2').value),
        Q: parseFloat(document.getElementById('Q').value),
        Ka: parseFloat(document.getElementById('Ka').value),
        F: parseFloat(document.getElementById('F').value),
        CL_CV: parseFloat(document.getElementById('CL_CV').value),
        V1_CV: parseFloat(document.getElementById('V1_CV').value),
        Ka_CV: parseFloat(document.getElementById('Ka_CV').value),
        F_CV: parseFloat(document.getElementById('F_CV').value)
    };
    
    // Covariate distributions
    const weightMean = parseFloat(document.getElementById('weightMean').value);
    const weightSD = parseFloat(document.getElementById('weightSD').value);
    const femalePercent = parseFloat(document.getElementById('femalePercent').value) / 100;
    
    // Simulate individuals
    const allProfiles = [];
    const individualParams = [];
    
    for (let i = 0; i < nSubjects; i++) {
        // Generate covariates
        const weight = Math.max(40, normalRandom(weightMean, weightSD));
        const sex = Math.random() < femalePercent ? 'F' : 'M';
        
        // Generate individual parameters
        const params = generateIndividualParams(popParams, { weight, sex });
        individualParams.push({ ...params, weight, sex });
        
        // Simulate PK profile
        const profile = simulateIndividual(dose, dosing, nDoses, params, simTime);
        allProfiles.push(profile);
    }
    
    // Calculate summary statistics at each time point
    const timePoints = allProfiles[0].times;
    const summaryStats = calculateSummaryStats(allProfiles, timePoints);
    
    // Calculate exposure metrics
    const exposureMetrics = calculatePopulationMetrics(allProfiles, dosing, dose, nDoses, individualParams);
    
    // Store data for export
    simulationData = {
        individual: allProfiles,
        summary: summaryStats,
        params: individualParams,
        popParams: popParams
    };
    
        // Update visualization
        const yScale = document.getElementById('yScale').value;
        updateChart(summaryStats, allProfiles, dosing, yScale);
        updateTables(individualParams, exposureMetrics, dosing, dose);
        
        // Reset button
        btn.textContent = originalText;
        btn.disabled = false;
    }, 100); // Small delay to show loading state
}

// Calculate summary statistics
function calculateSummaryStats(allProfiles, timePoints) {
    const stats = {
        times: timePoints,
        median: [],
        p5: [],
        p95: [],
        mean: [],
        min: [],
        max: []
    };
    
    for (let i = 0; i < timePoints.length; i++) {
        const concs = allProfiles.map(p => p.concentrations[i]).sort((a, b) => a - b);
        
        stats.median.push(concs[Math.floor(concs.length * 0.5)]);
        stats.p5.push(concs[Math.floor(concs.length * 0.05)]);
        stats.p95.push(concs[Math.floor(concs.length * 0.95)]);
        stats.mean.push(concs.reduce((a, b) => a + b) / concs.length);
        stats.min.push(concs[0]);
        stats.max.push(concs[concs.length - 1]);
    }
    
    return stats;
}

// Calculate population exposure metrics
function calculatePopulationMetrics(allProfiles, dosing, dose, nDoses, individualParams) {
    const metrics = [];
    
    for (let i = 0; i < allProfiles.length; i++) {
        const profile = allProfiles[i];
        const params = individualParams[i];
        
        if (dosing === 'single') {
            const cmax = Math.max(...profile.concentrations);
            const tmax = profile.times[profile.concentrations.indexOf(cmax)];
            const auc = calculateAUC(profile.times, profile.concentrations);
            
            // Calculate terminal half-life from last phase
            const halfLife = calculateHalfLife(profile.times, profile.concentrations, params);
            
            metrics.push({ cmax, tmax, auc, halfLife, cl_f: params.CL/params.F });
        } else {
            // Get last dosing interval (steady-state)
            const tau = 12;
            const lastDoseTime = (nDoses - 1) * tau;
            const ssStart = profile.times.findIndex(t => t >= lastDoseTime);
            const ssEnd = profile.times.findIndex(t => t >= lastDoseTime + tau);
            
            if (ssStart >= 0 && ssEnd >= 0) {
                const ssTimes = profile.times.slice(ssStart, ssEnd + 1);
                const ssConcs = profile.concentrations.slice(ssStart, ssEnd + 1);
                
                const cmax_ss = Math.max(...ssConcs);
                const cmin_ss = Math.min(...ssConcs);
                const tmax_ss = ssTimes[ssConcs.indexOf(cmax_ss)] - lastDoseTime;
                
                // Calculate AUC for the dosing interval
                const timeAdjusted = ssTimes.map(t => t - lastDoseTime);
                const auc_ss = calculateAUC(timeAdjusted, ssConcs);
                
                // Average concentration
                const cavg_ss = auc_ss / tau;
                
                metrics.push({ cmax_ss, cmin_ss, tmax_ss, auc_ss, cavg_ss, cl_f: params.CL/params.F });
            }
        }
    }
    
    return metrics;
}

// Calculate terminal half-life
function calculateHalfLife(times, concentrations, params) {
    // Use the elimination rate constant from the model
    // For 2-compartment model, terminal half-life is based on beta phase
    const beta = calculateBeta(params);
    return 0.693 / beta;
}

// Calculate beta (terminal elimination rate constant) for 2-compartment model
function calculateBeta(params) {
    const { CL, V1, V2, Q } = params;
    const k10 = CL / V1;
    const k12 = Q / V1;
    const k21 = Q / V2;
    
    const a = k10 + k12 + k21;
    const b = k10 * k21;
    
    const beta = 0.5 * (a - Math.sqrt(a * a - 4 * b));
    return beta;
}

// Calculate AUC using trapezoidal rule
function calculateAUC(times, concentrations) {
    let auc = 0;
    for (let i = 1; i < times.length; i++) {
        auc += (times[i] - times[i-1]) * (concentrations[i] + concentrations[i-1]) / 2;
    }
    return auc;
}

// Update chart
function updateChart(summaryStats, individualProfiles, dosing, yScale = 'log') {
    const ctx = document.getElementById('pkChart').getContext('2d');
    
    if (pkChart) {
        pkChart.destroy();
    }
    
    // Prepare datasets - Convert to ng/mL for display
    const datasets = [
        {
            label: 'Median',
            data: summaryStats.median.map(v => v * 1000),
            borderColor: '#0066cc',
            backgroundColor: 'transparent',
            borderWidth: 3,
            pointRadius: 0,
            tension: 0.2
        },
        {
            label: '90% Prediction Interval',
            data: summaryStats.p95.map(v => v * 1000),
            borderColor: 'rgba(0, 102, 204, 0.3)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            tension: 0.2,
            fill: '+1'
        },
        {
            label: '',
            data: summaryStats.p5.map(v => v * 1000),
            borderColor: 'rgba(0, 102, 204, 0.3)',
            backgroundColor: 'rgba(0, 102, 204, 0.1)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            tension: 0.2,
            showLine: true
        }
    ];
    
    // Add some individual profiles for visualization
    const nShow = Math.min(20, individualProfiles.length);
    for (let i = 0; i < nShow; i++) {
        datasets.push({
            label: '',
            data: individualProfiles[i].concentrations.map(v => v * 1000),
            borderColor: 'rgba(150, 150, 150, 0.2)',
            backgroundColor: 'transparent',
            borderWidth: 1,
            pointRadius: 0,
            tension: 0.2,
            showLine: true
        });
    }
    
    // Create dose markers
    const doseTimes = [];
    if (dosing === 'bid') {
        const tau = 12;
        const nDoses = parseInt(document.getElementById('nDoses').value);
        for (let i = 0; i < nDoses; i++) {
            doseTimes.push(i * tau);
        }
    } else {
        doseTimes.push(0);
    }
    
    const minConc = Math.min(...summaryStats.min.filter(c => c > 0));
    const maxConc = Math.max(...summaryStats.max);
    
    pkChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: summaryStats.times,
            datasets: datasets
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
                    text: 'Ivabradine Population PK Profiles',
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
                        filter: function(item) {
                            return item.text !== '';
                        },
                        font: {
                            size: 14
                        },
                        usePointStyle: true,
                        pointStyle: 'line'
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 10,
                    filter: function(tooltipItem) {
                        return tooltipItem.datasetIndex < 3;
                    },
                    callbacks: {
                        title: function(context) {
                            return `Time: ${context[0].parsed.x.toFixed(1)} hours`;
                        },
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `Median: ${context.parsed.y.toFixed(1)} ng/mL`;
                            } else if (context.datasetIndex === 1) {
                                return `P95: ${context.parsed.y.toFixed(1)} ng/mL`;
                            } else if (context.datasetIndex === 2) {
                                return `P5: ${context.parsed.y.toFixed(1)} ng/mL`;
                            }
                        }
                    }
                },
                annotation: {
                    annotations: doseTimes.map((doseTime, index) => ({
                        type: 'line',
                        xMin: doseTime,
                        xMax: doseTime,
                        borderColor: 'rgba(255, 99, 132, 0.7)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        label: {
                            enabled: true,
                            content: dosing === 'bid' ? `Dose ${index + 1}` : 'Dose',
                            position: 'start',
                            yAdjust: -20 - (index % 2) * 20,
                            backgroundColor: 'rgba(255, 99, 132, 0.9)',
                            font: {
                                size: 11,
                                weight: 'bold'
                            },
                            padding: {
                                top: 2,
                                bottom: 2,
                                left: 6,
                                right: 6
                            }
                        }
                    }))
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
                        }
                    }
                },
                y: yScale === 'log' ? {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'Plasma Concentration (ng/mL) - Log Scale',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    min: minConc * 500,
                    max: maxConc * 2000,
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
                            // Convert to ng/mL for display
                            const ngml = value * 1000;
                            const logValue = Math.log10(ngml);
                            const isWhole = Math.abs(logValue - Math.round(logValue)) < 0.01;
                            
                            if (isWhole || Math.abs(logValue - Math.round(logValue)) < 0.3) {
                                if (ngml >= 1) return ngml.toFixed(0);
                                if (ngml >= 0.1) return ngml.toFixed(1);
                                return ngml.toFixed(2);
                            }
                            return '';
                        }
                    }
                } : {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Plasma Concentration (ng/mL) - Linear Scale',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    min: 0,
                    max: maxConc * 1100,
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
                            return value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

// Update tables
function updateTables(individualParams, exposureMetrics, dosing, dose) {
    // Population summary table
    const popTable = document.getElementById('popTable').getElementsByTagName('tbody')[0];
    popTable.innerHTML = '';
    
    // Calculate summary statistics for parameters
    const paramStats = {
        'CL (L/h)': individualParams.map(p => p.CL),
        'V1 (L)': individualParams.map(p => p.V1),
        'V2 (L)': individualParams.map(p => p.V2),
        'Ka (1/h)': individualParams.map(p => p.Ka),
        'F': individualParams.map(p => p.F),
        'Weight (kg)': individualParams.map(p => p.weight)
    };
    
    for (const [param, values] of Object.entries(paramStats)) {
        const row = popTable.insertRow();
        row.insertCell(0).textContent = param;
        const mean = values.reduce((a, b) => a + b) / values.length;
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length * 0.5)];
        const cv = (Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length) / mean * 100).toFixed(1);
        row.insertCell(1).textContent = `${mean.toFixed(1)} ± ${(mean * parseFloat(cv) / 100).toFixed(1)} (CV: ${cv}%)`;
    }
    
    // Add terminal half-life
    if (exposureMetrics.length > 0 && exposureMetrics[0].halfLife) {
        const halfLifeValues = exposureMetrics.map(m => m.halfLife);
        const row = popTable.insertRow();
        row.insertCell(0).textContent = 't½ (h)';
        const mean = halfLifeValues.reduce((a, b) => a + b) / halfLifeValues.length;
        const sorted = [...halfLifeValues].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length * 0.5)];
        row.insertCell(1).textContent = `${mean.toFixed(1)} (${sorted[Math.floor(sorted.length * 0.05)].toFixed(1)}-${sorted[Math.floor(sorted.length * 0.95)].toFixed(1)})`;
    }
    
    // Add sex distribution
    const femaleCount = individualParams.filter(p => p.sex === 'F').length;
    const femalePercent = (femaleCount / individualParams.length * 100).toFixed(0);
    const row = popTable.insertRow();
    row.insertCell(0).textContent = 'Female (%)';
    row.insertCell(1).textContent = femalePercent;
    
    // Update metrics title based on dosing
    const metricsTitle = document.getElementById('metricsTitle');
    if (dosing === 'single') {
        metricsTitle.textContent = 'NCA Results - Single Dose (Population)';
    } else {
        metricsTitle.textContent = 'NCA Results - Steady State (Population)';
    }
    
    // Exposure metrics table
    const metricsTable = document.getElementById('metricsTable').getElementsByTagName('tbody')[0];
    metricsTable.innerHTML = '';
    
    if (exposureMetrics.length > 0) {
        if (dosing === 'single') {
            const cmaxValues = exposureMetrics.map(m => m.cmax);
            const tmaxValues = exposureMetrics.map(m => m.tmax);
            const aucValues = exposureMetrics.map(m => m.auc);
            const clFValues = exposureMetrics.map(m => m.cl_f);
            
            addMetricRow(metricsTable, 'Cmax (ng/mL)', cmaxValues.map(v => v * 1000)); // Convert to ng/mL
            addMetricRow(metricsTable, 'Tmax (h)', tmaxValues);
            addMetricRow(metricsTable, 'AUC₀₋∞ (ng·h/mL)', aucValues.map(v => v * 1000));
            addMetricRow(metricsTable, 'CL/F (L/h)', clFValues);
            
            // Add dose-normalized values
            addMetricRow(metricsTable, 'Cmax/Dose (ng/mL/mg)', cmaxValues.map(v => v * 1000 / dose));
            addMetricRow(metricsTable, 'AUC/Dose (ng·h/mL/mg)', aucValues.map(v => v * 1000 / dose));
        } else {
            const cmaxValues = exposureMetrics.map(m => m.cmax_ss);
            const cminValues = exposureMetrics.map(m => m.cmin_ss);
            const tmaxValues = exposureMetrics.map(m => m.tmax_ss);
            const aucValues = exposureMetrics.map(m => m.auc_ss);
            const cavgValues = exposureMetrics.map(m => m.cavg_ss);
            
            addMetricRow(metricsTable, 'Cmax,ss (ng/mL)', cmaxValues.map(v => v * 1000));
            addMetricRow(metricsTable, 'Cmin,ss (ng/mL)', cminValues.map(v => v * 1000));
            addMetricRow(metricsTable, 'Tmax,ss (h)', tmaxValues);
            addMetricRow(metricsTable, 'Cavg,ss (ng/mL)', cavgValues.map(v => v * 1000));
            addMetricRow(metricsTable, 'AUCτ,ss (ng·h/mL)', aucValues.map(v => v * 1000));
            
            // Add fluctuation
            const fluctuation = cmaxValues.map((cmax, i) => ((cmax - cminValues[i]) / cavgValues[i] * 100));
            addMetricRow(metricsTable, 'Fluctuation (%)', fluctuation);
        }
    } else {
        const row = metricsTable.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 2;
        cell.textContent = 'No metrics calculated';
        cell.style.textAlign = 'center';
        cell.style.fontStyle = 'italic';
    }
}

// Add metric row to table
function addMetricRow(table, label, values) {
    if (!values || values.length === 0) return;
    
    const row = table.insertRow();
    row.insertCell(0).textContent = label;
    
    const mean = values.reduce((a, b) => a + b) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length * 0.5)];
    const p5 = sorted[Math.floor(sorted.length * 0.05)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    // Format based on the metric type
    let formatted;
    if (label.includes('(%)') || label.includes('Tmax')) {
        // For percentages and time values, use fewer decimals
        formatted = `${median.toFixed(1)} (${p5.toFixed(1)}-${p95.toFixed(1)})`;
    } else if (label.includes('ng/mL')) {
        // For concentrations in ng/mL
        if (median < 10) {
            formatted = `${median.toFixed(2)} (${p5.toFixed(2)}-${p95.toFixed(2)})`;
        } else {
            formatted = `${median.toFixed(1)} (${p5.toFixed(1)}-${p95.toFixed(1)})`;
        }
    } else {
        // Default formatting
        formatted = `${median.toFixed(2)} (${p5.toFixed(2)}-${p95.toFixed(2)})`;
    }
    
    row.insertCell(1).textContent = formatted;
}

// Export chart
function exportChart() {
    if (pkChart) {
        const link = document.createElement('a');
        link.download = 'ivabradine-population-pk.png';
        link.href = pkChart.toBase64Image();
        link.click();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    document.getElementById('simulateBtn').addEventListener('click', simulatePopulation);
    document.getElementById('exportBtn').addEventListener('click', exportChart);
    document.getElementById('yScale').addEventListener('change', function() {
        if (simulationData) {
            const yScale = document.getElementById('yScale').value;
            const dosing = document.getElementById('dosing').value;
            updateChart(simulationData.summary, simulationData.individual, dosing, yScale);
        }
    });
    
    // Enable/disable multiple dose options
    document.getElementById('dosing').addEventListener('change', function() {
        const isBID = this.value === 'bid';
        document.getElementById('nDoses').disabled = !isBID;
    });
    
    // Run initial simulation
    simulatePopulation();
});