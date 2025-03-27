/**
 * Enhanced visualization module for the Decentralized Voting Admin Dashboard
 * 
 * This module handles creating and updating chart visualizations for election data
 * using Chart.js
 */

// Keep track of chart instances
let charts = {
    resultsChart: null,
    turnoutChart: null,
    timelineChart: null
};

/**
 * Create or update the primary election results chart
 * 
 * @param {Array} candidatesData - Array of candidate objects with votes
 * @param {string} chartId - DOM ID of the canvas element
 */
function createElectionResultsChart(candidatesData, chartId = 'resultsChart') {
    // Get canvas context
    const chartCanvas = document.getElementById(chartId);
    if (!chartCanvas) return;
    
    // Destroy existing chart if it exists
    if (charts.resultsChart) {
        charts.resultsChart.destroy();
    }
    
    // Prepare data for the chart
    const labels = candidatesData.map(candidate => candidate.name);
    const votes = candidatesData.map(candidate => parseInt(candidate.voteCount));
    const totalVotes = votes.reduce((sum, vote) => sum + vote, 0);
    const colors = generateChartColors(candidatesData.length);
    
    // Determine if we should switch to horizontal bar for many candidates
    const chartType = candidatesData.length > 5 ? 'bar' : 'bar'; 
    const isHorizontal = candidatesData.length > 5;
    
    // Create configuration
    const config = {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: 'Votes',
                data: votes,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: isHorizontal ? 'y' : 'x',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(2) + '%' : '0%';
                            return `Votes: ${value} (${percentage})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    grid: {
                        display: !isHorizontal
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    grid: {
                        display: isHorizontal
                    }
                }
            }
        }
    };
    
    // Create chart instance
    charts.resultsChart = new Chart(chartCanvas, config);
    
    return charts.resultsChart;
}

/**
 * Create a donut/pie chart showing voting turnout
 * 
 * @param {number} voted - Number of people who voted
 * @param {number} total - Total eligible voters
 * @param {string} chartId - DOM ID of the canvas element
 */
function createTurnoutChart(voted, total, chartId = 'turnoutChart') {
    // Check if the chart container exists
    const chartCanvas = document.getElementById(chartId);
    if (!chartCanvas) return;
    
    // Destroy existing chart if it exists
    if (charts.turnoutChart) {
        charts.turnoutChart.destroy();
    }
    
    // Use a placeholder value if total is not provided or is zero
    if (!total || total <= 0) {
        total = voted > 0 ? voted : 100; // If no votes, use 100 as placeholder
    }
    
    // Calculate turnout percentage
    const turnoutPercentage = Math.min(100, (voted / total) * 100).toFixed(1);
    const notVoted = Math.max(0, total - voted);
    
    // Create chart
    charts.turnoutChart = new Chart(chartCanvas, {
        type: 'doughnut',
        data: {
            labels: ['Voted', 'Not Voted'],
            datasets: [{
                data: [voted, notVoted],
                backgroundColor: ['rgba(22, 163, 74, 0.7)', 'rgba(226, 232, 240, 0.7)'],
                borderColor: ['rgba(22, 163, 74, 1)', 'rgba(226, 232, 240, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const percentage = ((value / total) * 100).toFixed(1) + '%';
                            return `${label}: ${value} (${percentage})`;
                        }
                    }
                }
            }
        }
    });
    
    return charts.turnoutChart;
}

/**
 * Create a timeline chart showing votes over time
 * 
 * @param {Array} timeData - Array of objects with time and vote counts
 * @param {string} chartId - DOM ID of the canvas element
 */
function createVoteTimelineChart(timeData, chartId = 'timelineChart') {
    // Check if the chart container exists
    const chartCanvas = document.getElementById(chartId);
    if (!chartCanvas) return;
    
    // Destroy existing chart if it exists
    if (charts.timelineChart) {
        charts.timelineChart.destroy();
    }
    
    // If no data provided, create sample data
    if (!timeData || timeData.length === 0) {
        const now = new Date();
        timeData = Array.from({ length: 24 }, (_, i) => {
            const time = new Date(now);
            time.setHours(now.getHours() - 23 + i);
            return {
                time: time,
                votes: Math.floor(Math.random() * 20) // Random sample data
            };
        });
    }
    
    // Format dates for display
    const formattedLabels = timeData.map(item => {
        const date = new Date(item.time);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    
    // Cumulative votes data
    let cumulativeVotes = [];
    let runningTotal = 0;
    timeData.forEach(item => {
        runningTotal += item.votes;
        cumulativeVotes.push(runningTotal);
    });
    
    // Create chart
    charts.timelineChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: formattedLabels,
            datasets: [
                {
                    label: 'Votes Per Hour',
                    data: timeData.map(item => item.votes),
                    backgroundColor: 'rgba(14, 165, 233, 0.5)',
                    borderColor: 'rgba(14, 165, 233, 1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    yAxisID: 'y'
                },
                {
                    label: 'Total Votes',
                    data: cumulativeVotes,
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    borderColor: 'rgba(168, 85, 247, 1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Votes Per Hour'
                    },
                    beginAtZero: true
                },
                y1: {
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Total Votes'
                    },
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
    
    return charts.timelineChart;
}

/**
 * Generate visually distinct colors for chart elements
 * 
 * @param {number} count - Number of colors needed
 * @returns {Array} Array of RGBA color strings
 */
function generateChartColors(count) {
    // Predefined colors for better visual appearance
    const baseColors = [
        'rgba(14, 165, 233, 0.7)',  // Sky blue
        'rgba(168, 85, 247, 0.7)',  // Purple
        'rgba(234, 88, 12, 0.7)',   // Orange
        'rgba(22, 163, 74, 0.7)',   // Green
        'rgba(225, 29, 72, 0.7)',   // Red
        'rgba(20, 184, 166, 0.7)',  // Teal
        'rgba(245, 158, 11, 0.7)',  // Amber
        'rgba(236, 72, 153, 0.7)',  // Pink
        'rgba(79, 70, 229, 0.7)',   // Indigo
        'rgba(156, 163, 175, 0.7)', // Gray
        'rgba(16, 185, 129, 0.7)',  // Emerald
        'rgba(217, 70, 239, 0.7)',  // Fuchsia
    ];
    
    // If we need more colors than in our predefined list, generate them
    if (count > baseColors.length) {
        // Generate colors using HSL for better distribution
        const generatedColors = [];
        const hueStep = 360 / (count - baseColors.length);
        
        for (let i = 0; i < count - baseColors.length; i++) {
            const hue = Math.floor(i * hueStep);
            generatedColors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
        }
        
        return [...baseColors, ...generatedColors];
    }
    
    return baseColors.slice(0, count);
}

// Export functions for use in main application
window.chartVisualization = {
    createElectionResultsChart,
    createTurnoutChart,
    createVoteTimelineChart,
    generateChartColors
};