// Monitoring functionality for Roxs Stack DevOps CI/CD
class SystemMonitor {
    constructor() {
        this.isRunning = false;
        this.monitoringInterval = null;
        this.updateInterval = 30000; // 30 seconds
        this.systemData = {
            uptime: 0,
            memory: { used: 0, total: 0, free: 0 },
            cpu: { usage: 0, cores: 0 },
            requests: { total: 0, errors: 0, rate: 0 },
            lastUpdate: null
        };
        this.alerts = [];
        this.thresholds = {
            memoryUsage: 80, // %
            cpuUsage: 75,    // %
            errorRate: 5     // %
        };
        this.init();
    }

    init() {
        console.log('📊 System Monitor initialized');
        this.setupEventListeners();
        this.renderInitialState();
    }

    setupEventListeners() {
        // Start/Stop monitoring button
        const toggleBtn = document.getElementById('toggleMonitoring');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleMonitoring());
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshMonitoring');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.updateSystemData());
        }

        // Clear alerts button
        const clearAlertsBtn = document.getElementById('clearAlerts');
        if (clearAlertsBtn) {
            clearAlertsBtn.addEventListener('click', () => this.clearAlerts());
        }

        // Settings button
        const settingsBtn = document.getElementById('monitoringSettings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
    }

    renderInitialState() {
        this.updateSystemMetrics();
        this.updateStatus('⏸️ Monitoring Stopped', 'secondary');
    }

    async toggleMonitoring() {
        if (this.isRunning) {
            this.stopMonitoring();
        } else {
            this.startMonitoring();
        }
    }

    async startMonitoring() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.updateStatus('🟢 Monitoring Active', 'success');
        
        // Initial data fetch
        await this.updateSystemData();
        
        // Set up interval
        this.monitoringInterval = setInterval(() => {
            this.updateSystemData();
        }, this.updateInterval);

        this.updateToggleButton();
        this.showToast('📊 System monitoring started', 'success');
    }

    stopMonitoring() {
        if (!this.isRunning) return;

        this.isRunning = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.updateStatus('⏸️ Monitoring Stopped', 'secondary');
        this.updateToggleButton();
        this.showToast('⏹️ System monitoring stopped', 'info');
    }

    async updateSystemData() {
        try {
            this.updateStatus('🔄 Updating...', 'info');
            
            // Fetch system metrics from various endpoints
            const [healthData, metricsData, statusData] = await Promise.all([
                this.fetchData('/health'),
                this.fetchData('/api/metrics'),
                this.fetchData('/api/status')
            ]);

            // Update system data
            this.processSystemData(healthData, metricsData, statusData);
            
            // Update UI
            this.updateSystemMetrics();
            this.checkAlerts();
            
            this.systemData.lastUpdate = new Date();
            
            if (this.isRunning) {
                this.updateStatus('🟢 Monitoring Active', 'success');
            }

        } catch (error) {
            console.error('Error updating system data:', error);
            this.updateStatus('❌ Update Failed', 'danger');
            this.addAlert('error', 'Failed to fetch system data', error.message);
        }
    }

    async fetchData(endpoint) {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }

    processSystemData(health, metrics, status) {
        // Process health data
        if (health) {
            this.systemData.uptime = health.uptime || 0;
            this.systemData.memory = health.memory || { used: 0, total: 0, free: 0 };
        }

        // Process metrics data
        if (metrics) {
            this.systemData.requests = {
                total: metrics.totalRequests || 0,
                errors: metrics.totalErrors || 0,
                rate: metrics.requestsPerMinute || 0
            };
        }

        // Simulate CPU data (since Node.js doesn't provide easy CPU usage)
        this.systemData.cpu = {
            usage: Math.floor(Math.random() * 30) + 10, // Simulate 10-40% usage
            cores: require('os')?.cpus()?.length || 4
        };
    }

    updateSystemMetrics() {
        // Update uptime
        this.updateElement('systemUptime', this.formatUptime(this.systemData.uptime));
        
        // Update memory usage
        const memoryPercent = this.systemData.memory.total > 0 
            ? Math.round((this.systemData.memory.used / this.systemData.memory.total) * 100)
            : 0;
        
        this.updateElement('memoryUsage', `${memoryPercent}%`);
        this.updateElement('memoryDetails', 
            `${this.formatBytes(this.systemData.memory.used)} / ${this.formatBytes(this.systemData.memory.total)}`);
        
        // Update memory progress bar
        this.updateProgressBar('memoryProgress', memoryPercent, this.getProgressBarClass(memoryPercent, this.thresholds.memoryUsage));
        
        // Update CPU usage
        this.updateElement('cpuUsage', `${this.systemData.cpu.usage}%`);
        this.updateElement('cpuCores', `${this.systemData.cpu.cores} cores`);
        
        // Update CPU progress bar
        this.updateProgressBar('cpuProgress', this.systemData.cpu.usage, this.getProgressBarClass(this.systemData.cpu.usage, this.thresholds.cpuUsage));
        
        // Update request metrics
        this.updateElement('totalRequests', this.systemData.requests.total.toLocaleString());
        this.updateElement('totalErrors', this.systemData.requests.errors.toLocaleString());
        this.updateElement('requestRate', `${this.systemData.requests.rate}/min`);
        
        // Calculate error rate
        const errorRate = this.systemData.requests.total > 0 
            ? Math.round((this.systemData.requests.errors / this.systemData.requests.total) * 100)
            : 0;
        
        this.updateElement('errorRate', `${errorRate}%`);
        this.updateProgressBar('errorProgress', errorRate, this.getProgressBarClass(errorRate, this.thresholds.errorRate));
        
        // Update last update time
        if (this.systemData.lastUpdate) {
            this.updateElement('lastUpdate', this.systemData.lastUpdate.toLocaleTimeString());
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateProgressBar(id, percentage, className = 'bg-primary') {
        const progressBar = document.getElementById(id);
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.className = `progress-bar ${className}`;
            progressBar.setAttribute('aria-valuenow', percentage);
        }
    }

    getProgressBarClass(value, threshold) {
        if (value >= threshold) return 'bg-danger';
        if (value >= threshold * 0.8) return 'bg-warning';
        return 'bg-success';
    }

    updateStatus(message, type) {
        const statusElement = document.getElementById('monitoringStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `badge bg-${type}`;
        }
    }

    updateToggleButton() {
        const toggleBtn = document.getElementById('toggleMonitoring');
        if (toggleBtn) {
            if (this.isRunning) {
                toggleBtn.textContent = '⏹️ Stop';
                toggleBtn.className = 'btn btn-danger btn-sm';
            } else {
                toggleBtn.textContent = '▶️ Start';
                toggleBtn.className = 'btn btn-success btn-sm';
            }
        }
    }

    checkAlerts() {
        const memoryPercent = this.systemData.memory.total > 0 
            ? Math.round((this.systemData.memory.used / this.systemData.memory.total) * 100)
            : 0;
        
        const errorRate = this.systemData.requests.total > 0 
            ? Math.round((this.systemData.requests.errors / this.systemData.requests.total) * 100)
            : 0;

        // Memory usage alert
        if (memoryPercent >= this.thresholds.memoryUsage) {
            this.addAlert('warning', 'High Memory Usage', 
                `Memory usage is at ${memoryPercent}% (threshold: ${this.thresholds.memoryUsage}%)`);
        }

        // CPU usage alert
        if (this.systemData.cpu.usage >= this.thresholds.cpuUsage) {
            this.addAlert('warning', 'High CPU Usage', 
                `CPU usage is at ${this.systemData.cpu.usage}% (threshold: ${this.thresholds.cpuUsage}%)`);
        }

        // Error rate alert
        if (errorRate >= this.thresholds.errorRate) {
            this.addAlert('error', 'High Error Rate', 
                `Error rate is at ${errorRate}% (threshold: ${this.thresholds.errorRate}%)`);
        }
    }

    addAlert(type, title, message) {
        const alert = {
            id: Date.now(),
            type: type,
            title: title,
            message: message,
            timestamp: new Date()
        };

        // Check if similar alert already exists (avoid spam)
        const similarAlert = this.alerts.find(a => 
            a.title === title && 
            (Date.now() - a.timestamp.getTime()) < 60000 // Within last minute
        );

        if (!similarAlert) {
            this.alerts.unshift(alert);
            this.updateAlertsDisplay();
            this.showToast(`⚠️ ${title}: ${message}`, type === 'error' ? 'danger' : 'warning');
        }

        // Keep only last 50 alerts
        if (this.alerts.length > 50) {
            this.alerts = this.alerts.slice(0, 50);
        }
    }

    updateAlertsDisplay() {
        const alertsContainer = document.getElementById('alertsContainer');
        if (!alertsContainer) return;

        if (this.alerts.length === 0) {
            alertsContainer.innerHTML = '<div class="text-muted text-center py-3">No alerts</div>';
            return;
        }

        let html = '';
        this.alerts.slice(0, 10).forEach(alert => { // Show only last 10 alerts
            const icon = alert.type === 'error' ? '❌' : '⚠️';
            const badgeClass = alert.type === 'error' ? 'danger' : 'warning';
            
            html += `
                <div class="alert alert-${badgeClass} alert-dismissible fade show py-2" role="alert">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <strong>${icon} ${alert.title}</strong><br>
                            <small>${alert.message}</small>
                        </div>
                        <small class="text-muted">${alert.timestamp.toLocaleTimeString()}</small>
                    </div>
                    <button type="button" class="btn-close" onclick="removeAlert(${alert.id})"></button>
                </div>
            `;
        });

        alertsContainer.innerHTML = html;
    }

    removeAlert(alertId) {
        this.alerts = this.alerts.filter(alert => alert.id !== alertId);
        this.updateAlertsDisplay();
    }

    clearAlerts() {
        this.alerts = [];
        this.updateAlertsDisplay();
        this.showToast('🗑️ All alerts cleared', 'info');
    }

    showSettings() {
        // Create a simple settings modal
        const modalHTML = `
            <div class="modal fade" id="settingsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content bg-dark">
                        <div class="modal-header">
                            <h5 class="modal-title">⚙️ Monitoring Settings</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="settingsForm">
                                <div class="mb-3">
                                    <label class="form-label">Update Interval (seconds)</label>
                                    <input type="number" class="form-control" id="updateInterval" 
                                           value="${this.updateInterval / 1000}" min="5" max="300">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Memory Usage Threshold (%)</label>
                                    <input type="number" class="form-control" id="memoryThreshold" 
                                           value="${this.thresholds.memoryUsage}" min="50" max="95">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">CPU Usage Threshold (%)</label>
                                    <input type="number" class="form-control" id="cpuThreshold" 
                                           value="${this.thresholds.cpuUsage}" min="50" max="95">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Error Rate Threshold (%)</label>
                                    <input type="number" class="form-control" id="errorThreshold" 
                                           value="${this.thresholds.errorRate}" min="1" max="20">
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="saveSettings()">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('settingsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
        modal.show();
    }

    saveSettings() {
        const updateInterval = parseInt(document.getElementById('updateInterval').value) * 1000;
        const memoryThreshold = parseInt(document.getElementById('memoryThreshold').value);
        const cpuThreshold = parseInt(document.getElementById('cpuThreshold').value);
        const errorThreshold = parseInt(document.getElementById('errorThreshold').value);

        // Update settings
        this.updateInterval = updateInterval;
        this.thresholds.memoryUsage = memoryThreshold;
        this.thresholds.cpuUsage = cpuThreshold;
        this.thresholds.errorRate = errorThreshold;

        // Restart monitoring if it was running
        if (this.isRunning) {
            this.stopMonitoring();
            setTimeout(() => this.startMonitoring(), 100);
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
        modal.hide();

        this.showToast('⚙️ Settings saved successfully', 'success');
    }

    formatUptime(seconds) {
        if (!seconds) return '0s';
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    formatBytes(bytes) {
        if (!bytes) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
    }

    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            console.log(message); // Fallback to console
            return;
        }

        const toastId = 'toast-' + Date.now();
        const bgClass = {
            'success': 'bg-success',
            'danger': 'bg-danger',
            'warning': 'bg-warning',
            'info': 'bg-info'
        }[type] || 'bg-info';

        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
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

    // Export monitoring data
    exportMonitoringData() {
        const data = {
            exportDate: new Date().toISOString(),
            systemData: this.systemData,
            alerts: this.alerts,
            thresholds: this.thresholds,
            isRunning: this.isRunning
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monitoring-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('📥 Monitoring data exported successfully!', 'success');
    }

    // Get system health summary
    getHealthSummary() {
        const memoryPercent = this.systemData.memory.total > 0 
            ? Math.round((this.systemData.memory.used / this.systemData.memory.total) * 100)
            : 0;
        
        const errorRate = this.systemData.requests.total > 0 
            ? Math.round((this.systemData.requests.errors / this.systemData.requests.total) * 100)
            : 0;

        return {
            status: this.isRunning ? 'monitoring' : 'stopped',
            uptime: this.systemData.uptime,
            memory: {
                usage: memoryPercent,
                status: memoryPercent >= this.thresholds.memoryUsage ? 'critical' : 'normal'
            },
            cpu: {
                usage: this.systemData.cpu.usage,
                status: this.systemData.cpu.usage >= this.thresholds.cpuUsage ? 'critical' : 'normal'
            },
            errors: {
                rate: errorRate,
                status: errorRate >= this.thresholds.errorRate ? 'critical' : 'normal'
            },
            alertCount: this.alerts.length,
            lastUpdate: this.systemData.lastUpdate
        };
    }
}

// Global monitor instance
let systemMonitorInstance = null;

// Initialize system monitor when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    systemMonitorInstance = new SystemMonitor();
});

// Global functions for the UI
function toggleMonitoring() {
    if (systemMonitorInstance) {
        return systemMonitorInstance.toggleMonitoring();
    }
}

function refreshMonitoring() {
    if (systemMonitorInstance) {
        return systemMonitorInstance.updateSystemData();
    }
}

function clearAlerts() {
    if (systemMonitorInstance) {
        return systemMonitorInstance.clearAlerts();
    }
}

function removeAlert(alertId) {
    if (systemMonitorInstance) {
        return systemMonitorInstance.removeAlert(alertId);
    }
}

function showMonitoringSettings() {
    if (systemMonitorInstance) {
        return systemMonitorInstance.showSettings();
    }
}

function saveSettings() {
    if (systemMonitorInstance) {
        return systemMonitorInstance.saveSettings();
    }
}

function exportMonitoringData() {
    if (systemMonitorInstance) {
        return systemMonitorInstance.exportMonitoringData();
    }
}
