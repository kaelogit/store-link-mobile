/**
 * 🏰 NATIVE COLOR SCHEME HANDSHAKE v2.0
 * Pure Build: Direct OS bridge, zero web-boilerplate.
 */
import { useColorScheme as _useColorScheme } from 'react-native';

export function useColorScheme() {
  // Directly returns 'light' | 'dark' from the iOS/Android system
  return _useColorScheme();
}