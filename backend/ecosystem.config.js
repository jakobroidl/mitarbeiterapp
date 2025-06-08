{
  "apps": [
    {
      "name": "event-staff-backend",
      "script": "server.js",
      "cwd": "./backend",
      "instances": 1,
      "exec_mode": "cluster",
      "watch": false,
      "max_memory_restart": "1G",
      "env": {
        "NODE_ENV": "production",
        "PORT": 3001
      },
      "env_production": {
        "NODE_ENV": "production",
        "PORT": 3001
      },
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "error_file": "./logs/err.log",
      "out_file": "./logs/out.log",
      "log_file": "./logs/combined.log",
      "time": true
    }
  ]
}