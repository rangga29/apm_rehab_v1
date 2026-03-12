# Hospital Logo Folder

Place your hospital/clinic logo in this folder.

## How to Add Your Logo

1. **Prepare your logo image**
   - Recommended format: PNG with transparent background
   - Size: 200px width x 120px height (will be scaled automatically)
   - File size: Under 500KB for faster loading

2. **Name your file**: `logo.png` or `logo.jpg`

3. **Place it here**: `public/logo/logo.png` or `public/logo/logo.jpg`

4. **Restart the kiosk** and your logo will appear in the top-right corner during advertisements

## Alternative Logo Names

The system will look for logos in this order:
1. `logo.png` (recommended - PNG with transparency)
2. `logo.jpg`
3. `logo.jpeg`
4. `logo.svg`
5. `logo.webp`

## Logo Display

- **Position**: Top-right corner of advertisement screen
- **Background**: White rounded container with shadow
- **Size**: Automatically scaled to fit (max 200px width)
- **Maintains aspect ratio**

## Design Tips

- Use a high-resolution logo for crisp display
- PNG with transparent background works best
- Ensure good contrast against white background
- Keep logo simple and readable
- Test on the actual kiosk display

## Troubleshooting

**Logo not showing?**
- Check file is named correctly (logo.png, logo.jpg, etc.)
- Verify file is in the correct folder (public/logo/)
- Restart the kiosk application
- Check browser console for errors

**Logo looks distorted?**
- Use PNG format with transparent background
- Ensure logo has good resolution (at least 400px wide)
- Check aspect ratio is correct

**Logo too small/large?**
- The system automatically scales to fit (max 200px width)
- For best results, create logo at 200px x 120px
- Height adjusts automatically to maintain aspect ratio
