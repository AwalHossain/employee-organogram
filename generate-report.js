#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Define the log directory
const logsDir = path.join(__dirname, "logs");
const reportDir = path.join(__dirname, "reports");

// Create the reports directory if it doesn't exist
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

// Files to analyze
const responseTimesFile = path.join(logsDir, "response-times.log");
const cachePerformanceFile = path.join(logsDir, "cache-performance.log");
const errorLogFile = path.join(logsDir, "errors.log");
const progressLogFile = path.join(logsDir, "progress.log");

console.log("Generating comprehensive load test report...");

// Initialize metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  endpoints: {},
  responseTimes: {
    min: Number.MAX_SAFE_INTEGER,
    max: 0,
    total: 0,
    count: 0,
  },
  cachePerformance: {
    min: Number.MAX_SAFE_INTEGER,
    max: 0,
    total: 0,
    count: 0,
  },
  errors: {
    count: 0,
    types: {},
  },
};

// Process progress log to get overall metrics
if (fs.existsSync(progressLogFile)) {
  const progressData = fs.readFileSync(progressLogFile, "utf8");
  const lines = progressData.split("\n").filter((line) => line.trim() !== "");

  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    if (lastLine.includes("Progress:")) {
      const match = lastLine.match(
        /Progress: (\d+) total requests, (\d+) successful, (\d+) failed/
      );
      if (match) {
        metrics.totalRequests = parseInt(match[1]);
        metrics.successfulRequests = parseInt(match[2]);
        metrics.failedRequests = parseInt(match[3]);
      }
    }
  }
}

// Process response times log
if (fs.existsSync(responseTimesFile)) {
  const responseData = fs.readFileSync(responseTimesFile, "utf8");
  const lines = responseData.split("\n").filter((line) => line.trim() !== "");

  lines.forEach((line) => {
    // Parse response time entries
    const match = line.match(/\[(.*?)\] (.*?) - (.*?): (\d+)ms/);
    if (match) {
      const timestamp = match[1];
      const scenario = match[2];
      const endpoint = match[3];
      const responseTime = parseInt(match[4]);

      // Update endpoint metrics
      if (!metrics.endpoints[endpoint]) {
        metrics.endpoints[endpoint] = {
          min: Number.MAX_SAFE_INTEGER,
          max: 0,
          total: 0,
          count: 0,
          slow: 0, // response times > 500ms
        };
      }

      // Update endpoint stats
      const ep = metrics.endpoints[endpoint];
      ep.min = Math.min(ep.min, responseTime);
      ep.max = Math.max(ep.max, responseTime);
      ep.total += responseTime;
      ep.count++;
      if (responseTime > 500) ep.slow++;

      // Update overall response time stats
      metrics.responseTimes.min = Math.min(
        metrics.responseTimes.min,
        responseTime
      );
      metrics.responseTimes.max = Math.max(
        metrics.responseTimes.max,
        responseTime
      );
      metrics.responseTimes.total += responseTime;
      metrics.responseTimes.count++;
    }
  });
}

// Process cache performance log
if (fs.existsSync(cachePerformanceFile)) {
  const cacheData = fs.readFileSync(cachePerformanceFile, "utf8");
  const lines = cacheData.split("\n").filter((line) => line.trim() !== "");

  lines.forEach((line) => {
    // Parse cache performance entries
    const match = line.match(/\[(.*?)\] Cache endpoint: (.*?) - (\d+)ms/);
    if (match) {
      const timestamp = match[1];
      const endpoint = match[2];
      const responseTime = parseInt(match[3]);

      // Update cache stats
      metrics.cachePerformance.min = Math.min(
        metrics.cachePerformance.min,
        responseTime
      );
      metrics.cachePerformance.max = Math.max(
        metrics.cachePerformance.max,
        responseTime
      );
      metrics.cachePerformance.total += responseTime;
      metrics.cachePerformance.count++;
    }
  });
}

// Process error log
if (fs.existsSync(errorLogFile)) {
  const errorData = fs.readFileSync(errorLogFile, "utf8");
  const lines = errorData.split("\n").filter((line) => line.trim() !== "");

  metrics.errors.count = lines.length;

  lines.forEach((line) => {
    if (line.includes("ERROR")) {
      const statusMatch = line.match(/ERROR (\d+):/);
      if (statusMatch) {
        const status = statusMatch[1];
        metrics.errors.types[status] = (metrics.errors.types[status] || 0) + 1;
      }
    } else if (line.includes("SLOW RESPONSE")) {
      metrics.errors.types["slow"] = (metrics.errors.types["slow"] || 0) + 1;
    }
  });
}

// Calculate averages
if (metrics.responseTimes.count > 0) {
  metrics.responseTimes.avg =
    metrics.responseTimes.total / metrics.responseTimes.count;
}

if (metrics.cachePerformance.count > 0) {
  metrics.cachePerformance.avg =
    metrics.cachePerformance.total / metrics.cachePerformance.count;
}

Object.keys(metrics.endpoints).forEach((endpoint) => {
  const ep = metrics.endpoints[endpoint];
  if (ep.count > 0) {
    ep.avg = ep.total / ep.count;
  }
});

// Generate human-readable report
const reportTime = new Date().toISOString();
let report = `# Load Test Report - ${reportTime}\n\n`;

report += `## Overview\n`;
report += `- Total Requests: ${metrics.totalRequests}\n`;
report += `- Successful Requests: ${metrics.successfulRequests}\n`;
report += `- Failed Requests: ${metrics.failedRequests}\n`;
report += `- Success Rate: ${(
  (metrics.successfulRequests / metrics.totalRequests) *
  100
).toFixed(2)}%\n\n`;

report += `## Response Times (All Endpoints)\n`;
report += `- Minimum: ${metrics.responseTimes.min}ms\n`;
report += `- Maximum: ${metrics.responseTimes.max}ms\n`;
report += `- Average: ${metrics.responseTimes.avg.toFixed(2)}ms\n\n`;

report += `## Cache Performance\n`;
if (metrics.cachePerformance.count > 0) {
  report += `- Requests: ${metrics.cachePerformance.count}\n`;
  report += `- Minimum: ${metrics.cachePerformance.min}ms\n`;
  report += `- Maximum: ${metrics.cachePerformance.max}ms\n`;
  report += `- Average: ${metrics.cachePerformance.avg.toFixed(2)}ms\n\n`;
} else {
  report += `- No cache performance data available\n\n`;
}

report += `## Endpoint Performance\n`;
Object.keys(metrics.endpoints).forEach((endpoint) => {
  const ep = metrics.endpoints[endpoint];
  report += `### ${endpoint}\n`;
  report += `- Requests: ${ep.count}\n`;
  report += `- Minimum: ${ep.min}ms\n`;
  report += `- Maximum: ${ep.max}ms\n`;
  report += `- Average: ${ep.avg.toFixed(2)}ms\n`;
  report += `- Slow Requests (>500ms): ${ep.slow}\n\n`;
});

report += `## Errors\n`;
report += `- Total Error Count: ${metrics.errors.count}\n`;
report += `- Error Types:\n`;
Object.keys(metrics.errors.types).forEach((type) => {
  report += `  - ${type}: ${metrics.errors.types[type]}\n`;
});

// Save the report
const reportFile = path.join(reportDir, `report-${new Date().getTime()}.md`);
fs.writeFileSync(reportFile, report);

// Save JSON metrics for programmatic analysis
const metricsFile = path.join(
  reportDir,
  `metrics-${new Date().getTime()}.json`
);
fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));

console.log(`Report generated at: ${reportFile}`);
console.log(`Metrics JSON saved at: ${metricsFile}`);
