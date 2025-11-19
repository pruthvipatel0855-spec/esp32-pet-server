// Simple ESP32 Pet Server
// This runs on cloud (Render.com) and receives data from ESP32

const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS so ESP32 can send data
app.use(cors());
app.use(express.json());

// Store pet data in memory (resets when server restarts)
// For permanent storage, we'd use a database - we'll add that later
let petData = {
  lastUpdate: null,
  distance: 0,
  temperature: 0,
  rfid: "none",
  status: "waiting for data..."
};

// Store history (last 50 readings)
let dataHistory = [];

// ============================================
// API ENDPOINT: ESP32 sends data here
// ============================================
app.post('/api/sensor', (req, res) => {
  console.log('📡 Received data from ESP32:', req.body);
  
  // Extract data from ESP32
  const { distance, temperature, rfid } = req.body;
  
  // Update current data
  petData = {
    lastUpdate: new Date().toLocaleString(),
    distance: distance || 0,
    temperature: temperature || 0,
    rfid: rfid || "none",
    status: "connected ✓"
  };
  
  // Add to history
  dataHistory.push({
    timestamp: Date.now(),
    ...petData
  });
  
  // Keep only last 50 readings
  if (dataHistory.length > 50) {
    dataHistory.shift();
  }
  
  // Send response back to ESP32
  res.json({ 
    success: true, 
    message: "Data received!",
    timestamp: Date.now()
  });
});

// ============================================
// API ENDPOINT: Get current pet data
// ============================================
app.get('/api/data', (req, res) => {
  res.json(petData);
});

// ============================================
// API ENDPOINT: Get data history
// ============================================
app.get('/api/history', (req, res) => {
  res.json(dataHistory);
});

// ============================================
// SERVE WEB DASHBOARD (HTML page)
// ============================================
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ESP32 Pet Monitor</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #fff;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        h1 {
            text-align: center;
            margin-bottom: 30px;
            font-size: 36px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        
        .status-connected {
            background: #4CAF50;
        }
        
        .status-waiting {
            background: #ff9800;
        }
        
        .card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            color: #333;
        }
        
        .sensor-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .sensor-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        
        .sensor-label {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 10px;
        }
        
        .sensor-value {
            font-size: 32px;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .sensor-unit {
            font-size: 16px;
            opacity: 0.8;
        }
        
        .info-text {
            color: #666;
            font-size: 14px;
            margin-top: 10px;
        }
        
        .refresh-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 15px;
            transition: all 0.3s;
        }
        
        .refresh-btn:hover {
            background: #764ba2;
            transform: translateY(-2px);
        }
        
        .log-container {
            max-height: 300px;
            overflow-y: auto;
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
        }
        
        .log-entry {
            margin-bottom: 8px;
            padding: 8px;
            background: white;
            border-radius: 4px;
            border-left: 3px solid #667eea;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            font-size: 18px;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .pulse {
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 ESP32 Pet Monitor</h1>
        
        <div style="text-align: center;">
            <span id="statusBadge" class="status-badge status-waiting">
                ⏳ Waiting for ESP32...
            </span>
        </div>
        
        <div class="card">
            <h2>📊 Current Sensor Readings</h2>
            
            <div class="sensor-grid">
                <div class="sensor-box">
                    <div class="sensor-label">📏 Distance</div>
                    <div class="sensor-value" id="distance">--</div>
                    <div class="sensor-unit">cm</div>
                </div>
                
                <div class="sensor-box">
                    <div class="sensor-label">🌡️ Temperature</div>
                    <div class="sensor-value" id="temperature">--</div>
                    <div class="sensor-unit">°C</div>
                </div>
                
                <div class="sensor-box">
                    <div class="sensor-label">🔖 RFID Tag</div>
                    <div class="sensor-value" id="rfid" style="font-size: 20px;">--</div>
                    <div class="sensor-unit">ID</div>
                </div>
            </div>
            
            <div class="info-text">
                Last update: <strong id="lastUpdate">Never</strong>
            </div>
            
            <button class="refresh-btn" onclick="fetchData()">🔄 Refresh Now</button>
        </div>
        
        <div class="card">
            <h2>📜 Data Log (Last 10 readings)</h2>
            <div class="log-container" id="logContainer">
                <div class="loading pulse">Waiting for data...</div>
            </div>
        </div>
        
        <div class="card">
            <h2>ℹ️ Connection Info</h2>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px;">
                <strong>API Endpoint for ESP32:</strong><br>
                POST <span style="color: #667eea;">${typeof window !== 'undefined' ? window.location.origin : ''}/api/sensor</span><br><br>
                
                <strong>Example JSON to send:</strong><br>
                <pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto;">
{
  "distance": 45,
  "temperature": 28,
  "rfid": "ABC123"
}</pre>
            </div>
        </div>
    </div>

    <script>
        // Auto-refresh every 2 seconds
        setInterval(fetchData, 2000);
        
        // Fetch data immediately on load
        fetchData();
        
        async function fetchData() {
            try {
                // Get current data
                const response = await fetch('/api/data');
                const data = await response.json();
                
                // Update display
                document.getElementById('distance').textContent = data.distance;
                document.getElementById('temperature').textContent = data.temperature;
                document.getElementById('rfid').textContent = data.rfid;
                document.getElementById('lastUpdate').textContent = data.lastUpdate || 'Never';
                
                // Update status badge
                const badge = document.getElementById('statusBadge');
                if (data.status === "connected ✓") {
                    badge.className = 'status-badge status-connected';
                    badge.textContent = '✓ Connected to ESP32';
                } else {
                    badge.className = 'status-badge status-waiting';
                    badge.textContent = '⏳ Waiting for ESP32...';
                }
                
                // Get history and update log
                const historyResponse = await fetch('/api/history');
                const history = await historyResponse.json();
                
                const logContainer = document.getElementById('logContainer');
                if (history.length > 0) {
                    logContainer.innerHTML = history
                        .slice(-10)
                        .reverse()
                        .map(entry => {
                            const time = new Date(entry.timestamp).toLocaleTimeString();
                            return \`
                                <div class="log-entry">
                                    [\${time}] Distance: \${entry.distance}cm | 
                                    Temp: \${entry.temperature}°C | 
                                    RFID: \${entry.rfid}
                                </div>
                            \`;
                        })
                        .join('');
                } else {
                    logContainer.innerHTML = '<div class="loading pulse">No data yet...</div>';
                }
                
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
    </script>
</body>
</html>
  `);
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ✅ Server running on port ${PORT}
  
  🌐 Dashboard: http://localhost:${PORT}
  📡 ESP32 endpoint: http://localhost:${PORT}/api/sensor
  
  Waiting for ESP32 to send data...
  `);
});
