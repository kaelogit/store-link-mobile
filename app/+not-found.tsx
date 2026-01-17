import { Link, Stack } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

// 🏛️ Sovereign Components
import { Text, View } from '@/src/components/Themed';
import Colors from '@/src/constants/Colors';

/**
 * 🏰 ROUTE FAIL-SAFE (Pure Build)
 * Handles invalid navigation requests by redirecting users back to the marketplace.
 */
export default function NotFoundScreen() {
  return (
    <>
      {/* Set the header title for the navigation stack */}
      <Stack.Screen options={{ title: 'Page Not Found' }} />
      
      <View style={styles.container}>
        <Text style={styles.title}>The page you're looking for doesn't exist.</Text>

        <Link href="/" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={[styles.linkText, { color: Colors.brand.emerald }]}>
              Go back to Marketplace
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
    padding: 25,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});