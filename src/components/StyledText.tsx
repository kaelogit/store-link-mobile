import { Text, TextProps } from './Themed';

/**
 * 🏰 MONOSPACE TEXT ENGINE (Pure Build)
 * Used for technical labels, status codes, and version registry tags.
 * Inherits adaptive theme colors while forcing SpaceMono typography.
 */
export function MonoText(props: TextProps) {
  return (
    <Text 
      {...props} 
      style={[
        props.style, 
        { fontFamily: 'SpaceMono' }
      ]} 
    />
  );
}