// Dashboard functionality for Roxs Stack DevOps CI/CD
class Dashboard {
    constructor() {
        this.performanceChart = null;
        this.statusChart = null;
        this.updateInterval = null;
        this.metricsHistory = {
            responseTime: [],
            requests: [],
            memory: [],
            timestamps: []
        };
        this.init();
    }

    async init() {
        try {
            await this.loadInitialData();
            this.initializeCharts();
            this.startAutoUpdate();
            console.log('✅ Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.showToast('Dashboard initialization failed', 'error');
        }
    }

    async loadInitialData() {
        try {
            // Load version and environment info
            const versionData = await this.fetchAPI('/api/version');
            this.updateVersionInfo(versionData);

            // Load initial metrics
            await this.updateDashboardData();
        } catch (error) {
            console.error('Error loading initial data:', error);
            throw error;
        }
    }

    async updateDashboardData() {
        try {
            const [healthData, statusData, metricsData] = await Promise.all([
                this.fetchAPI('/health'),
                this.fetchAPI('/api/status'),
                this.fetchAPI('/api/metrics')
            ]);

            this.updateHealthStatus(healthData);
            this.updateStatusMetrics(statusData);
            this.updateSystemMetrics(metricsData);
            this.updateMetricsHistory(metricsData);
            this.updateCharts();

        } catch (error) {
            console.error('Error updating dashboard:', error);
            this.showToast('Failed to update dashboard metrics', 'error');
        }
    }

    updateVersionInfo(data) {
        const elements = {
            'app-version': data.version,
            'app-environment': data.environment,
            'footer-version': data.version,
            'footer-environment': data.environment
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    updateHealthStatus(data) {
        const statusElement = document.getElementById('health-status');
        const uptimeElement = document.getElementById('uptime-display');
        const footerUptimeElement = document.getElementById('footer-uptime');

        if (statusElement) {
            statusElement.textContent = data.status === 'healthy' ? 'Healthy' : 'Unhealthy';
            statusElement.className = `badge fs-6 ${data.status === 'healthy' ? 'bg-success' : 'bg-danger'}`;
        }

        const uptime = this.formatUptime(data.uptime);
        if (uptimeElement) uptimeElement.textContent = `Uptime: ${uptime}`;
        if (footerUptimeElement) footerUptimeElement.textContent = `Uptime: ${uptime}`;
    }

    updateStatusMetrics(data) {
        const elements = {
            'total-requests': data.requests_total || 0,
            'success-rate': `${Math.round((data.requests_total > 0 ? (data.requests_total - (data.errors || 0)) / data.requests_total : 1) * 100)}%`,
            'avg-response': `${data.response_time_avg || 0}ms`,
            'requests-per-minute': data.requests_per_minute || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    updateSystemMetrics(data) {
        if (data.system && data.system.memory) {
            const memoryUsage = data.system.memory.usage_percent || 0;
            const memoryUsed = Math.round(data.system.memory.process?.heap_used_mb || 0);
            const memoryTotal = Math.round(data.system.memory.process?.heap_total_mb || 0);

            const memoryElement = document.getElementById('memory-usage');
            const memoryDetailsElement = document.getElementById('memory-details');

            if (memoryElement) {
                memoryElement.textContent = `${memoryUsage}%`;
                memoryElement.className = `h4 ${memoryUsage > 80 ? 'text-danger' : memoryUsage > 60 ? 'text-warning' : 'text-warning'}`;
            }

            if (memoryDetailsElement) {
                memoryDetailsElement.textContent = `${memoryUsed} MB / ${memoryTotal} MB`;
            }
        }
    }

    updateMetricsHistory(data) {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString();

        // Add new data point
        this.metricsHistory.timestamps.push(timeLabel);
        this.metricsHistory.responseTime.push(data.application?.performance?.average_response_time_ms || 0);
        this.metricsHistory.requests.push(data.application?.requests?.per_minute || 0);
        this.metricsHistory.memory.push(data.system?.memory?.usage_percent || 0);

        // Keep only last 20 points
        const maxPoints = 20;
        Object.keys(this.metricsHistory).forEach(key => {
            if (this.metricsHistory[key].length > maxPoints) {
                this.metricsHistory[key] = this.metricsHistory[key].slice(-maxPoints);
            }
        });
    }

    initializeCharts() {
        this.initPerformanceChart();
        this.initStatusChart();
    }

    initPerformanceChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        this.performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.metricsHistory.timestamps,
                datasets: [
                    {
                        label: 'Response Time (ms)',
                        data: this.metricsHistory.responseTime,
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Requests/min',
                        data: this.metricsHistory.requests,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Memory Usage (%)',
                        data: this.metricsHistory.memory,
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y2'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Real-time Performance Metrics'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Response Time (ms)',
                            color: '#007bff'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Requests/min',
                            color: '#28a745'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                    y2: {
                        type: 'linear',
                        display: false,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Memory %',
                            color: '#ffc107'
                        }
                    }
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    initStatusChart() {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;

        this.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Success (2xx)', 'Client Errors (4xx)', 'Server Errors (5xx)', 'Redirects (3xx)'],
                datasets: [{
                    data: [85, 10, 3, 2], // Initial dummy data
                    backgroundColor: [
                        '#28a745', // Success - Green
                        '#ffc107', // Client errors - Yellow
                        '#dc3545', // Server errors - Red
                        '#17a2b8'  // Redirects - Blue
                    ],
                    borderColor: [
                        '#1e7e34',
                        '#e0a800',
                        '#c82333',
                        '#138496'
                    ],
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'HTTP Status Code Distribution'
                    },
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value}% (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000
                }
            }
        });
    }

    updateCharts() {
        if (this.performanceChart) {
            this.performanceChart.data.labels = this.metricsHistory.timestamps;
            this.performanceChart.data.datasets[0].data = this.metricsHistory.responseTime;
            this.performanceChart.data.datasets[1].data = this.metricsHistory.requests;
            this.performanceChart.data.datasets[2].data = this.metricsHistory.memory;
            this.performanceChart.update('none');
        }

        if (this.statusChart) {
            // Update status chart with real data from metrics
            this.updateStatusChartData();
        }
    }

    async updateStatusChartData() {
        try {
            const metricsData = await this.fetchAPI('/api/metrics');
            if (metricsData.application && metricsData.application.requests) {
                const requests = metricsData.application.requests;
                const total = requests.total || 1;
                const success = requests.success || 0;
                const errors = requests.errors || 0;
                
                // Calculate percentages
                const successPercent = Math.round((success / total) * 100);
                const errorPercent = Math.round((errors / total) * 100);
                const redirectPercent = Math.max(0, Math.round(Math.random() * 5)); // Simulated
                const clientErrorPercent = Math.max(0, 100 - successPercent - errorPercent - redirectPercent);

                this.statusChart.data.datasets[0].data = [
                    successPercent,
                    clientErrorPercent,
                    errorPercent,
                    redirectPercent
                ];
                this.statusChart.update('none');
            }
        } catch (error) {
            console.error('Error updating status chart:', error);
        }
    }

    startAutoUpdate() {
        // Update every 10 seconds
        this.updateInterval = setInterval(() => {
            this.updateDashboardData();
        }, 10000);

        console.log('🔄 Auto-update started (10s interval)');
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('⏹️ Auto-update stopped');
        }
    }

    async fetchAPI(endpoint) {
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API fetch error for ${endpoint}:`, error);
            throw error;
        }
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) return;

        const toastId = 'toast-' + Date.now();
        const bgClass = {
            'success': 'bg-success',
            'error': 'bg-danger',
            'warning': 'bg-warning',
            'info': 'bg-info'
        }[type] || 'bg-info';

        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        const toast = new bootstrap.Toast(document.getElementById(toastId));
        toast.show();

        // Remove toast element after it's hidden
        document.getElementById(toastId).addEventListener('hidden.bs.toast', function() {
            this.remove();
        });
    }

    // Public method to manually refresh data
    async refresh() {
        try {
            this.showToast('Refreshing dashboard data...', 'info');
            await this.updateDashboardData();
            this.showToast('Dashboard refreshed successfully!', 'success');
        } catch (error) {
            this.showToast('Failed to refresh dashboard', 'error');
        }
    }

    // Destroy dashboard and cleanup
    destroy() {
        this.stopAutoUpdate();
        if (this.performanceChart) {
            this.performanceChart.destroy();
            this.performanceChart = null;
        }
        if (this.statusChart) {
            this.statusChart.destroy();
            this.statusChart = null;
        }
        console.log('🗑️ Dashboard destroyed and cleaned up');
    }
}

// Global dashboard instance
let dashboardInstance = null;

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    dashboardInstance = new Dashboard();
});

// Global function for manual refresh
function loadDashboardData() {
    if (dashboardInstance) {
        dashboardInstance.refresh();
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (dashboardInstance) {
        dashboardInstance.destroy();
    }
});
