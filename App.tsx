import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ScrollView,
} from 'react-native';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Buskaren</Text>
            <Text style={styles.subtitle}>Welcome to your new React Native Web project</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Interactive Demo</Text>
            <Text style={styles.cardDescription}>
              This app is running on {Platform.OS === 'web' ? 'the Web' : 'Mobile'}.
            </Text>
            
            <View style={styles.counterContainer}>
              <Text style={styles.counterLabel}>Counter Value:</Text>
              <Text style={styles.counterValue}>{count}</Text>
            </View>

            <TouchableOpacity 
              style={styles.button} 
              onPress={() => setCount(count + 1)}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Increment</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={() => setCount(0)}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Reset</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Features</Text>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🚀</Text>
              <Text style={styles.featureText}>Fast Refresh for instant updates</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>💻</Text>
              <Text style={styles.featureText}>Cross-platform UI with React Native</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>📦</Text>
              <Text style={styles.featureText}>Expo SDK for native device capabilities</Text>
            </View>
          </View>

          <StatusBar style="auto" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginTop: 40,
    marginBottom: 32,
    alignItems: Platform.OS === 'web' ? 'flex-start' : 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 16,
    color: '#444',
    marginBottom: 20,
    lineHeight: 22,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f4f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  counterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334e68',
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#007aff',
  },
  button: {
    backgroundColor: '#007aff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007aff',
  },
  secondaryButtonText: {
    color: '#007aff',
  },
  infoSection: {
    paddingHorizontal: 8,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#444',
  },
});
