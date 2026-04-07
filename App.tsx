import { useState, useEffect } from 'react';
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
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [isActive, setIsActive] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Check if the DeviceMotionEvent API is supported by the browser
      if (window.DeviceMotionEvent) {
        setAvailable(true);
      } else {
        setAvailable(false);
      }
    } else {
      // For native, we are no longer using expo-sensors in this implementation
      setAvailable(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive || Platform.OS !== 'web') return;

    const handleMotion = (event: DeviceMotionEvent) => {
      // We use acceleration (excluding gravity) as requested.
      // Note: On some devices, acceleration might be null if gravity cannot be separated.
      // accelerationIncludingGravity is an alternative if this happens.
      const acc = event.acceleration;
      if (acc) {
        setData({
          x: acc.x || 0,
          y: acc.y || 0,
          z: acc.z || 0,
        });
      }
    };

    try {
      window.addEventListener('devicemotion', handleMotion, true);
    } catch (e) {
      setError(`Failed to start accelerometer: ${e instanceof Error ? e.message : String(e)}`);
      setIsActive(false);
      return;
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion, true);
    };
  }, [isActive]);

  const toggle = async () => {
    setError(null);
    
    if (!isActive && Platform.OS === 'web') {
      // Safari on iOS requires explicit user permission via DeviceMotionEvent.requestPermission()
      const DeviceMotion = (window as any).DeviceMotionEvent;
      if (DeviceMotion && typeof DeviceMotion.requestPermission === 'function') {
        try {
          const status = await DeviceMotion.requestPermission();
          if (status !== 'granted') {
            setError('Permission to access motion sensors was denied. Please allow access in your browser settings.');
            return;
          }
        } catch (e) {
          setError(`Failed to request motion sensor permission: ${e instanceof Error ? e.message : String(e)}`);
          console.error(e);
          return;
        }
      }
    }
    
    setIsActive((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Buskaren</Text>
            <Text style={styles.subtitle}>Real-time Accelerometer Data</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Accelerometer</Text>

            {available === false ? (
              <View style={styles.unavailableBanner}>
                <Text style={styles.unavailableEmoji}>📵</Text>
                <Text style={styles.unavailableTitle}>Accelerometer Not Available</Text>
                <Text style={styles.unavailableText}>
                  {Platform.OS === 'web' 
                    ? 'This browser does not support the Device Motion API. Please try a mobile browser on a phone or tablet.'
                    : 'Native sensor support is currently disabled. Open this on the Web to use the native Web API.'}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.cardDescription}>
                  Running on {Platform.OS === 'web' ? 'the Web' : 'Mobile'}.
                </Text>

                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.axisContainer}>
                  <AxisRow label="X" value={data.x} color="#ff3b30" />
                  <AxisRow label="Y" value={data.y} color="#34c759" />
                  <AxisRow label="Z" value={data.z} color="#007aff" />
                </View>

                <TouchableOpacity
                  style={[styles.button, isActive && styles.activeButton]}
                  onPress={toggle}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buttonText}>
                    {isActive ? 'Stop' : 'Start'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <StatusBar style="auto" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AxisRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const barWidth = Math.min(Math.abs(value) * 100, 100);

  return (
    <View style={styles.axisRow}>
      <Text style={[styles.axisLabel, { color }]}>{label}</Text>
      <View style={styles.barBackground}>
        <View style={[styles.bar, { width: `${barWidth}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.axisValue}>{value.toFixed(3)}</Text>
    </View>
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
    maxWidth: Platform.OS === 'web' ? 800 : undefined,
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
  axisContainer: {
    marginBottom: 20,
  },
  axisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  axisLabel: {
    fontSize: 20,
    fontWeight: '800',
    width: 28,
  },
  barBackground: {
    flex: 1,
    height: 24,
    backgroundColor: '#f0f4f8',
    borderRadius: 12,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 12,
    opacity: 0.7,
  },
  axisValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334e68',
    width: 70,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#007aff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  activeButton: {
    backgroundColor: '#ff3b30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  unavailableBanner: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  unavailableEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  unavailableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  unavailableText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBanner: {
    backgroundColor: '#fff3f3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
  },
});
