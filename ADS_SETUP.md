# Advertisement System - Setup Guide

## Overview

The APM Rehab Kiosk now includes a sophisticated video advertisement system that activates after 30 minutes of user inactivity.

## What's New

### ✅ Changes Made

1. **Idle Timeout Updated**: Changed from 60 seconds to **30 minutes** (1800 seconds)
2. **Multi-Video Support**: Can play multiple videos in sequence
3. **Auto-Loop**: Videos automatically cycle and repeat
4. **Smart Detection**: Only loads videos that exist in the folder
5. **Progress Indicators**: Shows which ad is currently playing
6. **Placeholder Screen**: Displays helpful message when no videos are found

## How to Use

### Adding Advertisement Videos

1. **Create Videos** in MP4 format (recommended)
   - Resolution: 1920x1080 (Full HD)
   - Duration: 15-60 seconds each
   - Format: H.264 codec

2. **Name Your Files**:
   ```
   public/ads/
   ├── ad1.mp4    (Your first advertisement)
   ├── ad2.mp4    (Your second advertisement)
   ├── ad3.mp4    (Your third advertisement)
   └── ad4.mp4    (And so on...)
   ```

3. **That's It!** The kiosk will:
   - Automatically detect all videos
   - Play them in order (ad1 → ad2 → ad3 → ...)
   - Loop back to the first video after the last one
   - Display a "Start Registration" button on touch/click

### Configuration

Change the idle timeout in your `.env` file:

```env
# Time in seconds before ads appear
# 1800 = 30 minutes (default)
# 300 = 5 minutes (for testing)
# 60 = 1 minute (for quick testing)
VITE_IDLE_TIMEOUT=1800
```

### Testing

To test the ads system quickly without waiting 30 minutes:

1. Set `VITE_IDLE_TIMEOUT=30` in `.env` (30 seconds)
2. Start the kiosk: `npm run dev`
3. Wait 30 seconds without touching anything
4. The ads screen will appear

## Features

### With Videos Present
- Full-screen video playback
- Sequential play (ad1 → ad2 → ad3 → ...)
- Visual progress indicators (dots at bottom)
- Touch/click anywhere to exit
- "Start Registration" button always visible

### Without Videos
- Beautiful placeholder screen with instructions
- APM Rehab branding
- Helpful guidance on adding videos
- "Start Registration" button still works

## Technical Details

### Files Created/Modified

**New Files:**
- `src/components/VideoAds.jsx` - Video ads component
- `src/components/VideoAds.css` - Styling for ads
- `public/ads/README.md` - Detailed instructions
- `public/ads/.gitkeep` - Folder placeholder
- `ADS_SETUP.md` - This file

**Modified Files:**
- `src/App.jsx` - Integrated VideoAds component, added IDLE_TIMEOUT config
- `src/App.css` - Removed old ad CSS (now in VideoAds.css)
- `.env` - Added VITE_IDLE_TIMEOUT=1800
- `.env.example` - Added VITE_IDLE_TIMEOUT documentation
- `.gitignore` - Ignore video files but keep folder structure
- `README.md` - Updated documentation

## Troubleshooting

### Videos Not Playing?

1. **Check file format**: Ensure videos are MP4, WebM, or MOV
2. **Check naming**: Files must be named `ad1.mp4`, `ad2.mp4`, etc.
3. **Check codec**: Use H.264 for MP4 files
4. **Check browser console**: Look for error messages

### Wrong Play Order?

- Rename files to match desired order (ad1, ad2, ad3...)
- Restart the kiosk application

### Autoplay Blocked?

- Electron kiosk mode should handle this automatically
- If issues persist, check Chromium settings

### Idle Timeout Not Working?

- Verify `.env` file has `VITE_IDLE_TIMEOUT` set
- Restart the application after changing `.env`
- Check that the value is in seconds (not minutes)

## Best Practices

1. **Keep videos short** (15-60 seconds) - Better engagement
2. **Use high quality** - Professional appearance
3. **Include contact info** - Call-to-action
4. **Test on hardware** - Verify on actual kiosk
5. **Monitor volume** - Appropriate for waiting room
6. **Update regularly** - Keep content fresh

## Support

For issues or questions:
- Check `public/ads/README.md` for detailed instructions
- Review browser console for error messages
- Ensure all dependencies are installed: `npm install`

---

**Current Configuration:**
- Idle Timeout: 30 minutes (1800 seconds)
- Video Folder: `public/ads/`
- Supported Formats: MP4, WebM, MOV
- Play Mode: Sequential loop
