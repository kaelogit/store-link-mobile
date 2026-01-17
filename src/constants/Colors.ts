/**
 * 🏰 SOVEREIGN COLOR REGISTRY v3.1 (Pure Build Consolidated)
 * Audited: Optimized for High-Prestige Emerald/Violet vibrancy.
 * Logic: Auto-switches based on OS or User-Mode Handshake.
 */

const charcoal = '#111827';   // High-end Executive Black
const emerald = '#10B981';    // Pure Commercial Success
const violet = '#8B5CF6';     // Diamond Prestige
const pitchBlack = '#000000'; // OLED Optimized Theater

export default {
  light: {
    text: charcoal,           // Soft black for premium readability
    subtext: '#6B7280',       // Muted grey for metadata
    background: '#FFFFFF',    // Pristine gallery white
    tint: charcoal,           // Active tab/icon color
    tabIconDefault: '#9CA3AF',
    tabIconSelected: charcoal,
    surface: '#F9FAFB',       // Subtle grey for input fields/cards
    border: '#E5E7EB',        // Light mode structure
    card: '#FFFFFF',
    notification: '#EF4444',
  },
  dark: {
    text: '#FFFFFF',          // High-contrast white
    subtext: '#9CA3AF',       // Muted grey for dark mode
    background: pitchBlack,   // Deep Theater Black
    tint: emerald,            // Emerald "Pops" in Dark Mode
    tabIconDefault: '#4B5563',
    tabIconSelected: emerald,
    surface: '#111111',       // Industrial Dark for cards/inputs
    border: '#262626',        // Subtle structure for OLED
    card: '#111111',
    notification: '#EF4444',
  },
  // 💎 Brand Constants (Non-Adaptive: Stay the same in both modes)
  brand: {
    emerald: emerald,
    violet: violet,
    gold: '#F59E0B',
    charcoal: charcoal,
    pitchBlack: pitchBlack,
    white: '#FFFFFF',
  }
};