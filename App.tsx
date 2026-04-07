import { useState, useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

const MAX_HISTORY_POINTS = 100;

export default function App() {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [history, setHistory] = useState<{ x: number; y: number; z: number }[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (window.DeviceMotionEvent) {
        setAvailable(true);
      } else {
        setAvailable(false);
      }
    } else {
      setAvailable(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive || Platform.OS !== 'web') return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.acceleration;
      if (acc) {
        const newData = {
          x: acc.x || 0,
          y: acc.y || 0,
          z: acc.z || 0,
        };
        setData(newData);
        setHistory((prev) => {
          const next = [...prev, newData];
          return next.slice(-MAX_HISTORY_POINTS);
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
    
    if (isActive) {
      setHistory([]);
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
            <Text style={styles.cardTitle}>Live View</Text>

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
                  Recording on {Platform.OS === 'web' ? 'the Web' : 'Mobile'}.
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
                    {isActive ? 'Stop & Reset' : 'Start Recording'}
                  </Text>
                </TouchableOpacity>

                {history.length > 0 && (
                  <View style={styles.graphContainer}>
                    <Text style={styles.graphTitle}>Activity Graph</Text>
                    <AccelerometerGraph history={history} />
                  </View>
                )}
              </>
            )}
          </View>

          <StatusBar style="auto" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccelerometerGraph({ history }: { history: { x: number; y: number; z: number }[] }) {
  const width = Dimensions.get('window').width > 800 ? 752 : Dimensions.get('window').width - 80;
  const height = 200;
  const padding = 10;
  
  // Normalized range: let's assume -10 to 10 m/s^2 for a good visual
  const scale = (val: number) => {
    const minVal = -5;
    const maxVal = 5;
    const normalized = (val - minVal) / (maxVal - minVal);
    return height - (normalized * (height - 2 * padding) + padding);
  };

  const xPoints = useMemo(() => 
    history.map((h, i) => `${(i / (MAX_HISTORY_POINTS - 1)) * width},${scale(h.x)}`).join(' '), 
    [history, width]
  );
  
  const yPoints = useMemo(() => 
    history.map((h, i) => `${(i / (MAX_HISTORY_POINTS - 1)) * width},${scale(h.y)}`).join(' '), 
    [history, width]
  );
  
  const zPoints = useMemo(() => 
    history.map((h, i) => `${(i / (MAX_HISTORY_POINTS - 1)) * width},${scale(h.z)}`).join(' '), 
    [history, width]
  );

  return (
    <View style={styles.graphWrapper}>
      <Svg width={width} height={height}>
        {/* Zero line */}
        <Polyline
          points={`0,${scale(0)} ${width},${scale(0)}`}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth="1"
          strokeDasharray="4"
        />
        {/* Data lines */}
        <Polyline points={xPoints} fill="none" stroke="#ff3b30" strokeWidth="2" />
        <Polyline points={yPoints} fill="none" stroke="#34c759" strokeWidth="2" />
        <Polyline points={zPoints} fill="none" stroke="#007aff" strokeWidth="2" />
      </Svg>
      <View style={styles.legend}>
        <LegendItem label="X" color="#ff3b30" />
        <LegendItem label="Y" color="#34c759" />
        <LegendItem label="Z" color="#007aff" />
      </View>
    </View>
  );
}

function LegendItem({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendColor, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
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
  const barWidth = Math.min(Math.abs(value) * 10, 100);

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
    marginBottom: 24,
  },
  activeButton: {
    backgroundColor: '#ff3b30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  graphContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 24,
  },
  graphTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  graphWrapper: {
    backgroundColor: '#fcfcfc',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendColor: {
    width: 12,
    height: 4,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
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
