# Perfect Stack

A hyper-casual block stacking mobile game built with Expo and React Native. Players tap to drop blocks and try to stack them perfectly. Compete with others on the real-time leaderboard powered by Firebase.

## Gameplay

- Tap to drop the moving block onto the stack
- Align blocks perfectly to maintain width and score bonus points
- Misaligned stacks get trimmed — the narrower the stack, the harder it gets
- The game ends when a block misses the stack entirely
- Your best score is saved and synced to the global leaderboard

## Features

- **Animated Start Screen** — Animated logo with block tower, falling blocks background, and "Developed by KWNG" credit
- **Nickname System** — Enter a nickname (max 15 characters) to appear on the leaderboard. Nicknames are checked for duplicates. Your last nickname is remembered across sessions
- **Real-Time Leaderboard** — Top 10 players always visible (top-right, semi-transparent) with gold/silver/bronze crown icons for the top 3
- **Perfect Stack Effect** — Visual feedback (sparkles, shake, score pulse, "PERFECT" text) dynamically colored to match the dropped block
- **Themes** — Dark, Light, Midnight, Sunset, Forest
- **Block Designs** — Classic, Gradient, Striped, Neon, Watery, Fire, Melting, Electric (some premium)
- **Backgrounds** — Clean, Grid, Dots, Waves, Starfield, Aurora, Geometric, Circuits, Bubbles (some premium)
- **Music & SFX** — In-game music, game-over jingle (Mario-style), stack sound, perfect sound. Music toggle in settings
- **Settings Menu** — Theme/design/background selection, music toggle, reset game, change nickname, exit game
- **Device-Based Identity** — A unique device ID is generated on first launch and used as the Firestore document key, so changing your nickname updates the same entry

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 |
| UI | React Native 0.81 / React 19 |
| Language | JavaScript (single-file: `App.js`, ~3200 lines) |
| Audio | expo-audio |
| Storage | @react-native-async-storage/async-storage |
| Backend | Firebase Firestore (leaderboard + nicknames) |
| Safe Area | react-native-safe-area-context |

## Project Structure

```
perfect-stack/
  App.js              # Entire app (game logic, UI, settings, leaderboard)
  app.json            # Expo configuration
  package.json        # Dependencies
  assets/
    game-music.wav    # In-game background music (looping)
    gameover-music.wav # Game-over jingle (~2.5s, Mario-style)
    menu-music.wav    # Menu music (unused, kept for future use)
    stack-sound.wav   # Block stack sound effect
    perfect-sound.wav # Perfect alignment sound effect
  scripts/
    generate-music.js # Node.js script to procedurally generate WAV files
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npx expo`)
- Expo Go app on your phone (for development)

### Installation

```bash
cd perfect-stack
npm install
```

### Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Firestore Database** (start in test mode)
3. Copy your Firebase config and update the `FIREBASE_CONFIG` object in `App.js` (line ~95)

### Run

```bash
npx expo start
```

Scan the QR code with Expo Go on your phone.

## Audio Generation

Sound effects and music are procedurally generated WAV files. To regenerate:

```bash
node scripts/generate-music.js
```

This produces all `.wav` files in the `assets/` directory.

## Architecture Notes

- **Single-file architecture** — The entire app lives in `App.js` for simplicity and portability
- **No Firebase Auth** — Identity is device-based using a locally generated device ID stored in AsyncStorage
- **Firestore document key** — Each user's Firestore document is keyed by their device ID, allowing nickname changes without duplicate entries
- **Leaderboard** — Real-time via Firestore `onSnapshot`, updates automatically when any player beats their high score
- **Music system** — Game music plays on the start screen, during idle, and during gameplay. Only the game-over jingle replaces it temporarily
- **Perfect effect** — Sparkles, shake, and "PERFECT" text are block-localized and dynamically colored to match the current block color

## License

Private project. All rights reserved.
