#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

// Clear console and display header
console.clear();
console.log("==== Artillery Load Test Monitor ====\n");
console.log("Real-time metrics for your load test\n");

// Set up paths
const logsDir = path.join(__dirname, "logs");
const responseTimeLog = path.join(logsDir, "response-times.log");
const errorLog = path.join(logsDir, "errors.log");
const progressLog = path.join(logsDir, "progress.log");
const cachePerformanceLog = path.join(logsDir, "cache-performance.log");

// Variables to track metrics
let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
let requestsInLastInterval = 0;
let lastUpdateTime = Date.now();
let errorCount = 0;
let slowResponseCount = 0;

// Endpoint performance
const endpoints = {
  "Get all employees": { count: 0, min: Infinity, max: 0, sum: 0, slow: 0 },
  "Get employee by ID": { count: 0, min: Infinity, max: 0, sum: 0, slow: 0 },
  "Get employee subordinates": {
    count: 0,
    min: Infinity,
    max: 0,
    sum: 0,
    slow: 0,
  },
  "Employee cache test": { count: 0, min: Infinity, max: 0, sum: 0, slow: 0 },
};

// Function to parse response time log
function parseResponseTimes() {
  if (!fs.existsSync(responseTimeLog)) return;

  // Get file size to check if it's been updated
  const stats = fs.statSync(responseTimeLog);
  if (stats.size === 0) return;

  const content = fs.readFileSync(responseTimeLog, "utf8");
  const lines = content.split("\n").filter((line) => line.trim());

  // Process each line of the response time log
  lines.forEach((line) => {
    const match = line.match(/\[(.*?)\] (.*?) - (.*?): (\d+)ms/);
    if (match) {
      const endpoint = match[3];
      const responseTime = parseInt(match[4]);

      // Update endpoint stats if we know this endpoint
      if (endpoints[endpoint]) {
        const ep = endpoints[endpoint];
        ep.count++;
        ep.min = Math.min(ep.min, responseTime);
        ep.max = Math.max(ep.max, responseTime);
        ep.sum += responseTime;
        if (responseTime > 500) ep.slow++;
      }
    }
  });
}

// Function to parse progress log
function parseProgressLog() {
  if (!fs.existsSync(progressLog)) return;

  const stats = fs.statSync(progressLog);
  if (stats.size === 0) return;

  const content = fs.readFileSync(progressLog, "utf8");
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length === 0) return;

  // Get the last line for current progress
  const lastLine = lines[lines.length - 1];
  const match = lastLine.match(
    /Progress: (\d+) total requests, (\d+) successful, (\d+) failed/
  );

  if (match) {
    totalRequests = parseInt(match[1]);
    successfulRequests = parseInt(match[2]);
    failedRequests = parseInt(match[3]);
  }
}

// Function to calculate request rate
function calculateRequestRate() {
  const now = Date.now();
  const elapsed = (now - lastUpdateTime) / 1000; // seconds

  // Calculate requests per second
  const rate = requestsInLastInterval / elapsed;

  // Reset counter and update time
  requestsInLastInterval = 0;
  lastUpdateTime = now;

  return rate.toFixed(2);
}

// Function to parse error log
function parseErrorLog() {
  if (!fs.existsSync(errorLog)) return;

  const stats = fs.statSync(errorLog);
  if (stats.size === 0) return;

  const content = fs.readFileSync(errorLog, "utf8");
  const lines = content.split("\n").filter((line) => line.trim());

  errorCount = lines.filter((line) => line.includes("ERROR")).length;
  slowResponseCount = lines.filter((line) =>
    line.includes("SLOW RESPONSE")
  ).length;

  return lines.slice(-5); // Return last 5 errors for display
}

// Draw progress bar
function drawProgressBar(value, max, width) {
  const percentage = Math.min(Math.max(value / max, 0), 1);
  const filledWidth = Math.round(width * percentage);
  const emptyWidth = width - filledWidth;

  return (
    "[" +
    "#".repeat(filledWidth) +
    " ".repeat(emptyWidth) +
    "] " +
    (percentage * 100).toFixed(1) +
    "%"
  );
}

// Main update function
function updateDisplay() {
  console.clear();

  // Header
  console.log("==== Artillery Load Test Monitor ====");
  console.log("Time: " + new Date().toISOString());
  console.log("-".repeat(40));

  // Parse logs
  parseProgressLog();
  parseResponseTimes();
  const recentErrors = parseErrorLog();

  // Request metrics
  console.log("REQUEST METRICS:");
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Successful: ${successfulRequests}`);
  console.log(`Failed: ${failedRequests}`);

  // Calculate success rate
  const successRate =
    totalRequests > 0
      ? ((successfulRequests / totalRequests) * 100).toFixed(1)
      : 0;
  console.log(`Success Rate: ${successRate}%`);
  console.log(`Request Rate: ~${calculateRequestRate()} req/sec`);
  console.log("-".repeat(40));

  // Endpoint performance
  console.log("ENDPOINT PERFORMANCE:");
  Object.keys(endpoints).forEach((name) => {
    const ep = endpoints[name];
    if (ep.count > 0) {
      const avg = ep.sum / ep.count;
      console.log(`${name}:`);
      console.log(`  Requests: ${ep.count}`);
      console.log(`  Avg Time: ${avg.toFixed(2)}ms`);
      console.log(
        `  Min/Max: ${ep.min !== Infinity ? ep.min : 0}ms / ${ep.max}ms`
      );
      console.log(
        `  Slow Responses: ${ep.slow} (${((ep.slow / ep.count) * 100).toFixed(
          1
        )}%)`
      );
    }
  });
  console.log("-".repeat(40));

  // Error summary
  console.log("ERROR SUMMARY:");
  console.log(`Total Errors: ${errorCount}`);
  console.log(`Slow Responses: ${slowResponseCount}`);

  // Recent errors
  if (recentErrors && recentErrors.length > 0) {
    console.log("\nRecent Errors:");
    recentErrors.forEach((error) => {
      console.log(
        `  ${error.substring(0, 120)}${error.length > 120 ? "..." : ""}`
      );
    });
  }

  console.log("\nPress Ctrl+C to exit");
}

// Update interval
const interval = setInterval(updateDisplay, 1000);

// Handle exit
process.on("SIGINT", () => {
  clearInterval(interval);
  console.log("\nMonitoring stopped");
  process.exit(0);
});

// First update
updateDisplay();

// Keep process running
process.stdin.resume();
