# APM Rehab Kiosk - Patient Self-Registration System

A desktop kiosk application built with React, Vite, and Electron for patient self-registration at APM Rehab centers.

## Features

- **Dual Input Methods**
  - QR code scanning via webcam
  - Manual appointment code entry

- **Kiosk Mode**
  - Fullscreen ATM-like interface
  - Idle detection (30 min) with automatic video ads
  - Touch-optimized UI

- **Printing System**
  - Thermal receipt printer for proof of registration
  - Label printer for patient stickers
  - Automatic printer selection

- **API Integration**
  - Appointment code validation
  - Patient registration
  - Mock API for development/testing

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- (Optional) Thermal receipt printer and label printer
- (Optional) Webcam for QR scanning

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` to configure your settings:
   - Set your API base URL
   - Configure printer names
   - Enable/disable mock API

3. **Run development mode**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## Usage

### Test Appointment Codes

When using the mock API (`VITE_USE_MOCK_API=true`), you can test with these codes:
- `ABC123456` - John Doe, Physical Therapy
- `XYZ789012` - Jane Smith, Occupational Therapy
- `TEST123456` - Test Patient, General Checkup

### Kiosk Features

1. **Home Screen** - Choose scan or manual input
2. **QR Scanner** - Position QR code in frame
3. **Manual Input** - Type appointment code (6+ characters)
4. **Loading** - Validates appointment with backend
5. **Success** - Displays registration details and prints
6. **Advertisement Mode** - Activates after 30 minutes of inactivity (plays video ads)

## Printer Setup

### Thermal Receipt Printer (58mm)

1. Install printer drivers on the system
2. Note the printer name (e.g., "Thermal Printer" or "POS-58")
3. Set `RECEIPT_PRINTER` in `.env` to match the printer name
4. Test printing in the kiosk app

### Label Printer

1. Install printer drivers (Dymo, Brother, etc.)
2. Note the printer name
3. Set `STICKER_PRINTER` in `.env` to match
4. Configure label size (default: 50mm x 30mm)

**Note:** If printers are not configured, the app will still work but printing will fail gracefully.

## API Integration

### Endpoint: Validate Appointment Code

```http
POST /api/appointments/validate
Content-Type: application/json

{
  "code": "ABC123456"
}
```

Response:
```json
{
  "success": true,
  "patientName": "John Doe",
  "appointmentCode": "ABC123456",
  "registrationCode": "REG-ABC123XYZ",
  "date": "2/26/2026",
  "time": "10:30:45 AM",
  "department": "Physical Therapy"
}
```

### Endpoint: Register Patient

```http
POST /api/patients/register
Content-Type: application/json

{
  "appointmentCode": "ABC123456",
  "registrationCode": "REG-ABC123XYZ",
  "patientName": "John Doe",
  "department": "Physical Therapy"
}
```

## Configuration

### Kiosk Mode Settings

Edit `electron/main.js` to configure:

```javascript
const PRINTER_CONFIG = {
  receipt: {
    name: 'Your Receipt Printer Name',
    width: 58, // mm
    silent: true
  },
  sticker: {
    name: 'Your Label Printer Name',
    width: 50, // mm
    silent: true
  }
}
```

### Idle Detection

Default idle timeout: 30 minutes (1800 seconds)

The kiosk automatically switches to advertisement mode after 30 minutes of no user activity. Touching the screen or pressing any key resets the timer.

To change the timeout, edit `src/App.jsx`:
```javascript
if (prev >= 1800) { // Change to desired seconds
  setMode('advertisement')
}
```

### Advertisement Videos

The kiosk supports multiple advertisement videos that play in sequence:

1. **Add videos** to `public/ads/` folder
2. **Name them** as `ad1.mp4`, `ad2.mp4`, `ad3.mp4`, etc.
3. **Auto-play**: Videos play sequentially and loop continuously
4. **Supported formats**: MP4, WebM, MOV

**Example:**
```
public/ads/
├── ad1.mp4    (First ad)
├── ad2.mp4    (Second ad)
└── ad3.mp4    (Third ad)
```

The kiosk will:
- Play ad1 → ad2 → ad3 → ad1 (loop)
- Show progress indicators at the bottom
- Display a custom layout with logo and title
- Show "Mulai Registrasi" button (Indonesian for "Start Registration")

### Hospital Logo

Add your hospital/clinic logo to appear in the top-right corner during advertisements:

1. **Place logo** in `public/logo/logo.png`
2. **Recommended**: PNG with transparent background
3. **Size**: 200px × 120px (auto-scaled)
4. **Formats supported**: PNG, JPG, SVG, WebP

**Layout:**
```
┌─────────────────────────────────────┐
│                              [LOGO] │ ← Top Right
│                                     │
│         (Video Background)          │
│                                     │
├─────────────────────────────────────┤
│ APM Rehabilitasi Medik & Fisioterapi [Mulai Registrasi]
└─────────────────────────────────────┘
```

See `LAYOUT_UPDATE.md` for detailed customization instructions.

The kiosk will:
- Play ad1 → ad2 → ad3 → ad1 (loop)
- Show progress indicators at the bottom
- Display a placeholder if no videos are found

See `public/ads/README.md` for detailed instructions.

## File Structure

```
apm-rehab-v1/
├── electron/
│   ├── main.js           # Electron main process
│   └── preload.js        # Preload script (IPC bridge)
├── src/
│   ├── components/
│   │   ├── QRScanner.jsx
│   │   ├── QRScanner.css
│   │   ├── ManualInput.jsx
│   │   ├── ManualInput.css
│   │   ├── VideoAds.jsx
│   │   └── VideoAds.css
│   ├── services/
│   │   ├── api.js        # API service
│   │   └── print.js      # Print service
│   ├── App.jsx           # Main app component
│   ├── App.css           # Main styles
│   └── electron.d.ts     # TypeScript definitions
├── public/
│   ├── ads/              # Advertisement videos folder
│   └── logo/             # Hospital logo folder
├── .env.example          # Environment variables template
├── ADS_SETUP.md          # Ads system setup guide
├── LAYOUT_UPDATE.md      # Layout customization guide
├── package.json
├── vite.config.js
└── README.md
```

## Building for Distribution

### Windows

```bash
npm run build
```

This creates:
- `release/` folder with installer
- `.exe` installer file
- Can be distributed to any Windows machine

### Development Build (Faster)

```bash
npm run build:dir
```

Creates unpacked build without installer (for testing).

## Troubleshooting

### Camera not working

1. Check browser permissions
2. Ensure no other app is using the camera
3. Try using HTTPS (required for camera in production)

### Printers not detected

1. Ensure printers are installed on the system
2. Check printer names match `.env` configuration
3. Test printers with other applications

### App won't start

1. Check Node.js version (18+)
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` again

## Development

### Run in development mode

```bash
npm run dev
```

Features:
- Hot module replacement (HMR)
- React Fast Refresh
- Electron auto-reload

### Enable DevTools

Edit `electron/main.js`:
```javascript
// win.webContents.openDevTools()
```

Uncomment this line to open DevTools automatically.

## License

Copyright © 2026 APM Rehab. All rights reserved.
