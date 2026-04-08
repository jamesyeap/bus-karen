import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Alert,
  Switch,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

const MAX_HISTORY_POINTS = 100;
const RECENT_WINDOW_MS = 5000;

type DataPoint = {
  x: number;
  y: number;
  z: number;
  timestamp: string;
  lat: number | null;
  lng: number | null;
};

type RunningStats = {
  sumMagSq: number;
  count: number;
  peak: number;
  sumJerkSq: number;
  jerkCount: number;
  joltCount: number;
  jerkSum: number;
  aboveComfortCount: number;
  lastMagnitude: number | null;
};

function createRunningStats(): RunningStats {
  return {
    sumMagSq: 0,
    count: 0,
    peak: 0,
    sumJerkSq: 0,
    jerkCount: 0,
    joltCount: 0,
    jerkSum: 0,
    aboveComfortCount: 0,
    lastMagnitude: null,
  };
}

function pushToRunningStats(stats: RunningStats, point: DataPoint): RunningStats {
  const mag = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
  const comfortThreshold = 0.5;

  const next: RunningStats = {
    sumMagSq: stats.sumMagSq + mag * mag,
    count: stats.count + 1,
    peak: Math.max(stats.peak, mag),
    sumJerkSq: stats.sumJerkSq,
    jerkCount: stats.jerkCount,
    joltCount: stats.joltCount,
    jerkSum: stats.jerkSum,
    aboveComfortCount: stats.aboveComfortCount + (mag > comfortThreshold ? 1 : 0),
    lastMagnitude: mag,
  };

  if (stats.lastMagnitude !== null) {
    const jerk = Math.abs(mag - stats.lastMagnitude);
    next.sumJerkSq = stats.sumJerkSq + jerk * jerk;
    next.jerkCount = stats.jerkCount + 1;
    next.jerkSum = stats.jerkSum + jerk;

    const meanJerk = next.jerkSum / next.jerkCount;
    const joltThreshold = Math.max(meanJerk * 2, 0.5);
    if (jerk > joltThreshold) {
      next.joltCount = stats.joltCount + 1;
    }
  }

  return next;
}

function scoreFromStats(stats: RunningStats) {
  if (stats.count < 2) return null;

  const rms = Math.sqrt(stats.sumMagSq / stats.count);
  const jerkRms = stats.jerkCount > 0
    ? Math.sqrt(stats.sumJerkSq / stats.jerkCount)
    : 0;
  const vibrationRatio = stats.aboveComfortCount / stats.count;

  const rawScore = 100
    - rms * 10
    - stats.peak * 3
    - jerkRms * 8
    - stats.joltCount * 2;
  const smoothnessScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    rms,
    peak: stats.peak,
    jerkRms,
    joltCount: stats.joltCount,
    vibrationRatio,
    smoothnessScore,
  };
}

