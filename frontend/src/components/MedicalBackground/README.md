# MedicalBackground Component

A reusable SVG-based background component with medical-themed decorative elements.

## Features

- **SVG-based**: Lightweight and scalable
- **Animated shapes**: Floating pills, hearts, and pulsing medical crosses
- **Theme-aware**: Uses CSS variables from your design system
- **Two variants**: Default and light backgrounds
- **Reusable**: Can be used across all pages

## Usage

### Basic Usage

```tsx
import { MedicalBackground } from '@/components';

function MyPage() {
  return (
    <div className={styles.container}>
      <MedicalBackground />
      {/* Your content here */}
    </div>
  );
}
```

### Light Variant

Use the light variant for pages with white/light backgrounds:

```tsx
<MedicalBackground variant="light" />
```

### Container Styling

Your container should be positioned relatively to allow the background to position absolutely:

```css
.container {
  position: relative;
  min-height: 100vh;
  /* other styles */
}
```

Make sure your content has `z-index: 1` or higher to appear above the background:

```css
.content {
  position: relative;
  z-index: 1;
}
```

## Customization

The component uses CSS variables from `variables.css`:

- `--color-primary` / `--color-primary-700`: Teal shapes
- `--color-secondary` / `--color-secondary-700`: Yellow shapes
- `--color-background`: Default background color
- `--color-surface`: Light variant background color

## Examples

See these pages for implementation examples:

- `/features/profile/pages/Profile/` - Default variant
- `/features/dashboard/pages/Dashboard/` - Light variant
