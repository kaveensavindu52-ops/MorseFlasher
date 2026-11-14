import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

const MORSE_MAP = {
  A: '.-',    B: '-...',  C: '-.-.',  D: '-..',   E: '.',
  F: '..-.',  G: '--.',   H: '....',  I: '..',    J: '.---',
  K: '-.-',   L: '.-..',  M: '--',    N: '-.',    O: '---',
  P: '.--.',  Q: '--.-',  R: '.-.',   S: '...',   T: '-',
  U: '..-',   V: '...-',  W: '.--',   X: '-..-',  Y: '-.--',
  Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
  5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  ' ': '/',
};

const SPEEDS = [
  { label: 'Slow', ms: 350 },
  { label: 'Normal', ms: 200 },
  { label: 'Fast', ms: 100 },
];

// Generates a 700Hz sine-wave WAV Data URI in memory
function createBeepWavUri(freq = 700, durationSec = 1.5, sampleRate = 8000) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples, true);

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * freq * i) / sampleRate);
    view.setUint8(44 + i, Math.round(128 + sample * 110));
  }

  const bytes = new Uint8Array(buffer);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    base64 += chars[b1 >> 2];
    base64 += chars[((b1 & 3) << 4) | (b2 >> 4)];
    base64 += i + 1 < bytes.length ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    base64 += i + 2 < bytes.length ? chars[b3 & 63] : '=';
  }
  return `data:audio/wav;base64,${base64}`;
}

const BEEP_URI = createBeepWavUri();

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [inputText, setInputText] = useState('SOS');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);

  const [unitMs, setUnitMs] = useState(200);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loopEnabled, setLoopEnabled] = useState(false);

  const player = useAudioPlayer({ uri: BEEP_URI });

  const cancelRef = useRef(false);
  const loopRef = useRef(false);
  const soundEnabledRef = useRef(true);
  const unitMsRef = useRef(200);

  useEffect(() => { loopRef.current = loopEnabled; }, [loopEnabled]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { unitMsRef.current = unitMs; }, [unitMs]);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    if (player) {
      player.loop = true;
    }
  }, [player]);

  const setPulseState = (active) => {
    setIsTorchOn(active);
    if (!player) return;
    try {
      if (active && soundEnabledRef.current) {
        player.seekTo(0);
        player.play();
      } else {
        player.pause();
      }
    } catch (e) {
      // Ignore rapid audio state race conditions
    }
  };

  const textToMorse = (text) => {
    return text
      .toUpperCase()
      .split('')
      .map((char) => MORSE_MAP[char] || '')
      .filter(Boolean)
      .join(' ');
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const transmitMorse = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }

    cancelRef.current = false;
    setIsTransmitting(true);

    do {
      const words = inputText.toUpperCase().trim().split(/\s+/);

      for (let w = 0; w < words.length; w++) {
        if (cancelRef.current) break;
        const letters = words[w].split('');

        for (let l = 0; l < letters.length; l++) {
          if (cancelRef.current) break;
          const code = MORSE_MAP[letters[l]];
          if (!code) continue;

          for (let s = 0; s < code.length; s++) {
            if (cancelRef.current) break;
            const symbol = code[s];
            const currentUnit = unitMsRef.current;

            setPulseState(true);
            await sleep(symbol === '.' ? currentUnit : currentUnit * 3);
            setPulseState(false);

            if (s < code.length - 1) {
              await sleep(currentUnit);
            }
          }

          if (l < letters.length - 1 && !cancelRef.current) {
            await sleep(unitMsRef.current * 3);
          }
        }

        if (w < words.length - 1 && !cancelRef.current) {
          await sleep(unitMsRef.current * 7);
        }
      }

      if (loopRef.current && !cancelRef.current) {
        await sleep(unitMsRef.current * 7);
      }
    } while (loopRef.current && !cancelRef.current);

    setPulseState(false);
    setIsTransmitting(false);
  };

  const stopTransmission = () => {
    cancelRef.current = true;
    setPulseState(false);
    setIsTransmitting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {permission?.granted && (
        <CameraView
          style={styles.hiddenCamera}
          facing="back"
          enableTorch={isTorchOn}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <Text style={styles.title}>Morse Flasher Pro</Text>

        {/* Visual Indicator */}
        <View
          style={[
            styles.indicator,
            { backgroundColor: isTorchOn ? '#FFD60A' : '#2C2C2E' },
          ]}
        >
          <Text style={[styles.indicatorText, { color: isTorchOn ? '#000' : '#8E8E93' }]}>
            {isTorchOn ? 'TRANSMITTING SIGNAL' : 'READY'}
          </Text>
        </View>

        {/* Message Input */}
        <TextInput
          style={styles.input}
          placeholder="Enter message (e.g., SOS)"
          placeholderTextColor="#636366"
          value={inputText}
          onChangeText={setInputText}
          editable={!isTransmitting}
          autoCapitalize="characters"
        />

        {/* Morse Preview */}
        <View style={styles.morseBox}>
          <Text style={styles.morseLabel}>Morse Preview:</Text>
          <Text style={styles.morseOutput}>
            {textToMorse(inputText) || '...'}
          </Text>
        </View>

        {/* Speed Selector */}
        <Text style={styles.sectionLabel}>Transmission Speed</Text>
        <View style={styles.speedRow}>
          {SPEEDS.map((speed) => {
            const active = unitMs === speed.ms;
            return (
              <TouchableOpacity
                key={speed.label}
                style={[styles.speedBtn, active && styles.speedBtnActive]}
                onPress={() => setUnitMs(speed.ms)}
              >
                <Text style={[styles.speedBtnText, active && styles.speedBtnTextActive]}>
                  {speed.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Audio & Loop Toggles */}
        <View style={styles.togglesContainer}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Audio Beep Sync</Text>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#3A3A3C', true: '#30D158' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.toggleLabel}>Continuous Loop</Text>
            <Switch
              value={loopEnabled}
              onValueChange={setLoopEnabled}
              trackColor={{ false: '#3A3A3C', true: '#0A84FF' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Transmit / Stop Action */}
        {!isTransmitting ? (
          <TouchableOpacity
            style={[styles.button, !inputText.trim() && styles.buttonDisabled]}
            onPress={transmitMorse}
            disabled={!inputText.trim()}
          >
            <Text style={styles.buttonText}>Transmit Flash</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopTransmission}
          >
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  hiddenCamera: { width: 1, height: 1, position: 'absolute', opacity: 0 },
  inner: { flex: 1, padding: 22, justifyContent: 'center' },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 18,
  },
  indicator: {
    height: 68,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  indicatorText: { fontSize: 16, fontWeight: '800', letterSpacing: 1.5 },
  input: {
    backgroundColor: '#1C1C1E',
    color: '#FFFFFF',
    fontSize: 18,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    marginBottom: 12,
  },
  morseBox: {
    backgroundColor: '#1C1C1E',
    padding: 14,
    borderRadius: 12,
    minHeight: 70,
    marginBottom: 16,
  },
  morseLabel: {
    color: '#8E8E93',
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  morseOutput: {
    color: '#FFD60A',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
  },
  sectionLabel: {
    color: '#8E8E93',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  speedRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  speedBtn: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  speedBtnActive: {
    backgroundColor: '#FFD60A',
    borderColor: '#FFD60A',
  },
  speedBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  speedBtnTextActive: { color: '#000000', fontWeight: '700' },
  togglesContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  toggleLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  button: {
    backgroundColor: '#0A84FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButton: { backgroundColor: '#FF453A' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});