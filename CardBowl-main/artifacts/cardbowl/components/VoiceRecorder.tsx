import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { VoiceNote, generateId } from "@/lib/storage";
import { useColors } from "@/hooks/useColors";

interface VoiceRecorderProps {
  onSave: (note: VoiceNote) => void;
}

export function VoiceRecorder({ onSave }: VoiceRecorderProps) {
  const colors = useColors();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [label, setLabel] = useState("");
  const [uri, setUri] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please allow microphone access");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
      setDuration(0);
      durationRef.current = 0;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);
    } catch (e) {
      Alert.alert("Error", "Could not start recording");
    }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      await recording?.stopAndUnloadAsync();
      const fileUri = recording?.getURI();
      setIsRecording(false);
      setRecording(null);
      setUri(fileUri || null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Error", "Could not stop recording");
    }
  };

  const saveNote = () => {
    if (!uri) return;
    const note: VoiceNote = {
      id: generateId(),
      uri,
      duration: durationRef.current,
      label: label.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    onSave(note);
    setUri(null);
    setLabel("");
    setDuration(0);
  };

  const discard = () => {
    setUri(null);
    setLabel("");
    setDuration(0);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (uri) {
    return (
      <View
        style={[
          styles.savedContainer,
          { backgroundColor: colors.accent, borderColor: colors.primary + "40" },
        ]}
      >
        <Text style={[styles.savedTitle, { color: colors.primary }]}>
          Recording saved ({formatTime(durationRef.current)})
        </Text>
        <TextInput
          style={[
            styles.labelInput,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          placeholder="Add a label (optional)"
          placeholderTextColor={colors.mutedForeground}
          value={label}
          onChangeText={setLabel}
        />
        <View style={styles.row}>
          <TouchableOpacity style={styles.discardBtn} onPress={discard}>
            <Feather name="x" size={16} color={colors.destructive} />
            <Text style={[styles.discardText, { color: colors.destructive }]}>
              Discard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={saveNote}
          >
            <Feather name="check" size={16} color="#fff" />
            <Text style={styles.saveBtnText}>Add Note</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isRecording && (
        <View style={styles.durationRow}>
          <View style={[styles.dot, { backgroundColor: colors.destructive }]} />
          <Text style={[styles.durationText, { color: colors.foreground }]}>
            {formatTime(duration)}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.recordBtn,
          {
            backgroundColor: isRecording
              ? colors.destructive
              : colors.primary,
          },
        ]}
        onPress={isRecording ? stopRecording : startRecording}
        activeOpacity={0.8}
      >
        <Feather
          name={isRecording ? "square" : "mic"}
          size={20}
          color="#fff"
        />
        <Text style={styles.recordBtnText}>
          {isRecording ? "Stop" : "Record Note"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 10 },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  durationText: { fontSize: 16, fontWeight: "600", fontVariant: ["tabular-nums"] },
  recordBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  recordBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  savedContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  savedTitle: { fontSize: 14, fontWeight: "600" },
  labelInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
  },
  row: { flexDirection: "row", gap: 10 },
  discardBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ef444440",
  },
  discardText: { fontWeight: "500" },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnText: { color: "#fff", fontWeight: "600" },
});
