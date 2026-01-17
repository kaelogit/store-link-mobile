/**
 * 🏰 THEME MANAGER v2.1 (Pure Build)
 * Logic: Automatically adapts components to Light or Dark mode.
 */

import { Text as DefaultText, View as DefaultView, useColorScheme } from 'react-native';
import Colors from '@/src/constants/Colors';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

/**
 * 🎨 THEME COLOR HOOK
 * Resolves colors based on the current system theme (Light/Dark).
 */
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  // Default to 'dark' for the Vortex aesthetic if theme is undefined
  const theme = useColorScheme() ?? 'dark';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

/**
 * 🖋️ THEMED TEXT
 * Use this instead of DefaultText for automatic light/dark support.
 */
export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <DefaultText 
      style={[{ color, fontFamily: 'System' }, style]} 
      {...otherProps} 
    />
  );
}

/**
 * 🔳 THEMED VIEW
 * Use this instead of DefaultView for automatic light/dark support.
 */
export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return (
    <DefaultView 
      style={[{ backgroundColor }, style]} 
      {...otherProps} 
    />
  );
}