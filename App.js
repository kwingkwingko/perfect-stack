import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  StatusBar,
  Platform,
  Pressable,
  Animated,
  Easing,
  ScrollView,
  TextInput,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";

// ============================================================================
// CONSTANTS
// ============================================================================

const SCREEN = Dimensions.get("window");

const GAME_WIDTH = SCREEN.width;
const GAME_LEFT = 0;

const BLOCK_H = 30;
const INIT_BLOCK_W = GAME_WIDTH * 0.36;

const BASE_SPEED = 2.5;
const SPEED_INC = 0.15;
const MAX_SPEED = 14;
const PERFECT_THRESHOLD = 6;

const GAME_BASE_Y = SCREEN.height - 30;
const HOVER_GAP = BLOCK_H * 2;
const MIN_MOVING_Y = SCREEN.height * 0.18;

const PALETTE = [
  "#FF6B6B",
  "#FF8E53",
  "#FFC107",
  "#66BB6A",
  "#42A5F5",
  "#7E57C2",
  "#EC407A",
  "#26C6DA",
  "#FF7043",
  "#AB47BC",
  "#29B6F6",
  "#EF5350",
  "#FFCA28",
  "#5C6BC0",
  "#26A69A",
];
const colorAt = (i) => PALETTE[i % PALETTE.length];

// AsyncStorage keys
const KEY_BEST = "@stackdash_best";
const KEY_THEME = "@stackdash_theme";
const KEY_DESIGN = "@stackdash_design";
const KEY_PURCHASES = "@stackdash_purchases";
const KEY_BG = "@stackdash_background";
const KEY_MUSIC = "@stackdash_music_muted";
const KEY_NICKNAME = "@stackdash_nickname";
const KEY_DEVICE_ID = "@stackdash_device_id";
const KEY_COINS = "@stackdash_coins";

// Coin rewards
const PERFECT_COIN_REWARD = 5;
const COIN_MILESTONES = [
  { score: 5, coins: 10 },
  { score: 10, coins: 20 },
  { score: 25, coins: 50 },
  { score: 50, coins: 100 },
  { score: 100, coins: 200 },
];

// ============================================================================
// FIREBASE CONFIG (fill in your Firebase project credentials)
// ============================================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBRnj62ulIPh5UinZoObXsknoaKzH93FiM",
  authDomain: "perfect-stack-ce38a.firebaseapp.com",
  projectId: "perfect-stack-ce38a",
  storageBucket: "perfect-stack-ce38a.firebasestorage.app",
  messagingSenderId: "309696322373",
  appId: "1:309696322373:web:a7767ca721cdf3aca27c2c",
  measurementId: "G-7F9G5W0MVR",
};

const firebaseApp = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(firebaseApp);

// ============================================================================
// THEMES (3 — all free)
// ============================================================================

const THEMES = {
  dark: {
    label: "Dark",
    bg: "#0A0A1A",
    text: "#FFFFFF",
    textSub: "rgba(255,255,255,0.45)",
    textMuted: "rgba(255,255,255,0.3)",
    guide: "rgba(255,255,255,0.05)",
    base: "rgba(255,255,255,0.12)",
    overlay: "rgba(10,10,26,0.88)",
    card: "rgba(255,255,255,0.06)",
    accent: "#FF6B6B",
    statusBar: "light-content",
  },
  light: {
    label: "Light",
    bg: "#F0F0F5",
    text: "#1A1A2E",
    textSub: "rgba(0,0,0,0.4)",
    textMuted: "rgba(0,0,0,0.25)",
    guide: "rgba(0,0,0,0.06)",
    base: "rgba(0,0,0,0.10)",
    overlay: "rgba(240,240,245,0.94)",
    card: "rgba(0,0,0,0.05)",
    accent: "#E94560",
    statusBar: "dark-content",
  },
  neon: {
    label: "Neon",
    bg: "#0D001A",
    text: "#E0AAFF",
    textSub: "rgba(224,170,255,0.5)",
    textMuted: "rgba(224,170,255,0.3)",
    guide: "rgba(224,170,255,0.08)",
    base: "rgba(224,170,255,0.15)",
    overlay: "rgba(13,0,26,0.92)",
    card: "rgba(224,170,255,0.06)",
    accent: "#E040FB",
    statusBar: "light-content",
  },
};
const THEME_KEYS = Object.keys(THEMES);

// ============================================================================
// BLOCK DESIGNS (14 — 2 free, 12 premium)
// ============================================================================

const BLOCK_DESIGNS = {
  classic: { label: "Classic", premium: false, cost: 0 },
  rounded: { label: "Rounded", premium: false, cost: 0 },
  gradient: { label: "Gradient", premium: true, cost: 50 },
  pixel: { label: "Pixel", premium: true, cost: 50 },
  striped: { label: "Striped", premium: true, cost: 50 },
  glass: { label: "Glass", premium: true, cost: 150 },
  candy: { label: "Candy", premium: true, cost: 150 },
  retro: { label: "Retro", premium: true, cost: 150 },
  watery: { label: "Watery", premium: true, cost: 150 },
  glow: { label: "Neon Glow", premium: true, cost: 300 },
  metallic: { label: "Metallic", premium: true, cost: 300 },
  fire: { label: "Fire", premium: true, cost: 300 },
  melting: { label: "Melting", premium: true, cost: 300 },
  electric: { label: "Electric", premium: true, cost: 300 },
};
const DESIGN_KEYS = Object.keys(BLOCK_DESIGNS);

// ============================================================================
// BACKGROUNDS (10 — 3 free, 7 premium)
// ============================================================================

const BACKGROUNDS = {
  clean: { label: "Clean", premium: false, cost: 0 },
  grid: { label: "Grid", premium: false, cost: 0 },
  dots: { label: "Dots", premium: false, cost: 0 },
  geometric: { label: "Geometric", premium: true, cost: 50 },
  waves: { label: "Waves", premium: true, cost: 50 },
  circuit: { label: "Circuit", premium: true, cost: 150 },
  hexgrid: { label: "Hex Grid", premium: true, cost: 150 },
  rain: { label: "Rain", premium: true, cost: 150 },
  starfield: { label: "Starfield", premium: true, cost: 300 },
  aurora: { label: "Aurora", premium: true, cost: 300 },
};
const BG_KEYS = Object.keys(BACKGROUNDS);

// All purchasable item keys (block designs + backgrounds with bg_ prefix)
const DEFAULT_PURCHASES = {
  gradient: false,
  glow: false,
  pixel: false,
  striped: false,
  glass: false,
  metallic: false,
  candy: false,
  retro: false,
  watery: false,
  fire: false,
  melting: false,
  electric: false,
  bg_geometric: false,
  bg_waves: false,
  bg_circuit: false,
  bg_starfield: false,
  bg_hexgrid: false,
  bg_rain: false,
  bg_aurora: false,
};

// ============================================================================
// HELPERS
// ============================================================================

