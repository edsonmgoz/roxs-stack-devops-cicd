// API Testing functionality for Roxs Stack DevOps CI/CD
class APITester {
    constructor() {
        this.baseURL = window.location.origin;
        this.requestHistory = [];
        this.init();
    }

    init() {
        console.log('🔧 API Tester initialized');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Enter key support for inputs
        document.getElementById('dataContent')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createData();
        });

        document.getElementById('userEmail')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createUser();
        });

        document.getElementById('customEndpoint')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.customRequest();
        });
    }

    async testEndpoint(endpoint, method = 'GET', data = null) {
        try {
            this.showLoading(true);
            this.logRequest(method, endpoint, data);

            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                options.body = JSON.stringify(data);
            }

            const startTime = performance.now();
            const response = await fetch(`${this.baseURL}${endpoint}`, options);
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);

            let responseData;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            const result = {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                data: responseData,
                responseTime: responseTime,
                timestamp: new Date().toISOString()
            };

            this.displayResponse(result, response.ok);
            this.addToHistory(method, endpoint, result, response.ok);

            if (response.ok) {
                this.showToast(`✅ ${method} ${endpoint} - ${responseTime}ms`, 'success');
            } else {
                this.showToast(`❌ ${method} ${endpoint} - ${response.status}`, 'error');
            }

            return result;

        } catch (error) {
            console.error('API Test Error:', error);
            const errorResult = {
                error: error.message,
                timestamp: new Date().toISOString()
            };
            this.displayResponse(errorResult, false);
            this.showToast(`❌ Request failed: ${error.message}`, 'error');
            return errorResult;
        } finally {
            this.showLoading(false);
        }
    }

    async createData() {
        const contentInput = document.getElementById('dataContent');
        const content = contentInput?.value.trim();

        if (!content) {
            this.showToast('⚠️ Please enter some content', 'warning');
            return;
        }

        const data = {
            content: content,
            type: 'user_created',
            metadata: {
                source: 'web_interface',
                timestamp: new Date().toISOString()
            }
        };

        const result = await this.testEndpoint('/api/data', 'POST', data);
        
        if (result.status === 201) {
            contentInput.value = '';
            this.showToast('✅ Data created successfully!', 'success');
        }

        return result;
    }

    async createUser() {
        const nameInput = document.getElementById('userName');
        const emailInput = document.getElementById('userEmail');
        
        const name = nameInput?.value.trim();
        const email = emailInput?.value.trim();

        if (!name || !email) {
            this.showToast('⚠️ Please enter both name and email', 'warning');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showToast('⚠️ Please enter a valid email address', 'warning');
            return;
        }

        const userData = {
            name: name,
            email: email,
            role: 'user'
        };

        const result = await this.testEndpoint('/api/users', 'POST', userData);
        
        if (result.status === 201) {
            nameInput.value = '';
            emailInput.value = '';
            this.showToast('✅ User created successfully!', 'success');
        }

        return result;
    }

    async customRequest() {
        const methodSelect = document.getElementById('requestMethod');
        const endpointInput = document.getElementById('customEndpoint');
        
        const method = methodSelect?.value || 'GET';
        const endpoint = endpointInput?.value.trim();

        if (!endpoint) {
            this.showToast('⚠️ Please enter an endpoint', 'warning');
            return;
        }

        // Ensure endpoint starts with /
        const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

        const result = await this.testEndpoint(normalizedEndpoint, method);
        return result;
    }

    async seedTestData() {
        try {
            this.showToast('🌱 Seeding test data...', 'info');
            const result = await this.testEndpoint('/api/test/seed', 'POST');
            
            if (result.status === 200) {
                this.showToast('✅ Test data seeded successfully!', 'success');
            }
            
            return result;
        } catch (error) {
            this.showToast('❌ Failed to seed test data', 'error');
            return error;
        }
    }

    displayResponse(response, isSuccess = true) {
        const responseElement = document.getElementById('apiResponse');
        if (!responseElement) return;

        const formattedResponse = this.formatJSON(response);
        const statusClass = isSuccess ? 'text-success' : 'text-danger';
        const statusIcon = isSuccess ? '✅' : '❌';

        responseElement.innerHTML = `
            <div class="mb-2">
                <span class="${statusClass}">${statusIcon} Response:</span>
                ${response.responseTime ? `<span class="text-info ms-2">⚡ ${response.responseTime}ms</span>` : ''}
            </div>
            <pre style="color: #f8f8f2; margin: 0;">${formattedResponse}</pre>
        `;

        // Scroll to response
        responseElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    formatJSON(obj) {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (error) {
            return String(obj);
        }
    }

    logRequest(method, endpoint, data) {
        console.log(`🔄 API Request: ${method} ${endpoint}`, data ? { data } : '');
    }

    addToHistory(method, endpoint, result, success) {
        const historyItem = {
            method,
            endpoint,
            success,
            status: result.status,
            responseTime: result.responseTime,
            timestamp: result.timestamp
        };

        this.requestHistory.unshift(historyItem);
        
        // Keep only last 50 requests
        if (this.requestHistory.length > 50) {
            this.requestHistory = this.requestHistory.slice(0, 50);
        }
    }

    getRequestHistory() {
        return this.requestHistory;
    }

    clearHistory() {
        this.requestHistory = [];
        this.showToast('🗑️ Request history cleared', 'info');
    }

    showLoading(show) {
        const responseElement = document.getElementById('apiResponse');
        if (!responseElement) return;

        if (show) {
            responseElement.innerHTML = `
                <div class="text-center text-info">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    Loading...
                </div>
            `;
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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
            'error': 'bg-danger',
            'warning': 'bg-warning',
            'info': 'bg-info'
        }[type] || 'bg-info';

        const icon = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        }[type] || 'ℹ️';

        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        ${icon} ${message}
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

    // Batch testing functionality
    async runBatchTests() {
        const tests = [
            { name: 'Health Check', method: 'GET', endpoint: '/health' },
            { name: 'API Status', method: 'GET', endpoint: '/api/status' },
            { name: 'Version Info', method: 'GET', endpoint: '/api/version' },
            { name: 'Metrics', method: 'GET', endpoint: '/api/metrics' },
            { name: 'Users List', method: 'GET', endpoint: '/api/users' },
            { name: 'Data List', method: 'GET', endpoint: '/api/data' }
        ];

        this.showToast('🚀 Running batch tests...', 'info');
        
        const results = [];
        for (const test of tests) {
            try {
                const result = await this.testEndpoint(test.endpoint, test.method);
                results.push({
                    ...test,
                    success: result.status >= 200 && result.status < 400,
                    responseTime: result.responseTime,
                    status: result.status
                });
                
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                results.push({
                    ...test,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        this.displayBatchResults(results);
        this.showToast(`✅ Batch tests completed: ${successCount}/${totalCount} passed`, 
                      successCount === totalCount ? 'success' : 'warning');

        return results;
    }

    displayBatchResults(results) {
        const responseElement = document.getElementById('apiResponse');
        if (!responseElement) return;

        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;

        let html = `
            <div class="mb-3">
                <h6>🧪 Batch Test Results (${successCount}/${totalCount} passed)</h6>
            </div>
            <div class="table-responsive">
                <table class="table table-sm table-dark">
                    <thead>
                        <tr>
                            <th>Test</th>
                            <th>Method</th>
                            <th>Endpoint</th>
                            <th>Status</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        results.forEach(result => {
            const statusIcon = result.success ? '✅' : '❌';
            const statusClass = result.success ? 'text-success' : 'text-danger';
            
            html += `
                <tr>
                    <td>${result.name}</td>
                    <td><code>${result.method}</code></td>
                    <td><code>${result.endpoint}</code></td>
                    <td class="${statusClass}">${statusIcon} ${result.status || 'Error'}</td>
                    <td>${result.responseTime ? result.responseTime + 'ms' : 'N/A'}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        responseElement.innerHTML = html;
    }

    // Export functionality
    exportHistory() {
        const data = {
            exportDate: new Date().toISOString(),
            totalRequests: this.requestHistory.length,
            history: this.requestHistory
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `api-test-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('📥 History exported successfully!', 'success');
    }
}

// Global API tester instance
let apiTesterInstance = null;

// Initialize API tester when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    apiTesterInstance = new APITester();
});

// Global functions for the UI
function testEndpoint(endpoint) {
    if (apiTesterInstance) {
        return apiTesterInstance.testEndpoint(endpoint);
    }
}

function createData() {
    if (apiTesterInstance) {
        return apiTesterInstance.createData();
    }
}

function createUser() {
    if (apiTesterInstance) {
        return apiTesterInstance.createUser();
    }
}

function customRequest() {
    if (apiTesterInstance) {
        return apiTesterInstance.customRequest();
    }
}

function seedTestData() {
    if (apiTesterInstance) {
        return apiTesterInstance.seedTestData();
    }
}

function testAPI() {
    if (apiTesterInstance) {
        return apiTesterInstance.runBatchTests();
    }
}
