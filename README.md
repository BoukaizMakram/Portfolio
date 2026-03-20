# Portfolio 3D Website

An interactive 3D portfolio website featuring a Blender-modeled desk scene with a functional macOS-style operating system rendered directly onto the in-scene monitor using CSS3D.

## Tech Stack

- **Three.js** - 3D rendering engine (WebGL + CSS3DRenderer)
- **Vite** - Build tool and dev server
- **Blender** - 3D modeling (desk scene exported as GLB)
- **GSAP-style animations** - CSS keyframe animations for the OS interface (boot sequence, window transitions, content stagger)
- **html2canvas** - HTML-to-texture rendering for the 3D monitor
- **Vanilla JS/CSS** - No frameworks, pure DOM manipulation for the entire OS interface

## Architecture

```
index.html          → Entry point with Three.js importmap + loading screen
main.js             → Three.js scene setup, lighting, camera, controls, CSS3D overlay
style.css           → Loading screen + debug panel styles
public/
  os.html           → Full macOS-style OS interface (self-contained HTML/CSS/JS)
  model/            → GLB model + EXR environment map
  content/          → Portfolio images and videos
  assets/           → Desktop wallpapers and icons
```

### 3D Scene (`main.js`)
- GLB model loaded via `GLTFLoader`, EXR environment map via `EXRLoader`
- 4-point lighting rig: key (directional), fill, ambient, rim
- `OrbitControls` with soft camera boundary constraints
- `CSS3DRenderer` overlays an iframe (`os.html`) onto the monitor mesh in 3D space
- ACES Filmic tone mapping, PCF soft shadow maps

### OS Interface (`public/os.html`)
- macOS-inspired desktop with menu bar, dock, desktop icons, and draggable/resizable windows
- Apps: Portfolio (project showcase), About, Contact, Settings, Terminal
- Dark/Light theme toggle with CSS custom properties + smooth transitions
- Light mode applies `invert(1) grayscale(1)` filter to video elements
- Zoom controls (70%-150%) persisted via `localStorage`
- Boot animation sequence (Apple-style progress bar → desktop fade-in)
- Easter egg: type "windy" to unlock a hidden page

## Quick Start

```bash
npm install
npm run dev
```

## Controls

- **Left Click + Drag** - Rotate camera
- **Right Click + Drag** - Pan camera
- **Scroll** - Zoom in/out
- **`debug()` in console** - Toggle light/UI debug panels