export default function App() {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [history, setHistory] = useState<DataPoint[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [graphExpanded, setGraphExpanded] = useState(false);
  const [liveViewExpanded, setLiveViewExpanded] = useState(false);
  const isNarrow = Dimensions.get('window').width < 500;
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationAvailable, setLocationAvailable] = useState(false);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [overallStats, setOverallStats] = useState<RunningStats>(createRunningStats());
  const overallStatsRef = useRef<RunningStats>(createRunningStats());
  const noDataTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receivedMotionDataRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (window.DeviceMotionEvent) {
        setAvailable(true);
      } else {
        setAvailable(false);
      }
      if (navigator.geolocation) {
        setLocationAvailable(true);
      }
    } else {
      setAvailable(false);
    }
  }, []);

  useEffect(() => {
    if (!locationEnabled || !locationAvailable) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      locationRef.current = null;
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        locationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      () => {
        locationRef.current = null;
      },
      { enableHighAccuracy: true, maximumAge: 2000 },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [locationEnabled, locationAvailable]);

  useEffect(() => {
    if (!isActive || Platform.OS !== 'web') return;

    receivedMotionDataRef.current = false;

    noDataTimerRef.current = setTimeout(() => {
      if (!receivedMotionDataRef.current) {
        setAvailable(false);
      }
    }, 2000);

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.acceleration;
      if (acc && (acc.x !== null || acc.y !== null || acc.z !== null)) {
        receivedMotionDataRef.current = true;
        const x = acc.x || 0;
        const y = acc.y || 0;
        const z = acc.z || 0;
        setData({ x, y, z });
        const loc = locationRef.current;
        const point: DataPoint = {
          x,
          y,
          z,
          timestamp: new Date().toISOString(),
          lat: loc ? loc.lat : null,
          lng: loc ? loc.lng : null,
        };
        setHistory((prev) => {
          const next = [...prev, point];
          return next.slice(-MAX_HISTORY_POINTS);
        });
        overallStatsRef.current = pushToRunningStats(overallStatsRef.current, point);
        setOverallStats(overallStatsRef.current);
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
      if (noDataTimerRef.current) {
        clearTimeout(noDataTimerRef.current);
        noDataTimerRef.current = null;
      }
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
    
    setIsActive((prev) => !prev);
  };

  const exportCsv = () => {
    if (history.length === 0) return;
    const hasLocation = history.some((h) => h.lat !== null);
    const header = hasLocation ? 'index,timestamp,x,y,z,lat,lng' : 'index,timestamp,x,y,z';
    const rows = history.map((h, i) =>
      hasLocation
        ? `${i},${h.timestamp},${h.x},${h.y},${h.z},${h.lat ?? ''},${h.lng ?? ''}`
        : `${i},${h.timestamp},${h.x},${h.y},${h.z}`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accelerometer_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const restart = () => {
    Alert.alert(
      'Restart Recording',
      'This will clear all recorded data and the graph. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & Restart',
          style: 'destructive',
          onPress: () => {
            setHistory([]);
            setData({ x: 0, y: 0, z: 0 });
            setGraphExpanded(false);
            overallStatsRef.current = createRunningStats();
            setOverallStats(createRunningStats());
            setIsActive(true);
          },
        },
      ],
    );
  };

  const liveAnalysis = useMemo(() => {
    if (!isActive || history.length < 2) return null;
    const now = Date.now();
    const recentPoints = history.filter(
      (h) => now - new Date(h.timestamp).getTime() <= RECENT_WINDOW_MS,
    );
    return recentPoints.length >= 2 ? analyzeRide(recentPoints) : analyzeRide(history);
  }, [history, isActive]);

  const overallAnalysis = useMemo(
    () => scoreFromStats(overallStats),
    [overallStats],
  );

  if (available === false) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorPage}>
          <Text style={styles.errorPageEmoji}>📵</Text>
          <Text style={styles.errorPageTitle}>Accelerometer Not Available</Text>
          <Text style={styles.errorPageText}>
            {Platform.OS === 'web'
              ? 'No accelerometer was detected on this device. This app requires a motion sensor to measure ride quality. Please open this page on a phone or tablet with an accelerometer.'
              : 'Native sensor support is currently disabled. Open this app on the Web to use the native Web API.'}
          </Text>
          <StatusBar style="auto" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Buskaren</Text>
            <Text style={styles.subtitle}>Real-time Accelerometer Data</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {isActive ? 'Current Ride Score' : 'Overall Ride Score'}
            </Text>

            {isActive && liveAnalysis ? (
              <View style={styles.liveScoreContainer}>
                <Text style={[styles.liveScoreValue, { color: getScoreColor(liveAnalysis.smoothnessScore) }]}>
                  {liveAnalysis.smoothnessScore}
                </Text>
                <Text style={[styles.liveScoreLabel, { color: getScoreColor(liveAnalysis.smoothnessScore) }]}>
                  {getScoreLabel(liveAnalysis.smoothnessScore)}
                </Text>
                <Text style={styles.liveScoreSubtitle}>
                  Based on the last {RECENT_WINDOW_MS / 1000}s
                </Text>
              </View>
            ) : !isActive && overallAnalysis ? (
              <View style={styles.liveScoreContainer}>
                <Text style={[styles.liveScoreValue, { color: getScoreColor(overallAnalysis.smoothnessScore) }]}>
                  {overallAnalysis.smoothnessScore}
                </Text>
                <Text style={[styles.liveScoreLabel, { color: getScoreColor(overallAnalysis.smoothnessScore) }]}>
                  {getScoreLabel(overallAnalysis.smoothnessScore)}
                </Text>
                <Text style={styles.liveScoreSubtitle}>
                  Overall score across {overallStats.count} samples
                </Text>
              </View>
            ) : (
              <View style={styles.liveScoreContainer}>
                <Text style={styles.liveScorePlaceholder}>—</Text>
                <Text style={styles.liveScoreSubtitle}>
                  {isActive ? 'Collecting data…' : 'Start recording to see your ride score'}
                </Text>
              </View>
            )}

            {locationAvailable && (
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>📍 Record Location</Text>
                  <Text style={styles.toggleDescription}>
                    Include GPS coordinates with each data point
                  </Text>
                </View>
                <Switch
                  value={locationEnabled}
                  onValueChange={setLocationEnabled}
                  trackColor={{ false: '#e0e0e0', true: '#34c759' }}
                  thumbColor="#fff"
                />
              </View>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={[styles.buttonRow, isNarrow && styles.buttonRowVertical]}>
              <TouchableOpacity
                style={[styles.button, styles.buttonFlex, isActive && styles.activeButton]}
                onPress={toggle}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonText}>
                  {isActive ? 'Stop Recording' : 'Start Recording'}
                </Text>
              </TouchableOpacity>

              {history.length > 0 && (
                <TouchableOpacity
                  style={[styles.button, styles.buttonFlex, styles.restartButton]}
                  onPress={restart}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buttonText}>Restart</Text>
                </TouchableOpacity>
              )}

              {history.length > 0 && (
                <TouchableOpacity
                  style={[styles.button, styles.buttonFlex, styles.exportButton]}
                  onPress={exportCsv}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buttonText}>Export CSV</Text>
                </TouchableOpacity>
              )}
            </View>

            {!isActive && overallAnalysis && (
              <RideAnalysis analysis={overallAnalysis} sampleCount={overallStats.count} />
            )}
          </View>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.expandableHeader}
              onPress={() => setLiveViewExpanded((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>Live View</Text>
              <Text style={styles.expandArrow}>{liveViewExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {liveViewExpanded && (
              <View style={styles.liveViewContent}>
                <View style={styles.axisContainer}>
                  <AxisRow label="X" value={data.x} color="#ff3b30" />
                  <AxisRow label="Y" value={data.y} color="#34c759" />
                  <AxisRow label="Z" value={data.z} color="#007aff" />
                </View>
              </View>
            )}
          </View>

          {history.length > 0 && (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.expandableHeader}
                onPress={() => setGraphExpanded((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Text style={styles.cardTitle}>Activity Graph</Text>
                <Text style={styles.expandArrow}>{graphExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {graphExpanded && <AccelerometerGraph history={history} />}
            </View>
          )}

          <StatusBar style="auto" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccelerometerGraph({ history }: { history: DataPoint[] }) {
  const width = Dimensions.get('window').width > 800 ? 752 : Dimensions.get('window').width - 80;
  const height = 200;
  const padding = 10;
  
  const { minVal, maxVal } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const h of history) {
      if (h.x < min) min = h.x;
      if (h.y < min) min = h.y;
      if (h.z < min) min = h.z;
      if (h.x > max) max = h.x;
      if (h.y > max) max = h.y;
      if (h.z > max) max = h.z;
    }
    if (!isFinite(min)) min = -5;
    if (!isFinite(max)) max = 5;
    if (min === max) { min -= 1; max += 1; }
    const margin = (max - min) * 0.1;
    return { minVal: min - margin, maxVal: max + margin };
  }, [history]);

  const scale = (val: number) => {
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

function analyzeRide(history: DataPoint[]) {
  const magnitudes = history.map((h) => Math.sqrt(h.x ** 2 + h.y ** 2 + h.z ** 2));

  // RMS acceleration — overall vibration intensity
  const rms = Math.sqrt(magnitudes.reduce((sum, m) => sum + m * m, 0) / magnitudes.length);

  // Peak acceleration
  const peak = Math.max(...magnitudes);

  // Jerk: rate of change of acceleration between consecutive samples
  const jerks: number[] = [];
  for (let i = 1; i < magnitudes.length; i++) {
    jerks.push(Math.abs(magnitudes[i] - magnitudes[i - 1]));
  }
  const jerkRms = jerks.length > 0
    ? Math.sqrt(jerks.reduce((sum, j) => sum + j * j, 0) / jerks.length)
    : 0;

  // Jolt count: jerk spikes exceeding 2× the mean jerk
  const meanJerk = jerks.length > 0 ? jerks.reduce((a, b) => a + b, 0) / jerks.length : 0;
  const joltThreshold = Math.max(meanJerk * 2, 0.5);
  const joltCount = jerks.filter((j) => j > joltThreshold).length;

  // Vibration ratio: % of samples above a "comfortable" threshold (0.5 m/s²)
  const comfortThreshold = 0.5;
  const vibrationRatio = magnitudes.filter((m) => m > comfortThreshold).length / magnitudes.length;

  // Smoothness score (0–100): penalize high RMS, peak, jerk, and jolts
  // Tuned so a perfectly still phone ≈ 100 and a very rough ride ≈ 0
  const rawScore = 100
    - rms * 10        // penalize sustained vibration
    - peak * 3        // penalize worst moment
    - jerkRms * 8     // penalize abrupt changes
    - joltCount * 2;  // penalize number of jolts
  const smoothnessScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  return { rms, peak, jerkRms, joltCount, vibrationRatio, smoothnessScore };
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#34c759';
  if (score >= 60) return '#ff9500';
  if (score >= 40) return '#ff6b00';
  return '#ff3b30';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Smooth';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Rough';
  return 'Very Rough';
}

function RideAnalysis({ analysis, sampleCount }: { analysis: NonNullable<ReturnType<typeof scoreFromStats>>; sampleCount: number }) {
  const scoreColor = getScoreColor(analysis.smoothnessScore);

  return (
    <View style={styles.analysisContainer}>
      <Text style={styles.graphTitle}>Overall Ride Analysis</Text>

      <View style={styles.scoreCard}>
        <Text style={[styles.scoreValue, { color: scoreColor }]}>
          {analysis.smoothnessScore}
        </Text>
        <Text style={[styles.scoreLabel, { color: scoreColor }]}>
          {getScoreLabel(analysis.smoothnessScore)}
        </Text>
        <Text style={styles.scoreSubtitle}>Overall Smoothness Score (0–100) · {sampleCount} samples</Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricRow
          label="RMS Acceleration"
          value={`${analysis.rms.toFixed(3)} m/s²`}
          description="Overall vibration intensity"
        />
        <MetricRow
          label="Peak Acceleration"
          value={`${analysis.peak.toFixed(3)} m/s²`}
          description="Worst single-moment force"
        />
        <MetricRow
          label="Jerk (RMS)"
          value={`${analysis.jerkRms.toFixed(3)} m/s³`}
          description="How abrupt movements are"
        />
        <MetricRow
          label="Jolt Count"
          value={`${analysis.joltCount}`}
          description="Sudden acceleration spikes"
        />
        <MetricRow
          label="Vibration Ratio"
          value={`${(analysis.vibrationRatio * 100).toFixed(1)}%`}
          description="Time above comfort threshold"
        />
      </View>
    </View>
  );
}

function MetricRow({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricInfo}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricDescription}>{description}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
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
  liveScoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
  },
  liveScoreValue: {
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 80,
  },
  liveScoreLabel: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  liveScoreSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  liveScorePlaceholder: {
    fontSize: 72,
    fontWeight: '800',
    color: '#ddd',
    lineHeight: 80,
  },
  liveViewContent: {
    marginTop: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  buttonRowVertical: {
    flexDirection: 'column',
  },
  button: {
    backgroundColor: '#007aff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonFlex: {
    flex: 1,
  },
  activeButton: {
    backgroundColor: '#ff3b30',
  },
  restartButton: {
    backgroundColor: '#ff9500',
  },
  exportButton: {
    backgroundColor: '#34c759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
  errorPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorPageEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  errorPageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorPageText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 400,
  },
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandArrow: {
    fontSize: 16,
    color: '#999',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  toggleDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
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
  analysisContainer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 24,
  },
  scoreCard: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingVertical: 24,
    marginBottom: 20,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 72,
  },
  scoreLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  scoreSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
  },
  metricsGrid: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    overflow: 'hidden',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  metricInfo: {
    flex: 1,
    marginRight: 12,
  },
  metricLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  metricDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334e68',
  },
});
