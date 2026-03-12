# Video Ads - Fixed Looping & New Layout

## ✅ Fixes Applied

### 1. Video Looping Fixed
**Problem**: Videos stopped after the 2nd video and didn't loop back to the 1st.

**Solution**: Rewrote the video playback logic to properly handle the `ended` event and sequential playback.

**How It Works Now**:
```
ad1.mp4 (10s) → ad2.mp4 (15s) → ad1.mp4 (10s) → ad2.mp4 (15s) → ...
```
Each video plays completely, then automatically moves to the next. After the last video, it loops back to the first.

### 2. New Custom Layout

The advertisement screen now has a professional layout with:

```
┌─────────────────────────────────────────────┐
│                                      [LOGO] │ ← Top Right
│                                             │
│                                             │
│            (Video Background)               │
│              Full Screen                    │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│ APM Rehabilitasi Medik & Fisioterapi   [Mulai Registrasi] │ ← Bottom
└─────────────────────────────────────────────┘
```

**Layout Details**:
- **Overall Size**: 1920x1080 (fullscreen kiosk)
- **Top Right**: Hospital logo (200px × 120px max)
- **Bottom Bar**: White bar with title on left, button on right
- **Title**: "APM Rehabilitasi Medik & Fisioterapi"
- **Button**: "Mulai Registrasi" (Start Registration)
- **Progress Dots**: Shows which video is playing (optional)

## How to Add Your Hospital Logo

1. Prepare your logo:
   - Format: PNG (with transparency) or JPG
   - Size: 200px × 120px (recommended)
   - File size: Under 500KB

2. Save it as `logo.png` in: `public/logo/logo.png`

3. Restart the kiosk - your logo will appear!

**Supported logo filenames** (checked in order):
- `logo.png` (recommended - PNG with transparency)
- `logo.jpg`
- `logo.jpeg`
- `logo.svg`
- `logo.webp`

## Button Text Customization

The button currently says **"Mulai Registrasi"** (Indonesian).

To change it to English or another language:

Edit `src/components/VideoAds.jsx` line 73:
```jsx
<button className="start-registration-button" onClick={handleClick}>
  Mulai Registrasi  {/* Change this text */}
</button>
```

For English:
```jsx
<button className="start-registration-button" onClick={handleClick}>
  Start Registration
</button>
```

## Video Requirements

**Video Format**:
- Format: MP4 (H.264 codec recommended)
- Resolution: 1920x1080 (Full HD)
- Duration: Any length (each plays fully)
- Multiple videos: ad1.mp4, ad2.mp4, ad3.mp4, etc.

**Playback Behavior**:
- Videos play in sequence (1 → 2 → 3 → 1 → ...)
- Each video plays completely before next
- Auto-loops forever
- Progress dots show current video

## Color Scheme

The layout uses APM Rehab colors:
- **Primary**: #667eea (purple gradient)
- **Secondary**: #764ba2 (deep purple)
- **Background**: White with slight transparency
- **Text**: Dark purple for readability

## File Structure

```
public/
├── ads/
│   ├── ad1.mp4
│   ├── ad2.mp4
│   └── README.md
└── logo/
    ├── logo.png        ← Add your logo here
    └── README.md

src/components/
├── VideoAds.jsx        ← Updated component
└── VideoAds.css        ← New layout styles
```

## Testing

**Test Video Looping**:
1. Add 2-3 videos with different lengths
2. Wait for them to play
3. Verify they loop: ad1 → ad2 → ad1 → ad2...

**Test Logo Display**:
1. Add your logo.png to public/logo/
2. Restart kiosk
3. Check top-right corner during ads

**Test Layout**:
1. Run kiosk in dev mode: `npm run dev`
2. Wait for idle timeout (30 seconds in .env)
3. Verify layout matches specification

## Troubleshooting

**Videos not looping?**
- Clear browser cache
- Restart the application
- Check browser console for errors

**Logo not showing?**
- Verify file is named `logo.png` (or .jpg, .svg)
- Check it's in `public/logo/` folder
- Restart the kiosk

**Layout looks wrong?**
- Ensure screen resolution is 1920x1080
- Check CSS is loading correctly
- Try clearing cache and restarting

---

**Current Configuration**:
- Idle Timeout: 30 seconds (testing mode)
- Video Folder: public/ads/
- Logo Folder: public/logo/
- Layout: 1920x1080 fullscreen
- Button: "Mulai Registrasi" (Indonesian)
