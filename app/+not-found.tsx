import { Link, Stack } from 'expo-router';
import { StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { MapPinOff } from 'lucide-react-native';

// 🏛️ Sovereign Components
import { Text, View } from '../src/components/Themed';
import Colors from '../src/constants/Colors';
import { useColorScheme } from '../src/components/useColorScheme';

/**
 * 🏰 ROUTE FAIL-SAFE (Pure Build)
 * Handles invalid navigation requests by redirecting users back to the marketplace.
 */
export default function NotFoundScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <MapPinOff size={64} color={theme.subtext} style={{ opacity: 0.5, marginBottom: 20 }} strokeWidth={1.5} />
        
        <Text style={[styles.title, { color: theme.text }]}>This page doesn't exist.</Text>
        <Text style={[styles.sub, { color: theme.subtext }]}>The link you followed may be broken, or the page may have been removed.</Text>

        <Link href="/" asChild>
          <TouchableOpacity style={[styles.link, { backgroundColor: theme.text }]}>
            <Text style={[styles.linkText, { color: theme.background }]}>
              GO TO MARKETPLACE
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    fontWeight: '500',
  },
  link: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});