// Rotate RGB channels for a candy-style contrasting border color
function contrastBorder(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${(g + 60) % 256}, ${(b + 40) % 256}, ${(r + 80) % 256})`;
}

// ============================================================================
// BLOCK DESIGN STYLE HELPER
// ============================================================================

function getBlockDesignStyle(designKey, color) {
  switch (designKey) {
    case "rounded":
      return { style: { borderRadius: 12 }, child: null };
    case "gradient":
      return {
        style: { borderRadius: 3, overflow: "hidden" },
        child: (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "40%",
              backgroundColor: "rgba(255,255,255,0.25)",
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
            }}
          />
        ),
      };
    case "glow":
      return {
        style: {
          borderRadius: 3,
          borderWidth: 1.5,
          borderColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 14,
          elevation: 12,
        },
        child: null,
      };
    case "pixel":
      return {
        style: {
          borderRadius: 0,
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.3)",
        },
        child: null,
      };
    case "striped":
      return {
        style: { borderRadius: 3, overflow: "hidden" },
        child: (
          <View style={StyleSheet.absoluteFill}>
            {[0, 0.3, 0.6].map((top, i) => (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `${top * 100}%`,
                  height: "15%",
                  backgroundColor: "rgba(255,255,255,0.22)",
                }}
              />
            ))}
          </View>
        ),
      };
    case "glass":
      return {
        style: {
          borderRadius: 6,
          overflow: "hidden",
          borderTopWidth: 1.5,
          borderTopColor: "rgba(255,255,255,0.6)",
          borderBottomWidth: 1.5,
          borderBottomColor: "rgba(255,255,255,0.3)",
        },
        child: (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "50%",
              backgroundColor: "rgba(255,255,255,0.15)",
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
            }}
          />
        ),
      };
    case "metallic":
      return {
        style: {
          borderRadius: 2,
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.4)",
          overflow: "hidden",
        },
        child: (
          <>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "40%",
                backgroundColor: "rgba(0,0,0,0.2)",
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "25%",
                backgroundColor: "rgba(255,255,255,0.15)",
              }}
            />
          </>
        ),
      };
    case "candy":
      return {
        style: {
          borderRadius: 14,
          borderWidth: 2.5,
          borderColor: contrastBorder(color),
        },
        child: null,
      };
    case "retro":
      return {
        style: {
          borderRadius: 0,
          borderWidth: 3,
          borderTopColor: "rgba(255,255,255,0.4)",
          borderLeftColor: "rgba(255,255,255,0.3)",
          borderBottomColor: "rgba(0,0,0,0.5)",
          borderRightColor: "rgba(0,0,0,0.4)",
        },
        child: null,
      };
    case "watery":
      return {
        style: { borderRadius: 10, overflow: "hidden" },
        child: (
          <View style={StyleSheet.absoluteFill}>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(100,180,255,0.15)",
              }}
            />
            {[0.2, 0.45, 0.7].map((frac, i) => (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left: -4,
                  right: -4,
                  top: `${frac * 100}%`,
                  height: 2,
                  backgroundColor: `rgba(255,255,255,${0.2 + i * 0.08})`,
                  borderRadius: 1,
                }}
              />
            ))}
          </View>
        ),
      };
    case "fire":
      return {
        style: { borderRadius: 3, overflow: "hidden" },
        child: (
          <>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "50%",
                backgroundColor: "rgba(0,0,0,0.25)",
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "30%",
                backgroundColor: "rgba(255,200,0,0.3)",
              }}
            />
            {[0.15, 0.35, 0.55, 0.75].map((frac, i) => (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left: `${frac * 100}%`,
                  top: -3,
                  width: 6,
                  height: 6,
                  backgroundColor: "rgba(255,100,0,0.4)",
                  transform: [{ rotate: "45deg" }],
                }}
              />
            ))}
          </>
        ),
      };
    case "melting":
      return {
        style: { borderRadius: 3, overflow: "visible" },
        child: (
          <>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 2,
                right: 2,
                height: 3,
                backgroundColor: "rgba(255,255,255,0.25)",
                borderRadius: 2,
              }}
            />
            {[0.2, 0.45, 0.7].map((frac, i) => (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left: `${frac * 100}%`,
                  bottom: -(6 + (i % 2) * 4),
                  width: 6,
                  height: 6 + (i % 2) * 4,
                  backgroundColor: color,
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                }}
              />
            ))}
          </>
        ),
      };
    case "electric":
      return {
        style: {
          borderRadius: 3,
          borderWidth: 2,
          borderColor: "rgba(255,255,100,0.7)",
          shadowColor: "#FFFF66",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
          elevation: 6,
          overflow: "hidden",
        },
        child: (
          <View style={StyleSheet.absoluteFill}>
            {[
              { left: "15%", top: 2, rotate: "35deg" },
              { left: "45%", top: 0, rotate: "-40deg" },
              { left: "72%", top: 3, rotate: "30deg" },
            ].map((bolt, i) => (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left: bolt.left,
                  top: bolt.top,
                  width: 2,
                  height: 18,
                  backgroundColor: "rgba(255,255,180,0.5)",
                  transform: [{ rotate: bolt.rotate }],
                }}
              />
            ))}
          </View>
        ),
      };
    default:
      return { style: { borderRadius: 3 }, child: null };
  }
}

// ============================================================================
// BACKGROUND DECORATION RENDERERS
// Deterministic positions — no Math.random() in render.
// ============================================================================

function renderGrid(theme) {
  const els = [];
  const sp = 40;
  for (let y = sp; y < SCREEN.height; y += sp) {
    els.push(
      <View
        key={`h${y}`}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y,
          height: 1,
          backgroundColor: theme.text,
          opacity: 0.04,
        }}
      />,
    );
  }
  for (let x = sp; x < SCREEN.width; x += sp) {
    els.push(
      <View
        key={`v${x}`}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: x,
          width: 1,
          backgroundColor: theme.text,
          opacity: 0.04,
        }}
      />,
    );
  }
  return els;
}

function renderDots(theme) {
  const els = [];
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97 + 13) % Math.floor(SCREEN.width - 10)) + 5;
    const y = ((i * 61 + 29) % Math.floor(SCREEN.height - 10)) + 5;
    const size = 3 + (i % 4);
    els.push(
      <View
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.text,
          opacity: 0.06,
        }}
      />,
    );
  }
  return els;
}

function renderGeometric(theme) {
  const els = [];
  for (let i = 0; i < 18; i++) {
    const x = ((i * 83 + 41) % Math.floor(SCREEN.width - 40)) + 10;
    const y = ((i * 127 + 19) % Math.floor(SCREEN.height - 40)) + 10;
    const size = 16 + (i % 3) * 10;
    els.push(
      <View
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: size,
          height: size,
          borderWidth: 1,
          borderColor: theme.text,
          opacity: 0.05,
          transform: [{ rotate: "45deg" }],
        }}
      />,
    );
  }
  return els;
}

function renderWaves(theme) {
  const els = [];
  for (let i = 0; i < 6; i++) {
    const y = 80 + i * (SCREEN.height / 7);
    els.push(
      <View
        key={i}
        style={{
          position: "absolute",
          left: -20,
          right: -20,
          top: y,
          height: 30 + (i % 3) * 10,
          borderRadius: 200,
          backgroundColor: theme.text,
          opacity: 0.03 + (i % 2) * 0.02,
          transform: [
            { scaleX: 1.3 },
            { rotate: `${(i % 2 === 0 ? 1 : -1) * 2}deg` },
          ],
        }}
      />,
    );
  }
  return els;
}

function renderCircuit(theme) {
  const els = [];
  // Lines
  const lines = [
    { x: 30, y: 100, w: 80, h: 1 },
    { x: 30, y: 100, w: 1, h: 60 },
    { x: 200, y: 180, w: 1, h: 100 },
    { x: 130, y: 280, w: 70, h: 1 },
    { x: 60, y: 400, w: 120, h: 1 },
    { x: 180, y: 400, w: 1, h: 70 },
    { x: 250, y: 500, w: 80, h: 1 },
    { x: 100, y: 600, w: 1, h: 80 },
    { x: 100, y: 680, w: 90, h: 1 },
    { x: 280, y: 300, w: 60, h: 1 },
    { x: 340, y: 300, w: 1, h: 90 },
    { x: 40, y: 750, w: 140, h: 1 },
  ];
  lines.forEach((l, i) => {
    els.push(
      <View
        key={`l${i}`}
        style={{
          position: "absolute",
          left: l.x,
          top: l.y,
          width: l.w,
          height: l.h,
          backgroundColor: theme.text,
          opacity: 0.06,
        }}
      />,
    );
  });
  // Nodes
  const nodes = [
    { x: 30, y: 100 },
    { x: 110, y: 100 },
    { x: 30, y: 160 },
    { x: 200, y: 180 },
    { x: 200, y: 280 },
    { x: 130, y: 280 },
    { x: 60, y: 400 },
    { x: 180, y: 400 },
    { x: 180, y: 470 },
    { x: 250, y: 500 },
    { x: 330, y: 500 },
    { x: 100, y: 600 },
    { x: 100, y: 680 },
    { x: 190, y: 680 },
    { x: 340, y: 300 },
    { x: 340, y: 390 },
  ];
  nodes.forEach((n, i) => {
    els.push(
      <View
        key={`n${i}`}
        style={{
          position: "absolute",
          left: n.x - 3,
          top: n.y - 3,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.text,
          opacity: 0.08,
        }}
      />,
    );
  });
  return els;
}

function renderStarfield(theme) {
  const els = [];
  for (let i = 0; i < 50; i++) {
    const x = ((i * 73 + 17) % Math.floor(SCREEN.width - 4)) + 2;
    const y = ((i * 113 + 37) % Math.floor(SCREEN.height - 4)) + 2;
    const size = 2 + (i % 3);
    const opacity = 0.04 + (i % 5) * 0.015;
    els.push(
      <View
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.text,
          opacity,
        }}
      />,
    );
  }
  return els;
}

function renderHexgrid(theme) {
  const els = [];
  const hexW = 36;
  const hexH = 32;
  let idx = 0;
  for (let row = 0; row < Math.ceil(SCREEN.height / hexH) + 1; row++) {
    const offset = row % 2 === 0 ? 0 : hexW / 2;
    for (let col = -1; col < Math.ceil(SCREEN.width / hexW) + 1; col++) {
      const cx = col * hexW + offset;
      const cy = row * hexH;
      els.push(
        <View
          key={`h${idx}a`}
          style={{
            position: "absolute",
            left: cx - 8,
            top: cy - 1,
            width: 16,
            height: 1.5,
            backgroundColor: theme.text,
            opacity: 0.05,
            transform: [{ rotate: "60deg" }],
          }}
        />,
        <View
          key={`h${idx}b`}
          style={{
            position: "absolute",
            left: cx - 8,
            top: cy - 1,
            width: 16,
            height: 1.5,
            backgroundColor: theme.text,
            opacity: 0.05,
            transform: [{ rotate: "-60deg" }],
          }}
        />,
        <View
          key={`h${idx}c`}
          style={{
            position: "absolute",
            left: cx - 8,
            top: cy - 1,
            width: 16,
            height: 1.5,
            backgroundColor: theme.text,
            opacity: 0.05,
          }}
        />,
      );
      idx++;
    }
  }
  return els;
}

function renderRain(theme) {
  const els = [];
  for (let i = 0; i < 60; i++) {
    const x = ((i * 59 + 23) % Math.floor(SCREEN.width - 4)) + 2;
    const y = ((i * 89 + 11) % Math.floor(SCREEN.height - 20)) + 5;
    const length = 14 + (i % 4) * 6;
    const opacity = 0.04 + (i % 3) * 0.02;
    els.push(
      <View
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 1,
          height: length,
          backgroundColor: theme.text,
          opacity,
          transform: [{ rotate: "20deg" }],
        }}
      />,
    );
  }
  return els;
}

function renderAurora(theme) {
  const els = [];
  const bands = [
    { y: 0.1, h: 80, o: 0.03 },
    { y: 0.2, h: 60, o: 0.05 },
    { y: 0.28, h: 90, o: 0.04 },
    { y: 0.42, h: 70, o: 0.06 },
    { y: 0.55, h: 50, o: 0.03 },
    { y: 0.65, h: 85, o: 0.05 },
    { y: 0.78, h: 60, o: 0.04 },
    { y: 0.88, h: 40, o: 0.03 },
  ];
  bands.forEach((b, i) => {
    els.push(
      <View
        key={i}
        style={{
          position: "absolute",
          left: -30,
          right: -30,
          top: SCREEN.height * b.y,
          height: b.h,
          borderRadius: 200,
          backgroundColor: theme.text,
          opacity: b.o,
          transform: [
            { scaleX: 1.4 },
            { rotate: `${i % 2 === 0 ? 1 : -1}deg` },
          ],
        }}
      />,
    );
  });
  return els;
}

// ============================================================================
// BackgroundDecor COMPONENT
// ============================================================================

function BackgroundDecor({ bgKey, theme }) {
  const elements = useMemo(() => {
    switch (bgKey) {
      case "grid":
        return renderGrid(theme);
      case "dots":
        return renderDots(theme);
      case "geometric":
        return renderGeometric(theme);
      case "waves":
        return renderWaves(theme);
      case "circuit":
        return renderCircuit(theme);
      case "starfield":
        return renderStarfield(theme);
      case "hexgrid":
        return renderHexgrid(theme);
      case "rain":
        return renderRain(theme);
      case "aurora":
        return renderAurora(theme);
      default:
        return null;
    }
  }, [bgKey, theme]);
  if (!elements) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {elements}
    </View>
  );
}

// ============================================================================
// CONFETTI
// ============================================================================

const CONFETTI_COUNT = 40;
const CONFETTI_COLORS = [
  "#FF6B6B",
  "#FFC107",
  "#66BB6A",
  "#42A5F5",
  "#EC407A",
  "#FF8E53",
  "#7E57C2",
  "#26C6DA",
];

function Confetti({ active }) {
  const particles = useRef(
    Array.from({ length: CONFETTI_COUNT }, () => ({
      anim: new Animated.Value(0),
      x: Math.random() * SCREEN.width,
      drift: (Math.random() - 0.5) * 160,
      spin: 360 + Math.random() * 720,
      w: 6 + Math.random() * 6,
      h: 10 + Math.random() * 10,
      color:
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      dur: 2200 + Math.random() * 1400,
      del: Math.random() * 500,
    })),
  ).current;

  useEffect(() => {
    if (!active) return;
    Animated.parallel(
      particles.map((p) => {
        p.anim.setValue(0);
        return Animated.timing(p.anim, {
          toValue: 1,
          duration: p.dur,
          delay: p.del,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
      }),
    ).start();
  }, [active]);

  if (!active) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: -14,
            width: p.w,
            height: p.h,
            backgroundColor: p.color,
            borderRadius: 2,
            opacity: p.anim.interpolate({
              inputRange: [0, 0.8, 1],
              outputRange: [1, 1, 0],
            }),
            transform: [
              {
                translateY: p.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, SCREEN.height + 40],
                }),
              },
              {
                translateX: p.anim.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [0, p.drift * 0.6, p.drift],
                }),
              },
              {
                rotate: p.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", `${p.spin}deg`],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ============================================================================
// SETTINGS OVERLAY
// ============================================================================

function SettingsOverlay({
  theme,
  activeThemeKey,
  activeDesignKey,
  activeBgKey,
  purchases,
  musicMuted,
  onSelectTheme,
  onSelectDesign,
  onSelectBg,
  onPurchase,
  onToggleMusic,
  onClose,
  onReset,
  onSignOut,
  onExit,
  coins,
}) {
  const [confirmItem, setConfirmItem] = useState(null);
  const [unlockSuccess, setUnlockSuccess] = useState(false);

  return (
    <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
      {/* Header */}
      <View style={styles.settingsHeader}>
        <Text style={[styles.settingsTitle, { color: theme.text }]}>
          Settings
        </Text>
        <Pressable onPress={onClose} hitSlop={12} style={[styles.closeBtn, { backgroundColor: theme.card }]}>
          <Text style={[styles.closeBtnTxt, { color: theme.text }]}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.settingsScroll}
        contentContainerStyle={styles.settingsContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- COIN BALANCE ---- */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.card,
            borderRadius: 16,
            paddingVertical: 10,
            paddingHorizontal: 20,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 20, marginRight: 8 }}>🪙</Text>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: "#FFD700",
            }}
          >
            {coins}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: theme.textSub,
              marginLeft: 8,
            }}
          >
            coins
          </Text>
        </View>

        {/* ---- MUSIC TOGGLE ---- */}
        <View style={styles.musicRow}>
          <Text style={[styles.musicLabel, { color: theme.text }]}>Music</Text>
          <Pressable
            onPress={onToggleMusic}
            style={[
              styles.musicToggle,
              {
                backgroundColor: musicMuted ? theme.card : theme.accent,
                borderColor: musicMuted ? theme.textMuted : theme.accent,
              },
            ]}
          >
            <View
              style={[
                styles.musicKnob,
                { alignSelf: musicMuted ? "flex-start" : "flex-end" },
              ]}
            />
          </Pressable>
          <Text style={[styles.musicStatus, { color: theme.textSub }]}>
            {musicMuted ? "Off" : "On"}
          </Text>
        </View>

        {/* ---- THEMES ---- */}
        <Text style={[styles.sectionLabel, { color: theme.textSub }]}>
          THEMES
        </Text>
        <View style={styles.optionRow}>
          {THEME_KEYS.map((key) => {
            const t = THEMES[key];
            const active = key === activeThemeKey;
            return (
              <Pressable
                key={key}
                onPress={() => onSelectTheme(key)}
                style={styles.themeCard}
              >
                <View
                  style={[
                    styles.themeSwatch,
                    {
                      backgroundColor: t.bg,
                      borderColor: active
                        ? t.accent || "#FFF"
                        : "rgba(128,128,128,0.3)",
                      borderWidth: active ? 3 : 1.5,
                    },
                  ]}
                >
                  {active && (
                    <Text style={{ color: t.text, fontSize: 18 }}>✓</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.themeLabel,
                    { color: active ? theme.text : theme.textMuted },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ---- BACKGROUNDS ---- */}
        <Text
          style={[styles.sectionLabel, { color: theme.textSub, marginTop: 28 }]}
        >
          BACKGROUNDS
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 8 }}
        >
          {BG_KEYS.map((key) => {
            const bg = BACKGROUNDS[key];
            const active = key === activeBgKey;
            const purchaseKey = bg.premium ? `bg_${key}` : null;
            const locked = bg.premium && !purchases[purchaseKey];
            return (
              <Pressable
                key={key}
                onPress={() => {
                  if (locked) setConfirmItem({ type: "bg", key });
                  else {
                    onSelectBg(key);
                    setConfirmItem(null);
                  }
                }}
                style={[
                  styles.bgCard,
                  {
                    borderColor: active ? theme.accent : theme.card,
                    backgroundColor: theme.card,
                  },
                ]}
              >
                {/* Mini preview */}
                <View style={[styles.bgPreview, { backgroundColor: theme.bg }]}>
                  <BackgroundMiniPreview bgKey={key} theme={theme} />
                </View>
                <Text
                  style={[
                    styles.designLabel,
                    { color: active ? theme.text : theme.textMuted },
                  ]}
                >
                  {bg.label}
                </Text>
                {locked && <Text style={styles.lockIcon}>🔒</Text>}
                {active && !locked && (
                  <Text
                    style={{ color: theme.accent, fontSize: 11, marginTop: 2 }}
                  >
                    Active
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ---- BLOCK DESIGNS ---- */}
        <Text
          style={[styles.sectionLabel, { color: theme.textSub, marginTop: 28 }]}
        >
          BLOCK DESIGNS
        </Text>
        <View style={styles.optionRow}>
          {DESIGN_KEYS.map((key) => {
            const d = BLOCK_DESIGNS[key];
            const active = key === activeDesignKey;
            const locked = d.premium && !purchases[key];
            const sampleColor = "#42A5F5";
            const ds = getBlockDesignStyle(key, sampleColor);
            return (
              <Pressable
                key={key}
                onPress={() => {
                  if (locked) setConfirmItem({ type: "design", key });
                  else {
                    onSelectDesign(key);
                    setConfirmItem(null);
                  }
                }}
                style={[
                  styles.designCard,
                  {
                    borderColor: active ? theme.accent : theme.card,
                    backgroundColor: theme.card,
                  },
                ]}
              >
                <View
                  style={[
                    {
                      width: 48,
                      height: 20,
                      backgroundColor: sampleColor,
                      marginBottom: 8,
                    },
                    ds.style,
                  ]}
                >
                  {ds.child}
                </View>
                <Text
                  style={[
                    styles.designLabel,
                    { color: active ? theme.text : theme.textMuted },
                  ]}
                >
                  {d.label}
                </Text>
                {locked && <Text style={styles.lockIcon}>🔒</Text>}
                {active && !locked && (
                  <Text
                    style={{ color: theme.accent, fontSize: 11, marginTop: 2 }}
                  >
                    Active
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* ---- RESET GAME ---- */}
        <Pressable
          onPress={onReset}
          style={[styles.exitBtn, { borderColor: theme.textMuted }]}
        >
          <Text style={[styles.exitBtnTxt, { color: theme.accent }]}>
            Reset Game
          </Text>
        </Pressable>

        {/* ---- CHANGE NICKNAME ---- */}
        <Pressable
          onPress={onSignOut}
          style={[
            styles.exitBtn,
            { borderColor: theme.textMuted, marginTop: 12 },
          ]}
        >
          <Text style={[styles.exitBtnTxt, { color: theme.textSub }]}>
            Change Nickname
          </Text>
        </Pressable>

        {/* ---- EXIT GAME (mobile only) ---- */}
        {Platform.OS !== "web" && (
          <Pressable
            onPress={onExit}
            style={[
              styles.exitBtn,
              { borderColor: theme.textMuted, marginTop: 12 },
            ]}
          >
            <Text style={[styles.exitBtnTxt, { color: theme.textSub }]}>
              Exit Game
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* ---- PURCHASE MODAL ---- */}
      {confirmItem &&
        (() => {
          const isDesign = confirmItem.type === "design";
          const itemData = isDesign
            ? BLOCK_DESIGNS[confirmItem.key]
            : BACKGROUNDS[confirmItem.key];
          const label = itemData?.label;
          const cost = itemData?.cost || 0;
          const purchaseKey = isDesign
            ? confirmItem.key
            : `bg_${confirmItem.key}`;
          const canAfford = coins >= cost;
          return (
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: "rgba(0,0,0,0.55)",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 200,
              }}
            >
              <View
                style={{
                  width: SCREEN.width * 0.82,
                  backgroundColor: theme.overlay,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: theme.accent,
                  padding: 28,
                  alignItems: "center",
                }}
              >
                {unlockSuccess ? (
                  <>
                    <Text
                      style={{
                        fontSize: 28,
                        fontWeight: "800",
                        color: theme.accent,
                        marginBottom: 8,
                      }}
                    >
                      Unlocked!
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.textSub }}>
                      {label} is now available
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "700",
                        color: theme.text,
                        marginBottom: 8,
                      }}
                    >
                      Unlock "{label}"?
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <Text style={{ fontSize: 18, marginRight: 6 }}>🪙</Text>
                      <Text
                        style={{
                          fontSize: 24,
                          fontWeight: "800",
                          color: "#FFD700",
                        }}
                      >
                        {cost}
                      </Text>
                    </View>
                    {!canAfford && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#FF6B6B",
                          marginBottom: 4,
                        }}
                      >
                        Not enough coins! You need {cost - coins} more
                      </Text>
                    )}
                    <Text
                      style={{
                        fontSize: 12,
                        color: theme.textSub,
                        marginBottom: 16,
                      }}
                    >
                      Your balance: {coins} coins
                    </Text>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <Pressable
                        onPress={() => setConfirmItem(null)}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 28,
                          borderRadius: 20,
                          borderWidth: 1.5,
                          borderColor: theme.textMuted,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: theme.textSub,
                          }}
                        >
                          Cancel
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          if (!canAfford) return;
                          const success = onPurchase(purchaseKey, cost);
                          if (success) {
                            if (isDesign) onSelectDesign(confirmItem.key);
                            else onSelectBg(confirmItem.key);
                            setUnlockSuccess(true);
                            setTimeout(() => {
                              setUnlockSuccess(false);
                              setConfirmItem(null);
                            }, 1200);
                          }
                        }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 28,
                          borderRadius: 20,
                          backgroundColor: canAfford ? theme.accent : theme.textMuted,
                          borderWidth: 1.5,
                          borderColor: canAfford ? theme.accent : theme.textMuted,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: "#FFF",
                          }}
                        >
                          Unlock
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            </View>
          );
        })()}
    </View>
  );
}

// Mini background preview for settings cards
function BackgroundMiniPreview({ bgKey, theme }) {
  if (bgKey === "clean") return null;
  if (bgKey === "grid") {
    const els = [];
    for (let y = 8; y < 50; y += 10)
      els.push(
        <View
          key={`h${y}`}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: y,
            height: 1,
            backgroundColor: theme.text,
            opacity: 0.12,
          }}
        />,
      );
    for (let x = 10; x < 80; x += 14)
      els.push(
        <View
          key={`v${x}`}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: x,
            width: 1,
            backgroundColor: theme.text,
            opacity: 0.12,
          }}
        />,
      );
    return <>{els}</>;
  }
  if (bgKey === "dots") {
    return (
      <>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: 8 + ((i * 11) % 65),
              top: 6 + ((i * 7) % 38),
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.text,
              opacity: 0.15,
            }}
          />
        ))}
      </>
    );
  }
  if (bgKey === "geometric") {
    return (
      <>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: 10 + i * 18,
              top: 10 + (i % 2) * 14,
              width: 12,
              height: 12,
              borderWidth: 1,
              borderColor: theme.text,
              opacity: 0.12,
              transform: [{ rotate: "45deg" }],
            }}
          />
        ))}
      </>
    );
  }
  if (bgKey === "waves") {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: -5,
              right: -5,
              top: 10 + i * 15,
              height: 10,
              borderRadius: 40,
              backgroundColor: theme.text,
              opacity: 0.08,
            }}
          />
        ))}
      </>
    );
  }
  if (bgKey === "circuit") {
    return (
      <>
        <View
          style={{
            position: "absolute",
            left: 10,
            top: 15,
            width: 25,
            height: 1,
            backgroundColor: theme.text,
            opacity: 0.15,
          }}
        />
        <View
          style={{
            position: "absolute",
            left: 35,
            top: 15,
            width: 1,
            height: 20,
            backgroundColor: theme.text,
            opacity: 0.15,
          }}
        />
        <View
          style={{
            position: "absolute",
            left: 50,
            top: 30,
            width: 20,
            height: 1,
            backgroundColor: theme.text,
            opacity: 0.15,
          }}
        />
        {[
          { x: 10, y: 15 },
          { x: 35, y: 15 },
          { x: 35, y: 35 },
          { x: 50, y: 30 },
          { x: 70, y: 30 },
        ].map((n, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: n.x - 2,
              top: n.y - 2,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.text,
              opacity: 0.2,
            }}
          />
        ))}
      </>
    );
  }
  if (bgKey === "starfield") {
    return (
      <>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: 5 + ((i * 8) % 70),
              top: 4 + ((i * 6) % 42),
              width: 2 + (i % 2),
              height: 2 + (i % 2),
              borderRadius: 2,
              backgroundColor: theme.text,
              opacity: 0.1 + (i % 4) * 0.05,
            }}
          />
        ))}
      </>
    );
  }
  if (bgKey === "hexgrid") {
    const els = [];
    for (let i = 0; i < 6; i++) {
      const cx = 12 + (i % 3) * 24;
      const cy = 10 + Math.floor(i / 3) * 20 + (i % 3 === 1 ? 10 : 0);
      els.push(
        <View
          key={`${i}a`}
          style={{
            position: "absolute",
            left: cx - 6,
            top: cy,
            width: 12,
            height: 1,
            backgroundColor: theme.text,
            opacity: 0.12,
            transform: [{ rotate: "60deg" }],
          }}
        />,
        <View
          key={`${i}b`}
          style={{
            position: "absolute",
            left: cx - 6,
            top: cy,
            width: 12,
            height: 1,
            backgroundColor: theme.text,
            opacity: 0.12,
            transform: [{ rotate: "-60deg" }],
          }}
        />,
      );
    }
    return <>{els}</>;
  }
  if (bgKey === "rain") {
    return (
      <>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: 8 + ((i * 10) % 65),
              top: 4 + ((i * 7) % 30),
              width: 1,
              height: 10 + (i % 3) * 4,
              backgroundColor: theme.text,
              opacity: 0.12,
              transform: [{ rotate: "20deg" }],
            }}
          />
        ))}
      </>
    );
  }
  if (bgKey === "aurora") {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: -5,
              right: -5,
              top: 8 + i * 14,
              height: 8,
              borderRadius: 30,
              backgroundColor: theme.text,
              opacity: 0.06 + (i % 2) * 0.03,
              transform: [{ scaleX: 1.3 }],
            }}
          />
        ))}
      </>
    );
  }
  return null;
}

// ============================================================================
// LOGIN SCREEN — animated logo, falling blocks bg, auth buttons, dev credit
// ============================================================================

const FALLING_BLOCKS = Array.from({ length: 12 }, (_, i) => ({
  x: ((i * 79 + 23) % Math.floor(SCREEN.width - 60)) + 10,
  w: 30 + ((i * 13) % 41),
  h: BLOCK_H - 2,
  color: PALETTE[i % PALETTE.length],
  speed: 3000 + ((i * 700) % 3001),
  delay: (i * 400) % 2800,
}));

function StartScreen({ theme, onSubmitNickname }) {
  // Animated logo
  const logoScale = useRef(new Animated.Value(0)).current;
  const blockAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Falling blocks
  const fallingAnims = useRef(
    FALLING_BLOCKS.map(() => new Animated.Value(0)),
  ).current;

  // Nickname input
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Logo spring in
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start();

    // Block tower builds piece by piece
    blockAnims.forEach((anim, i) => {
      Animated.sequence([
        Animated.delay(200 + i * 200),
        Animated.spring(anim, {
          toValue: 1,
          friction: 5,
          tension: 160,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Falling background blocks — loop forever
    fallingAnims.forEach((anim, i) => {
      const fb = FALLING_BLOCKS[i];
      const loop = () => {
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: 1,
          duration: fb.speed,
          delay: fb.delay,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(() => loop());
      };
      loop();
    });
  }, []);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (trimmed.length === 0 || trimmed.length > 15) return;
    setErrorMsg("");
    setSubmitting(true);
    const result = await onSubmitNickname(trimmed);
    if (result === "taken") {
      setErrorMsg("Nickname already taken. Try another!");
    } else if (result === "error") {
      setErrorMsg("Something went wrong. Try again.");
    }
    setSubmitting(false);
  };

  const logoColors = [PALETTE[4], PALETTE[3], PALETTE[0]];

  return (
    <View style={[styles.overlay, { backgroundColor: theme.bg }]}>
      {/* Falling blocks background */}
      {fallingAnims.map((anim, i) => {
        const fb = FALLING_BLOCKS[i];
        return (
          <Animated.View
            key={`fb-${i}`}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: fb.x,
              width: fb.w,
              height: fb.h,
              backgroundColor: fb.color,
              borderRadius: 3,
              opacity: 0.12,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-fb.h - 20, SCREEN.height + 20],
                  }),
                },
              ],
            }}
          />
        );
      })}

      {/* Animated logo — block tower + text */}
      <Animated.View
        style={{ alignItems: "center", transform: [{ scale: logoScale }] }}
      >
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          {logoColors.map((color, i) => (
            <Animated.View
              key={i}
              style={{
                width: 50 - i * 4,
                height: 14,
                backgroundColor: color,
                borderRadius: 3,
                marginBottom: 2,
                opacity: blockAnims[i],
                transform: [
                  {
                    translateX: blockAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [i % 2 === 0 ? -80 : 80, 0],
                    }),
                  },
                  {
                    scale: blockAnims[i],
                  },
                ],
              }}
            />
          ))}
        </View>
        <Text style={[styles.logo, { color: theme.text }]}>
          {"PERFECT\nSTACK"}
        </Text>
      </Animated.View>

      <Text style={[styles.tagline, { color: theme.textSub }]}>
        Enter a nickname to play
      </Text>

      {/* Nickname input */}
      <TextInput
        value={input}
        onChangeText={(t) => { setInput(t.slice(0, 15)); setErrorMsg(""); }}
        placeholder="Enter nickname..."
        placeholderTextColor={theme.textMuted}
        maxLength={15}
        autoFocus
        style={[
          styles.nicknameInput,
          {
            color: theme.text,
            borderColor: errorMsg ? "#FF4444" : theme.textMuted,
            backgroundColor: theme.card,
          },
        ]}
      />
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: theme.textMuted,
          marginTop: 8,
        }}
      >
        {input.length}/15
      </Text>

      {errorMsg ? (
        <Text style={{ color: "#FF4444", fontSize: 13, fontWeight: "600", marginTop: 8 }}>
          {errorMsg}
        </Text>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={input.trim().length === 0 || submitting}
        style={[
          styles.authBtn,
          {
            backgroundColor: theme.accent,
            marginTop: 20,
            opacity: input.trim().length > 0 ? 1 : 0.4,
          },
        ]}
      >
        {submitting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={[styles.authBtnTxt, { color: "#FFF" }]}>PLAY</Text>
        )}
      </Pressable>

      {/* Developer credit */}
      <Text style={[styles.devCredit, { color: theme.textMuted }]}>
        Developed by KWNG
      </Text>
    </View>
  );
}

// ============================================================================
// LEADERBOARD OVERLAY — always visible, top-right, semi-transparent
// ============================================================================

const CROWN_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

function LeaderboardOverlay({ entries, theme, currentUid }) {
  if (!entries || entries.length === 0) return null;
  return (
    <View pointerEvents="none" style={styles.leaderboardContainer}>
      <View style={[styles.leaderboardBox, { backgroundColor: theme.overlay }]}>
        <Text style={[styles.leaderboardTitle, { color: theme.textSub }]}>
          TOP 10
        </Text>
        {entries.map((entry, i) => {
          const isMe = entry.id === currentUid;
          const crown = i < 3 ? CROWN_COLORS[i] : null;
          return (
            <View key={entry.id} style={styles.leaderboardRow}>
              <Text
                style={[
                  styles.leaderboardRank,
                  { color: isMe ? theme.accent : theme.textMuted },
                ]}
              >
                {crown ? (
                  <Text style={{ color: crown }}>♛ </Text>
                ) : `${i + 1}. `}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.leaderboardName,
                  { color: isMe ? theme.accent : theme.textSub },
                ]}
              >
                {entry.nickname}
              </Text>
              <Text
                style={[
                  styles.leaderboardScore,
                  { color: isMe ? theme.accent : theme.text },
                ]}
              >
                {entry.score}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  // ---- Game state ----
  const [gameState, setGameState] = useState("idle");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [movingX, setMovingX] = useState(GAME_LEFT);
  const [movingW, setMovingW] = useState(INIT_BLOCK_W);
  const [cutoff, setCutoff] = useState(null);
  const [perfectColor, setPerfectColor] = useState("#FFC107");
  const [perfectBlockPos, setPerfectBlockPos] = useState({
    x: SCREEN.width / 2,
    y: SCREEN.height * 0.5,
    w: INIT_BLOCK_W,
  });

  // ---- Settings state ----
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState("dark");
  const [activeDesign, setActiveDesign] = useState("classic");
  const [activeBg, setActiveBg] = useState("clean");
  const [purchases, setPurchases] = useState({ ...DEFAULT_PURCHASES });
  const [coins, setCoins] = useState(0);
  const [musicMuted, setMusicMuted] = useState(false);

  // ---- Auth & leaderboard state ----
  const [nickname, setNickname] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [appScreen, setAppScreen] = useState("loading");
  const [leaderboard, setLeaderboard] = useState([]);

  const theme = THEMES[activeTheme] || THEMES.dark;

  // ---- Refs ----
  const frameRef = useRef(null);
  const posRef = useRef(GAME_LEFT);
  const dirRef = useRef(1);
  const speedRef = useRef(BASE_SPEED);
  const wRef = useRef(INIT_BLOCK_W);
  const blocksRef = useRef([]);
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const gsRef = useRef("idle");
  const lockRef = useRef(false);
  const menuOpenRef = useRef(false);

  // ---- Animated values ----
  const cutFall = useRef(new Animated.Value(0)).current;
  const cutFade = useRef(new Animated.Value(1)).current;
  const camAnim = useRef(new Animated.Value(0)).current;
  const camTargetRef = useRef(0);

  // Perfect stack effect
  const perfectScale = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const shakeY = useRef(new Animated.Value(0)).current;
  const perfectTextScale = useRef(new Animated.Value(0)).current;
  const perfectTextOpacity = useRef(new Animated.Value(0)).current;
  const coinPopAnim = useRef(new Animated.Value(0)).current;
  const coinPopOpacity = useRef(new Animated.Value(0)).current;
  const [coinEarned, setCoinEarned] = useState(0);
  const sparkles = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      anim: new Animated.Value(0),
      angle: (i / 8) * Math.PI * 2,
      dist: 25 + ((i * 7) % 20),
    })),
  ).current;

  // Audio players (expo-audio)
  const gamePlayer = useAudioPlayer(require("./assets/game-music.wav"));
  const gameOverPlayer = useAudioPlayer(require("./assets/gameover-music.wav"));
  const stackPlayer = useAudioPlayer(require("./assets/stack-sound.wav"));
  const perfectPlayer = useAudioPlayer(require("./assets/perfect-sound.wav"));

  // Sync refs
  const musicMutedRef = useRef(false);
  const deviceIdRef = useRef(null);
  const coinsRef = useRef(0);
  const milestonesHitRef = useRef(new Set());
  useEffect(() => {
    gsRef.current = gameState;
  }, [gameState]);
  useEffect(() => {
    bestRef.current = bestScore;
  }, [bestScore]);
  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);
  useEffect(() => {
    musicMutedRef.current = musicMuted;
  }, [musicMuted]);
  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);
  useEffect(() => {
    coinsRef.current = coins;
  }, [coins]);

  // ---------- Load all persisted data + device ID + nickname ----------
  useEffect(() => {
    (async () => {
      try {
        // Configure audio
        setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
        // Configure audio players
        gamePlayer.loop = true;
        gamePlayer.volume = 0.5;
        gameOverPlayer.volume = 0.45;
        stackPlayer.volume = 0.6;
        perfectPlayer.volume = 0.7;

        const [vBest, vTheme, vDesign, vBg, vPurch, vMuted, vNickname, vDeviceId, vCoins] =
          await Promise.all([
            AsyncStorage.getItem(KEY_BEST),
            AsyncStorage.getItem(KEY_THEME),
            AsyncStorage.getItem(KEY_DESIGN),
            AsyncStorage.getItem(KEY_BG),
            AsyncStorage.getItem(KEY_PURCHASES),
            AsyncStorage.getItem(KEY_MUSIC),
            AsyncStorage.getItem(KEY_NICKNAME),
            AsyncStorage.getItem(KEY_DEVICE_ID),
            AsyncStorage.getItem(KEY_COINS),
          ]);
        if (vBest !== null) {
          const p = parseInt(vBest, 10);
          setBestScore(p);
          bestRef.current = p;
        }
        if (vTheme && THEMES[vTheme]) setActiveTheme(vTheme);
        if (vDesign && BLOCK_DESIGNS[vDesign]) setActiveDesign(vDesign);
        if (vBg && BACKGROUNDS[vBg]) setActiveBg(vBg);
        if (vPurch) {
          try {
            setPurchases((prev) => ({ ...prev, ...JSON.parse(vPurch) }));
          } catch (_) {}
        }
        if (vMuted === "true") setMusicMuted(true);
        if (vCoins !== null) {
          const c = parseInt(vCoins, 10);
          if (!isNaN(c)) { setCoins(c); coinsRef.current = c; }
        }

        // Device ID — generate if not exists
        let did = vDeviceId;
        if (!did) {
          did = Date.now().toString(36) + Math.random().toString(36).slice(2);
          await AsyncStorage.setItem(KEY_DEVICE_ID, did);
        }
        setDeviceId(did);
        deviceIdRef.current = did;

        // Nickname — auto-pull from last session
        if (vNickname) {
          setNickname(vNickname);
          setAppScreen("game");
        } else {
          setAppScreen("login");
        }
      } catch (_) {
        setAppScreen("login");
      }
    })();
  }, []);

  // ---------- Nickname submission (with duplicate check, uses device ID) ----------
  const handleNicknameSubmit = useCallback(async (name) => {
    const did = deviceIdRef.current;
    if (!did) return "error";
    try {
      // Check if nickname already taken by a DIFFERENT device
      const q = query(
        collection(db, "users"),
        where("nickname", "==", name),
        limit(1),
      );
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0].id !== did) {
        return "taken";
      }
      // Save or update Firestore doc (device ID as doc ID)
      await setDoc(doc(db, "users", did), {
        nickname: name,
        bestScore: bestRef.current || 0,
        deviceId: did,
        createdAt: new Date().toISOString(),
      }, { merge: true });
      // Save to local storage
      await AsyncStorage.setItem(KEY_NICKNAME, name);
      setNickname(name);
      setAppScreen("game");
      return "ok";
    } catch (e) {
      console.warn("Failed to save nickname:", e);
      return "error";
    }
  }, []);

  // ---------- Firestore: real-time leaderboard ----------
  useEffect(() => {
    if (appScreen !== "game") return;
    const q = query(
      collection(db, "users"),
      orderBy("bestScore", "desc"),
      limit(10),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entries = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          entries.push({
            id: docSnap.id,
            nickname: data.nickname || "???",
            score: data.bestScore || 0,
          });
        });
        setLeaderboard(entries);
      },
      (err) => {
        console.warn("Leaderboard subscription error:", err);
      },
    );
    return () => unsubscribe();
  }, [appScreen]);

  // ---------- Audio: switch tracks on state change ----------
  useEffect(() => {
    try {
      if (musicMuted) {
        gamePlayer.pause();
        gameOverPlayer.pause();
        return;
      }
      // Game over — play jingle, stop game music
      if (appScreen === "game" && gameState === "over") {
        gamePlayer.pause();
        gameOverPlayer.seekTo(0);
        gameOverPlayer.play();
      } else {
        // Everywhere else (start screen, idle, playing) — play game music
        gameOverPlayer.pause();
        if (!gamePlayer.playing) gamePlayer.play();
      }
    } catch (_) {}
  }, [gameState, musicMuted, appScreen]);

  // ---------- Play one-shot sound effect ----------
  const playSfx = useCallback((player) => {
    if (musicMutedRef.current || !player) return;
    try {
      player.seekTo(0);
      player.play();
    } catch (_) {}
  }, []);

  // ---------- Game loop ----------
  const tick = useCallback(() => {
    if (gsRef.current !== "playing" || menuOpenRef.current) return;
    posRef.current += speedRef.current * dirRef.current;
    const lb = GAME_LEFT;
    const rb = GAME_LEFT + GAME_WIDTH - wRef.current;
    if (posRef.current >= rb) {
      posRef.current = rb;
      dirRef.current = -1;
    } else if (posRef.current <= lb) {
      posRef.current = lb;
      dirRef.current = 1;
    }
    setMovingX(posRef.current);
    frameRef.current = requestAnimationFrame(tick);
  }, []);

  const startLoop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  // ---------- Camera ----------
  const animateCamera = useCallback(
    (target) => {
      if (target === camTargetRef.current) return;
      camTargetRef.current = target;
      Animated.timing(camAnim, {
        toValue: target,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    },
    [camAnim],
  );

  // ---------- Perfect stack effect ----------
  const triggerPerfectEffect = useCallback(() => {
    // 1. Score pulse
    perfectScale.setValue(1.6);
    Animated.spring(perfectScale, {
      toValue: 1,
      friction: 3,
      tension: 200,
      useNativeDriver: true,
    }).start();

    // 2. Screen shake
    const shakeSeq = (axis) => {
      const vals = [7, -6, 5, -4, 3, -2, 0];
      return Animated.sequence(
        vals.map((v) =>
          Animated.timing(axis, {
            toValue: v,
            duration: 300 / vals.length,
            useNativeDriver: true,
          }),
        ),
      );
    };
    shakeX.setValue(0);
    shakeY.setValue(0);
    Animated.parallel([shakeSeq(shakeX), shakeSeq(shakeY)]).start();

    // 3. Block sparkles fly outward
    sparkles.forEach((sp, i) => {
      sp.angle = (i / 8) * Math.PI * 2 + ((i % 3) - 1) * 0.3;
      sp.anim.setValue(0);
      Animated.timing(sp.anim, {
        toValue: 1,
        duration: 400 + (i % 3) * 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    // 4. PERFECT! text pop-in + fade-out
    perfectTextScale.setValue(0.3);
    perfectTextOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(perfectTextScale, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(perfectTextOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    perfectScale,
    shakeX,
    shakeY,
    sparkles,
    perfectTextScale,
    perfectTextOpacity,
  ]);

  // ---------- Menu open/close ----------
  const openMenu = useCallback(() => {
    setMenuOpen((prev) => {
      const next = !prev;
      menuOpenRef.current = next;
      if (next && gsRef.current === "playing") stopLoop();
      if (!next && gsRef.current === "playing") startLoop();
      return next;
    });
  }, [stopLoop, startLoop]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    menuOpenRef.current = false;
    if (gsRef.current === "playing") startLoop();
  }, [startLoop]);

  // ---------- Settings handlers ----------
  const handleSelectTheme = useCallback((k) => {
    setActiveTheme(k);
    AsyncStorage.setItem(KEY_THEME, k).catch(() => {});
  }, []);
  const handleSelectDesign = useCallback((k) => {
    setActiveDesign(k);
    AsyncStorage.setItem(KEY_DESIGN, k).catch(() => {});
  }, []);
  const handleSelectBg = useCallback((k) => {
    setActiveBg(k);
    AsyncStorage.setItem(KEY_BG, k).catch(() => {});
  }, []);
  const handlePurchase = useCallback((purchaseKey, cost) => {
    if (coinsRef.current < cost) return false;
    const newCoins = coinsRef.current - cost;
    coinsRef.current = newCoins;
    setCoins(newCoins);
    AsyncStorage.setItem(KEY_COINS, String(newCoins)).catch(() => {});
    setPurchases((prev) => {
      const updated = { ...prev, [purchaseKey]: true };
      AsyncStorage.setItem(KEY_PURCHASES, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    return true;
  }, []);
  const handleToggleMusic = useCallback(() => {
    setMusicMuted((prev) => {
      const next = !prev;
      AsyncStorage.setItem(KEY_MUSIC, String(next)).catch(() => {});
      return next;
    });
  }, []);
  const handleReset = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setScore(0);
    setBestScore(0);
    setBlocks([]);
    setGameState("idle");
    setIsNewBest(false);
    setMovingX(GAME_LEFT);
    setMovingW(INIT_BLOCK_W);
    setCutoff(null);
    setPerfectColor("#FFC107");
    setPerfectBlockPos({
      x: SCREEN.width / 2,
      y: SCREEN.height * 0.5,
      w: INIT_BLOCK_W,
    });
    scoreRef.current = 0;
    bestRef.current = 0;
    blocksRef.current = [];
    gsRef.current = "idle";
    speedRef.current = BASE_SPEED;
    wRef.current = INIT_BLOCK_W;
    dirRef.current = 1;
    posRef.current = GAME_LEFT;
    lockRef.current = false;
    camTargetRef.current = 0;
    camAnim.setValue(0);
    AsyncStorage.removeItem(KEY_BEST).catch(() => {});
    setMenuOpen(false);
    menuOpenRef.current = false;
    // Stop game-over music, game music will resume via the effect
    try { gameOverPlayer.pause(); } catch (_) {}
  }, [camAnim, gameOverPlayer]);

  const handleSignOut = useCallback(() => {
    setMenuOpen(false);
    menuOpenRef.current = false;
    // Stop game music when going back to start screen
    try { gamePlayer.pause(); gameOverPlayer.pause(); } catch (_) {}
    AsyncStorage.removeItem(KEY_NICKNAME).catch(() => {});
    setNickname(null);
    setGameState("idle");
    gsRef.current = "idle";
    setAppScreen("login");
  }, [gamePlayer, gameOverPlayer]);

  const handleExit = useCallback(() => {
    if (Platform.OS === "android") {
      BackHandler.exitApp();
    } else if (Platform.OS === "ios") {
      // iOS doesn't support programmatic exit — go back to start screen
      setMenuOpen(false);
      menuOpenRef.current = false;
      AsyncStorage.removeItem(KEY_NICKNAME).catch(() => {});
      setNickname(null);
      setAppScreen("login");
    }
  }, []);

  // ---------- Start game ----------
  const startGame = useCallback(() => {
    const base = {
      x: GAME_LEFT + (GAME_WIDTH - INIT_BLOCK_W) / 2,
      width: INIT_BLOCK_W,
      color: colorAt(0),
    };
    blocksRef.current = [base];
    scoreRef.current = 0;
    speedRef.current = BASE_SPEED;
    milestonesHitRef.current = new Set();
    wRef.current = INIT_BLOCK_W;
    dirRef.current = 1;
    posRef.current = GAME_LEFT;
    setBlocks([base]);
    setScore(0);
    setIsNewBest(false);
    setMovingW(INIT_BLOCK_W);
    setMovingX(GAME_LEFT);
    setCutoff(null);
    gsRef.current = "playing";
    setGameState("playing");
    camTargetRef.current = 0;
    camAnim.setValue(0);
    lockRef.current = false;
    startLoop();
  }, [startLoop, camAnim]);

  // ---------- Handle tap ----------
  const handleTap = useCallback(() => {
    if (menuOpenRef.current) return;
    const gs = gsRef.current;
    if (gs === "idle") {
      startGame();
      return;
    }
    if (gs === "over") {
      if (lockRef.current) return;
      startGame();
      return;
    }
    if (gs !== "playing") return;

    const stack = blocksRef.current;
    const top = stack[stack.length - 1];
    const dropX = posRef.current;
    const dropW = wRef.current;
    const overlapLeft = Math.max(top.x, dropX);
    const overlapRight = Math.min(top.x + top.width, dropX + dropW);
    const overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth <= 0) {
      stopLoop();
      gsRef.current = "over";
      setGameState("over");
      const finalScore = scoreRef.current;
      const wasNewBest = finalScore > bestRef.current;
      if (wasNewBest) {
        bestRef.current = finalScore;
        setBestScore(finalScore);
        AsyncStorage.setItem(KEY_BEST, String(finalScore)).catch(() => {});
        if (deviceIdRef.current) {
          updateDoc(doc(db, "users", deviceIdRef.current), {
            bestScore: finalScore,
          }).catch((e) => console.warn("Leaderboard update failed:", e));
        }
      }
      setIsNewBest(wasNewBest);
      lockRef.current = true;
      setTimeout(() => {
        lockRef.current = false;
      }, 700);
      return;
    }

    const isPerfect = Math.abs(overlapWidth - top.width) < PERFECT_THRESHOLD;
    let newBlock;
    if (isPerfect) {
      newBlock = { x: top.x, width: top.width, color: colorAt(stack.length) };
      wRef.current = top.width;
      setMovingW(top.width);
      setCutoff(null);
      const bColor = colorAt(stack.length);
      const bY = GAME_BASE_Y - (stack.length + 1) * BLOCK_H;
      setPerfectColor(bColor);
      setPerfectBlockPos({ x: top.x, y: bY, w: top.width });
      triggerPerfectEffect();
      playSfx(perfectPlayer);
    } else {
      newBlock = {
        x: overlapLeft,
        width: overlapWidth,
        color: colorAt(stack.length),
      };
      wRef.current = overlapWidth;
      setMovingW(overlapWidth);
      playSfx(stackPlayer);
      const cutX = dropX < top.x ? dropX : overlapRight;
      const cutW = dropW - overlapWidth;
      if (cutW > 1) {
        setCutoff({ x: cutX, width: cutW, index: stack.length });
        cutFall.setValue(0);
        cutFade.setValue(1);
        Animated.parallel([
          Animated.timing(cutFall, {
            toValue: 250,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(cutFade, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start(() => setCutoff(null));
      }
    }

    const updated = [...stack, newBlock];
    blocksRef.current = updated;
    setBlocks(updated);
    const newScore = scoreRef.current + 1;
    scoreRef.current = newScore;
    setScore(newScore);
    speedRef.current = Math.min(MAX_SPEED, BASE_SPEED + newScore * SPEED_INC);

    // Award coins
    let earned = 0;
    if (isPerfect) earned += PERFECT_COIN_REWARD;
    for (const m of COIN_MILESTONES) {
      if (newScore >= m.score && !milestonesHitRef.current.has(m.score)) {
        milestonesHitRef.current.add(m.score);
        earned += m.coins;
      }
    }
    if (earned > 0) {
      const newCoins = coinsRef.current + earned;
      coinsRef.current = newCoins;
      setCoins(newCoins);
      AsyncStorage.setItem(KEY_COINS, String(newCoins)).catch(() => {});
      // Animate "+N" coin popup
      setCoinEarned(earned);
      coinPopAnim.setValue(0);
      coinPopOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(coinPopAnim, {
          toValue: -30,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(coinPopOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
    const newStackTop = GAME_BASE_Y - updated.length * BLOCK_H;
    const newMovingY = newStackTop - BLOCK_H - HOVER_GAP;
    animateCamera(Math.max(0, MIN_MOVING_Y - newMovingY));
    dirRef.current = newScore % 2 === 0 ? 1 : -1;
    posRef.current =
      dirRef.current === 1 ? GAME_LEFT : GAME_LEFT + GAME_WIDTH - wRef.current;
  }, [
    startGame,
    stopLoop,
    cutFall,
    cutFade,
    animateCamera,
    triggerPerfectEffect,
    playSfx,
  ]);

  // ---------- Render helpers ----------
  const stackTopNatural = GAME_BASE_Y - blocks.length * BLOCK_H;
  const movingYNatural = stackTopNatural - BLOCK_H - HOVER_GAP;
  const camTarget = camTargetRef.current;
  const blockY = (i) => GAME_BASE_Y - (i + 1) * BLOCK_H;
  const cutoffY = cutoff ? blockY(cutoff.index) : 0;
  const designStyle = (color) => getBlockDesignStyle(activeDesign, color);

  // ---------- Render ----------
  return (
    <SafeAreaProvider>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={["top"]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* Background decoration layer — always visible */}
      <BackgroundDecor bgKey={activeBg} theme={theme} />

      {/* Loading screen */}
      {appScreen === "loading" && (
        <View style={[styles.overlay, { backgroundColor: theme.bg }]}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      )}

      {/* Start screen (nickname entry) */}
      {appScreen === "login" && (
        <StartScreen
          theme={theme}
          onSubmitNickname={handleNicknameSubmit}
        />
      )}

      {/* Game screen */}
      {appScreen === "game" && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPressIn={handleTap}>
            {/* Shake wrapper + Camera container */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transform: [{ translateX: shakeX }, { translateY: shakeY }] },
              ]}
            >
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { transform: [{ translateY: camAnim }] },
                ]}
              >
                <View
                  style={[
                    styles.baseLine,
                    {
                      left: GAME_LEFT,
                      top: GAME_BASE_Y,
                      width: GAME_WIDTH,
                      backgroundColor: theme.base,
                    },
                  ]}
                />

                {/* Stacked blocks */}
                {blocks.map((b, i) => {
                  const y = blockY(i);
                  if (y + camTarget < -BLOCK_H || y + camTarget > SCREEN.height)
                    return null;
                  const ds = designStyle(b.color);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.block,
                        {
                          left: b.x,
                          top: y,
                          width: b.width,
                          height: BLOCK_H - 2,
                          backgroundColor: b.color,
                        },
                        ds.style,
                      ]}
                    >
                      {ds.child}
                    </View>
                  );
                })}

                {/* Cutoff */}
                {cutoff &&
                  (() => {
                    const cc = colorAt(cutoff.index);
                    const ds = designStyle(cc);
                    return (
                      <Animated.View
                        style={[
                          styles.block,
                          {
                            left: cutoff.x,
                            top: cutoffY,
                            width: cutoff.width,
                            height: BLOCK_H - 2,
                            backgroundColor: cc,
                            opacity: cutFade,
                            transform: [{ translateY: cutFall }],
                          },
                          ds.style,
                        ]}
                      >
                        {ds.child}
                      </Animated.View>
                    );
                  })()}

                {/* Moving block */}
                {gameState === "playing" &&
                  (() => {
                    const mc = colorAt(blocks.length);
                    const ds = designStyle(mc);
                    return (
                      <View
                        style={[
                          styles.block,
                          styles.movingGlow,
                          {
                            left: movingX,
                            top: movingYNatural,
                            width: movingW,
                            height: BLOCK_H - 2,
                            backgroundColor: mc,
                            shadowColor: mc,
                          },
                          ds.style,
                        ]}
                      >
                        {ds.child}
                      </View>
                    );
                  })()}

                {/* ---- Block-localized sparkle particles ---- */}
                {sparkles.map((sp, i) => {
                  const dx = Math.cos(sp.angle) * sp.dist;
                  const dy = Math.sin(sp.angle) * sp.dist;
                  return (
                    <Animated.View
                      key={`sparkle-${i}`}
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: perfectBlockPos.y + BLOCK_H / 2 - 3,
                        left: perfectBlockPos.x + perfectBlockPos.w / 2 - 3,
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: perfectColor,
                        opacity: sp.anim.interpolate({
                          inputRange: [0, 0.3, 1],
                          outputRange: [0, 1, 0],
                        }),
                        transform: [
                          {
                            translateX: sp.anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, dx],
                            }),
                          },
                          {
                            translateY: sp.anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, dy],
                            }),
                          },
                          {
                            scale: sp.anim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: [0.5, 1.3, 0.3],
                            }),
                          },
                        ],
                      }}
                    />
                  );
                })}
              </Animated.View>
            </Animated.View>

            {/* Score */}
            {gameState === "playing" && (
              <View style={styles.scoreWrap}>
                <Animated.Text
                  style={[
                    styles.scoreTxt,
                    {
                      color: theme.text,
                      opacity: 0.9,
                      transform: [{ scale: perfectScale }],
                    },
                  ]}
                >
                  {score}
                </Animated.Text>
              </View>
            )}

            {/* ---- Animated PERFECT text ---- */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.perfectWrap,
                {
                  opacity: perfectTextOpacity,
                  transform: [{ scale: perfectTextScale }],
                },
              ]}
            >
              <Text
                style={[
                  styles.perfectTxt,
                  {
                    color: perfectColor,
                    textShadowColor: perfectColor,
                    textShadowRadius: 12,
                  },
                ]}
              >
                PERFECT!
              </Text>
            </Animated.View>

            {/* Start screen (in-game idle) */}
            {gameState === "idle" && (
              <View
                style={[styles.overlay, { backgroundColor: theme.overlay }]}
              >
                <Text style={[styles.logo, { color: theme.text }]}>
                  {"PERFECT\nSTACK"}
                </Text>
                {nickname && (
                  <Text
                    style={[
                      styles.tagline,
                      { color: theme.accent, marginBottom: 0 },
                    ]}
                  >
                    Hi, {nickname}!
                  </Text>
                )}
                <Text style={[styles.tagline, { color: theme.textSub }]}>
                  Drop blocks & stack them perfectly
                </Text>
                <View
                  style={[styles.ctaBorder, { borderColor: theme.textMuted }]}
                >
                  <Text
                    style={[styles.ctaTxt, { color: theme.text, opacity: 0.7 }]}
                  >
                    TAP TO START
                  </Text>
                </View>
                {bestScore > 0 && (
                  <Text style={[styles.bestSmall, { color: theme.textMuted }]}>
                    Best: {bestScore}
                  </Text>
                )}
              </View>
            )}

            {/* Game over */}
            {gameState === "over" && (
              <View
                style={[styles.overlay, { backgroundColor: theme.overlay }]}
              >
                <Text style={[styles.goTitle, { color: theme.accent }]}>
                  GAME OVER
                </Text>
                <Text style={[styles.goBigScore, { color: theme.text }]}>
                  {score}
                </Text>
                <Text style={[styles.goLabel, { color: theme.textMuted }]}>
                  SCORE
                </Text>
                {isNewBest && <Text style={styles.newBestTxt}>NEW BEST!</Text>}
                <Text style={[styles.bestSmall, { color: theme.textMuted }]}>
                  Best: {Math.max(bestScore, score)}
                </Text>
                <View
                  style={[
                    styles.ctaBorder,
                    { marginTop: 36, borderColor: theme.textMuted },
                  ]}
                >
                  <Text
                    style={[styles.ctaTxt, { color: theme.text, opacity: 0.7 }]}
                  >
                    TAP TO RETRY
                  </Text>
                </View>
              </View>
            )}

            <Confetti active={isNewBest && gameState === "over"} />
          </Pressable>

          {/* Leaderboard — always visible, does not block taps */}
          <LeaderboardOverlay
            entries={leaderboard}
            theme={theme}
            currentUid={deviceId}
          />

          {/* Hamburger menu button */}
          <Pressable
            onPress={openMenu}
            hitSlop={8}
            style={[
              styles.menuBtn,
              { opacity: gameState === "playing" && !menuOpen ? 0.4 : 1 },
            ]}
          >
            <View style={styles.hamburger}>
              <View
                style={[styles.hamburgerLine, { backgroundColor: theme.text }]}
              />
              <View
                style={[styles.hamburgerLine, { backgroundColor: theme.text }]}
              />
              <View
                style={[styles.hamburgerLine, { backgroundColor: theme.text }]}
              />
            </View>
          </Pressable>

          {/* Coin balance */}
          <View
            style={{
              position: "absolute",
              top: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 48 : 90,
              left: 12,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.35)",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 14,
            }}
          >
            <Text style={{ fontSize: 16, marginRight: 4 }}>🪙</Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#FFD700",
              }}
            >
              {coins}
            </Text>
            {coinEarned > 0 && (
              <Animated.Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: "#66BB6A",
                  marginLeft: 6,
                  opacity: coinPopOpacity,
                  transform: [{ translateY: coinPopAnim }],
                }}
              >
                +{coinEarned}
              </Animated.Text>
            )}
          </View>

          {/* Settings */}
          {menuOpen && (
            <SettingsOverlay
              theme={theme}
              activeThemeKey={activeTheme}
              activeDesignKey={activeDesign}
              activeBgKey={activeBg}
              purchases={purchases}
              musicMuted={musicMuted}
              onSelectTheme={handleSelectTheme}
              onSelectDesign={handleSelectDesign}
              onSelectBg={handleSelectBg}
              onPurchase={handlePurchase}
              onToggleMusic={handleToggleMusic}
              onClose={closeMenu}
              onReset={handleReset}
              onSignOut={handleSignOut}
              onExit={handleExit}
              coins={coins}
            />
          )}
        </>
      )}
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  baseLine: { position: "absolute", height: 3, borderRadius: 2 },
  block: { position: "absolute", borderRadius: 3 },
  movingGlow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },

  scoreWrap: {
    position: "absolute",
    top: Platform.OS === "android" ? 16 : 54,
    width: "100%",
    alignItems: "center",
  },
  scoreTxt: { fontSize: 54, fontWeight: "800", letterSpacing: 2 },

  perfectWrap: {
    position: "absolute",
    top: Platform.OS === "android" ? 78 : 116,
    width: "100%",
    alignItems: "center",
  },
  perfectTxt: { fontSize: 28, fontWeight: "700", letterSpacing: 4 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },

  logo: {
    fontSize: 58,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 66,
    letterSpacing: 8,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 22,
  },
  ctaBorder: {
    borderWidth: 1.5,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 36,
  },
  ctaTxt: { fontSize: 16, fontWeight: "700", letterSpacing: 4 },
  bestSmall: { fontSize: 15, marginTop: 24 },

  goTitle: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 4,
    marginBottom: 20,
  },
  goBigScore: { fontSize: 76, fontWeight: "900", lineHeight: 84 },
  goLabel: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 6,
    marginBottom: 12,
  },
  newBestTxt: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFC107",
    letterSpacing: 3,
    marginBottom: 4,
  },

  menuBtn: {
    position: "absolute",
    top: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 52,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  hamburger: { width: 22, height: 16, justifyContent: "space-between" },
  hamburgerLine: { width: "100%", height: 2.5, borderRadius: 1.5 },

  // Settings
  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingLeft: 60,
    paddingRight: 24,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 52,
    paddingBottom: 12,
  },
  settingsTitle: { fontSize: 28, fontWeight: "800", letterSpacing: 2 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnTxt: { fontSize: 24, fontWeight: "300" },
  settingsScroll: { flex: 1, width: "100%" },
  settingsContent: { paddingHorizontal: 24, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 4,
    marginBottom: 16,
    marginTop: 8,
  },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },

  themeCard: { alignItems: "center", width: 72 },
  themeSwatch: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  themeLabel: { fontSize: 12, fontWeight: "600" },

  designCard: {
    alignItems: "center",
    justifyContent: "center",
    width: (SCREEN.width - 48 - 32) / 3,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  designLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  lockIcon: { fontSize: 16, marginTop: 4 },

  bgCard: {
    alignItems: "center",
    justifyContent: "center",
    width: 100,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
  },
  bgPreview: {
    width: 80,
    height: 50,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },

  purchaseBox: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
  },
  purchaseTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  purchaseDesc: { fontSize: 13, marginBottom: 18 },
  purchaseBtns: { flexDirection: "row", gap: 12 },
  purchaseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  purchaseBtnTxt: { fontSize: 14, fontWeight: "700" },

  exitBtn: {
    marginTop: 36,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 40,
  },
  exitBtnTxt: { fontSize: 16, fontWeight: "700", letterSpacing: 2 },

  // Music toggle
  musicRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  musicLabel: { fontSize: 16, fontWeight: "700" },
  musicToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 3,
    justifyContent: "center",
  },
  musicKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  musicStatus: { fontSize: 13, fontWeight: "600" },

  // Auth screens
  authBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
    alignItems: "center",
    width: "80%",
    maxWidth: 300,
  },
  authBtnTxt: { fontSize: 16, fontWeight: "700", letterSpacing: 1 },
  authBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  authLogo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  devCredit: {
    position: "absolute",
    bottom: 40,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
  },

  // Nickname screen
  nicknameInput: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "80%",
    maxWidth: 300,
    marginTop: 24,
  },

  // Leaderboard
  leaderboardContainer: {
    position: "absolute",
    top: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 8 : 50,
    right: 8,
    zIndex: 50,
  },
  leaderboardBox: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    opacity: 0.75,
    minWidth: 130,
  },
  leaderboardTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 4,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 1.5,
  },
  leaderboardRank: { fontSize: 10, fontWeight: "700", width: 18 },
  leaderboardName: { fontSize: 10, fontWeight: "600", flex: 1, marginRight: 6 },
  leaderboardScore: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "right",
    minWidth: 24,
  },
});
