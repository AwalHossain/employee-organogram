// Load test helper functions for Artillery
"use strict";

const fs = require("fs");
const path = require("path");

// Ensure log directories exist
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create log files
const responseTimeLogFile = path.join(logsDir, "response-times.log");
const errorLogFile = path.join(logsDir, "errors.log");
const progressLogFile = path.join(logsDir, "progress.log");

// Initialize counters for real-time tracking
let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
let lastLoggedTime = Date.now();
const logInterval = 2000; // Log progress every 2 seconds

// Helper function to write to a log file
function writeToLog(filePath, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  fs.appendFileSync(filePath, logMessage, { encoding: "utf8" });
}

// Function to log current progress
function logProgress() {
  const now = Date.now();
  if (now - lastLoggedTime > logInterval) {
    const message = `Progress: ${totalRequests} total requests, ${successfulRequests} successful, ${failedRequests} failed (${(
      (failedRequests / (totalRequests || 1)) *
      100
    ).toFixed(2)}% failure rate)`;
    writeToLog(progressLogFile, message);
    console.log(message); // Also output to console for real-time monitoring
    lastLoggedTime = now;
  }
}

// Helper function to pick a random index from an array
function pickRandom(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

// Function to select a random employee ID
function randomEmployeeId(context, events, done) {
  // Only using available employee IDs: 1, 2, and 3
  const employeeIds = [1, 2, 3];
  context.vars.employeeId = pickRandom(employeeIds);
  return done();
}

// Track test progress for each request
function trackProgress(requestParams, response, context, events, done) {
  totalRequests++;

  // Check for request failures - need to handle different types of failures
  if (!response) {
    failedRequests++;
    writeToLog(
      errorLogFile,
      `Failed request to ${requestParams.url} (no response)`
    );
  } else if (response.statusCode >= 400) {
    failedRequests++;
    writeToLog(
      errorLogFile,
      `Failed request to ${requestParams.url} with status ${response.statusCode}`
    );
  } else if (events.length > 0 && events.some((e) => e.type === "error")) {
    // Check for error events
    failedRequests++;
    const errorEvent = events.find((e) => e.type === "error");
    writeToLog(
      errorLogFile,
      `Failed request to ${requestParams.url} with error: ${errorEvent.data}`
    );
  } else {
    successfulRequests++;
  }

  logProgress();
  return done();
}

// Track response times and log slow requests
function logResponseTime(requestParams, response, context, events, done) {
  if (!response || !response.timings) {
    writeToLog(
      errorLogFile,
      `Request to ${requestParams.url} failed without timing data`
    );
    return done();
  }

  const duration = response.timings.phases.firstByte;
  const url = requestParams.url;
  const name = requestParams.name || url;
  const scenario = context.vars._scenario || "unknown";

  // Log all response times
  const logMessage = `${scenario} - ${name}: ${duration}ms`;
  writeToLog(responseTimeLogFile, logMessage);

  // Log slow responses with warning
  if (duration > 500) {
    writeToLog(errorLogFile, `SLOW RESPONSE: ${logMessage}`);
  }

  return done();
}

// Track error responses
function trackErrors(requestParams, response, context, events, done) {
  const url = requestParams.url;
  const name = requestParams.name || url;
  const scenario = context.vars._scenario || "unknown";

  if (!response) {
    const errorMsg = `Request to ${name} failed completely (no response)`;
    writeToLog(errorLogFile, errorMsg);
    return done();
  }

  if (response.statusCode >= 400) {
    let errorMsg = `ERROR ${response.statusCode}: ${scenario} - ${name}`;

    if (response.body) {
      try {
        const error = JSON.parse(response.body);
        errorMsg += ` - ${JSON.stringify(error)}`;
      } catch (e) {
        errorMsg += ` - ${response.body}`;
      }
    }

    writeToLog(errorLogFile, errorMsg);
  }

  return done();
}

// Measure and log cache response times specifically
function trackCachePerformance(requestParams, response, context, events, done) {
  if (!response || !response.timings) {
    return done();
  }

  const duration = response.timings.phases.firstByte;
  const url = requestParams.url;

  // Only track cache-specific endpoints
  if (url.includes("cache-test")) {
    const cacheLogFile = path.join(logsDir, "cache-performance.log");
    writeToLog(cacheLogFile, `Cache endpoint: ${url} - ${duration}ms`);
  }

  return done();
}

module.exports = {
  randomEmployeeId,
  logResponseTime,
  trackErrors,
  trackCachePerformance,
  trackProgress,
};
