import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { VoiceNote } from "@/lib/storage";
import { useColors } from "@/hooks/useColors";

interface VoiceNotePlayerProps {
  note: VoiceNote;
  onDelete?: () => void;
}

export function VoiceNotePlayer({ note, onDelete }: VoiceNotePlayerProps) {
  const colors = useColors();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  const togglePlay = async () => {
    try {
      if (playing) {
        await sound?.pauseAsync();
        setPlaying(false);
      } else {
        if (sound) {
          await sound.playAsync();
          setPlaying(true);
        } else {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: note.uri },
            { shouldPlay: true },
            (status) => {
              if (status.isLoaded) {
                setPosition(status.positionMillis || 0);
                if (status.didJustFinish) {
                  setPlaying(false);
                  setPosition(0);
                }
              }
            }
          );
          setSound(newSound);
          setPlaying(true);
        }
      }
    } catch (e) {
      Alert.alert("Error", "Could not play audio");
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  const progress = note.duration > 0 ? position / (note.duration * 1000) : 0;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        style={[styles.playBtn, { backgroundColor: colors.primary }]}
        onPress={togglePlay}
      >
        <Feather
          name={playing ? "pause" : "play"}
          size={16}
          color="#fff"
        />
      </TouchableOpacity>
      <View style={styles.center}>
        {note.label ? (
          <Text
            style={[styles.label, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {note.label}
          </Text>
        ) : null}
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.min(progress * 100, 100)}%` as any,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {formatTime(playing ? position : note.duration * 1000)} /{" "}
          {formatTime(note.duration * 1000)}
        </Text>
      </View>
      {onDelete && (
        <TouchableOpacity onPress={onDelete}>
          <Feather name="trash-2" size={16} color={colors.destructive} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, gap: 4 },
  label: { fontSize: 13, fontWeight: "500" },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  time: { fontSize: 11 },
});
