# Laboratory Middleware

This independent Node.js application acts as a bridge between your laboratory instruments (Serial/TCP) and the Cloud LIMS.

## Features
- **Protocol Support**: ASTM E1394, HL7 v2.x.
- **Offline Resilience**: Buffers results to a local SQLite database when internet is down.
- **Validation**: Checks ASTM checksums (LRC) to prevent corrupted data.
- **Monitoring**: Built-in Dashboard at `http://localhost:3000`.

## Installation

1. **Install Node.js**: Download and install [Node.js LTS](https://nodejs.org/) (v16 or higher).
2. **Download Code**: Clone this repository or extract the zip.
3. **Install Dependencies**:
   ```bash
   npm install
   ```

## Configuration

1. Create a `.env` file in the root directory:
   ```env
   SUPABASE_URL=YOUR_SUPABASE_URL
   SUPABASE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
   ```
   *(Contact your admin for these keys)*

2. (Optional) Adjust listening ports in `src/index.js`.
   - Default: Coralyzer (50001), Maglumi (2001), Generic (1109).

## Running on Windows (Easiest- Method 1)

1.  **Double-click `start.bat`**.
2.  A black window will open showing the logs ("Starting Laboratory Middleware...").
3.  **Keep this window open** for the connection to stay active.

(Prerequisite: Ensure Node.js is installed first!)

### Method 2: Background (Hidden)
To run it without the black window:
1.  Double-click `start-hidden.vbs`.
2.  The app will run in the background.
3.  To stop it, you must restart the computer or use Task Manager (look for Node.js).

### Method 3: Production (Windows Service) - **Recommended**
To ensure it runs automatically when the PC turns on (even after restart):
1.  Open Command Prompt as Administrator.
2.  Install PM2: `npm install -g pm2 pm2-windows-service`
3.  Install Service: `pm2-service-install`
4.  Start App: `pm2 start src/index.js --name lab-middleware`
5.  Save: `pm2 save`

## Running on Linux / Mac

1.  **Terminal Method**:
    ```bash
    npm start
    ```

2.  **Production (Auto-Start)**:
    ```bash
    sudo npm install -g pm2
    pm2 start src/index.js --name lab-middleware
    pm2 startup
    pm2 save
    ```

## Monitoring
Open your browser to **http://localhost:3000** to see the status dashboard.
