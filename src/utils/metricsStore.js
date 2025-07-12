class MetricsStore {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        perMinute: 0,
        peakRPM: 0
      },
      performance: {
        responseTimes: [],
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0
      },
      recentRequests: []
    };

    // Calculate requests per minute every minute - only in non-test environment
    if (process.env.NODE_ENV !== 'test') {
      this.intervalId = setInterval(() => {
        this.calculateRequestsPerMinute();
      }, 60000);
    }
  }

  // Method to clear intervals for testing
  cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  recordRequest(requestData) {
    const { statusCode, responseTime, method, path, timestamp, ip, userAgent } = requestData;

    // Update request counts
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }

    // Update performance metrics
    this.metrics.performance.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times to prevent memory leak
    if (this.metrics.performance.responseTimes.length > 1000) {
      this.metrics.performance.responseTimes = this.metrics.performance.responseTimes.slice(-1000);
    }

    // Update min/max response times
    if (responseTime < this.metrics.performance.minResponseTime) {
      this.metrics.performance.minResponseTime = responseTime;
    }
    if (responseTime > this.metrics.performance.maxResponseTime) {
      this.metrics.performance.maxResponseTime = responseTime;
    }

    // Calculate average response time
    const total = this.metrics.performance.responseTimes.reduce((sum, time) => sum + time, 0);
    this.metrics.performance.averageResponseTime = Math.round(total / this.metrics.performance.responseTimes.length);

    // Store recent request data
    const recentRequest = {
      method,
      path,
      statusCode,
      responseTime,
      timestamp,
      ip: ip?.substring(0, 10) + '...' // Truncate IP for privacy
    };

    this.metrics.recentRequests.unshift(recentRequest);
    
    // Keep only last 50 requests
    if (this.metrics.recentRequests.length > 50) {
      this.metrics.recentRequests = this.metrics.recentRequests.slice(0, 50);
    }
  }

  calculateRequestsPerMinute() {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    // Count requests in the last minute
    const recentRequests = this.metrics.recentRequests.filter(req => {
      const requestTime = new Date(req.timestamp);
      return requestTime >= oneMinuteAgo;
    });

    this.metrics.requests.perMinute = recentRequests.length;

    // Update peak RPM
    if (this.metrics.requests.perMinute > this.metrics.requests.peakRPM) {
      this.metrics.requests.peakRPM = this.metrics.requests.perMinute;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString()
    };
  }

  resetMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        perMinute: 0,
        peakRPM: 0
      },
      performance: {
        responseTimes: [],
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0
      },
      recentRequests: []
    };
  }

  getHealthSummary() {
    const totalRequests = this.metrics.requests.total;
    const successRate = totalRequests > 0 
      ? Math.round((this.metrics.requests.success / totalRequests) * 100) 
      : 100;

    return {
      healthy: successRate >= 95 && this.metrics.performance.averageResponseTime < 1000,
      successRate,
      averageResponseTime: this.metrics.performance.averageResponseTime,
      totalRequests,
      errors: this.metrics.requests.errors
    };
  }

  // Get metrics for specific time period
  getMetricsForPeriod(minutes = 5) {
    const now = new Date();
    const periodAgo = new Date(now.getTime() - (minutes * 60000));

    const periodRequests = this.metrics.recentRequests.filter(req => {
      const requestTime = new Date(req.timestamp);
      return requestTime >= periodAgo;
    });

    const periodSuccess = periodRequests.filter(req => req.statusCode >= 200 && req.statusCode < 400).length;
    const periodErrors = periodRequests.filter(req => req.statusCode >= 400).length;

    return {
      period: `${minutes} minutes`,
      requests: periodRequests.length,
      success: periodSuccess,
      errors: periodErrors,
      successRate: periodRequests.length > 0 
        ? Math.round((periodSuccess / periodRequests.length) * 100) 
        : 100,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const metricsStore = new MetricsStore();

module.exports = metricsStore;
