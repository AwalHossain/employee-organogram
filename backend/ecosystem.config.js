module.exports = {
  apps: [
    {
      name: 'employee-organogram-api',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
        // Database connection pool settings
        DB_POOL_SIZE: 20,
        DB_IDLE_TIMEOUT: 30000,
        // Node.js performance settings
        NODE_OPTIONS: '--max-http-header-size=16384 --max-old-space-size=2048',
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 8000,
      },
      node_args: '--max-old-space-size=2048',
      // Add PM2 specific optimizations
      exp_backoff_restart_delay: 100, // Delay between restarts if app crashes
      kill_timeout: 5000, // Time in ms to allow graceful shutdown
      listen_timeout: 10000, // Wait before forcing app to start
    },
  ],
};
