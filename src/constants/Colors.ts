/**
 * 🏰 COLOR PALETTE v4.0
 * Purpose: Centralizes all theme and brand colors for the application.
 * Features: Automatic Light/Dark mode switching and OLED optimization.
 */

const deepGray = '#111827';   // Primary text and interface color
const emerald = '#10B981';    // Used for success, growth, and active states
const violet = '#8B5CF6';     // Used for premium "Diamond" features
const pitchBlack = '#000000'; // Optimized for OLED battery saving

export default {
  light: {
    text: deepGray,            // Professional dark gray for readability
    subtext: '#6B7280',       // Muted gray for captions and dates
    background: '#FFFFFF',    // Clean white background
    tint: deepGray,           // Primary action color
    tabIconDefault: '#9CA3AF',
    tabIconSelected: deepGray,
    surface: '#F9FAFB',       // Subtle off-white for cards and inputs
    border: '#E5E7EB',        // Light border color
    card: '#FFFFFF',
    notification: '#EF4444',  // Alert/Error color
  },
  dark: {
    text: '#FFFFFF',          // High-contrast white for dark mode
    subtext: '#9CA3AF',       // Muted gray for dark mode captions
    background: pitchBlack,   // True black for OLED screens
    tint: emerald,            // Emerald accents for high visibility
    tabIconDefault: '#4B5563',
    tabIconSelected: emerald,
    surface: '#111111',       // Slightly lighter than black for cards
    border: '#262626',        // Dark mode border color
    card: '#111111',
    notification: '#EF4444',
  },
  // 💎 Brand Constants (Do not change between light and dark mode)
  brand: {
    emerald: emerald,
    violet: violet,
    gold: '#F59E0B',          // Used for coin balances and rewards
    charcoal: deepGray,
    pitchBlack: pitchBlack,
    white: '#FFFFFF',
  }
};