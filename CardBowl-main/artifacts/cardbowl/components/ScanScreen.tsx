import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCards } from "@/context/CardsContext";
import { useProfile } from "@/context/ProfileContext";
import {
  BusinessCard,
  VoiceNote,
  generateId,
  saveConnection,
} from "@/lib/storage";
import { ocrCard, enrichCardMetadata } from "@/lib/ai";
import {
  parseProfileQrPayload,
  profilePayloadToBusinessCard,
} from "@/lib/qr";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { VoiceNotePlayer } from "@/components/VoiceNotePlayer";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  icon?: string;
  keyboardType?: any;
  highlight?: boolean;
}

function Field({
  label, value, onChangeText, placeholder, icon, keyboardType, highlight,
}: FieldProps) {
  const colors = useColors();
  return (
    <View style={fStyles.wrap}>
      <Text style={[fStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View
        style={[
          fStyles.input,
          {
            backgroundColor: highlight ? colors.accent : colors.muted,
            borderColor: highlight ? colors.primary : colors.border,
          },
        ]}
      >
        {icon && <Feather name={icon as any} size={13} color={highlight ? colors.primary : colors.mutedForeground} />}
        <TextInput
          style={[fStyles.text, { color: colors.foreground }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
        />
        {highlight && <Feather name="check-circle" size={14} color={colors.primary} />}
      </View>
    </View>
  );
}

const fStyles = StyleSheet.create({
  wrap: { gap: 3 },
  label: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  input: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9, gap: 7 },
  text: { flex: 1, fontSize: 14 },
});

const STEP_LABELS = ["Photos", "Details", "Notes"] as const;
type Step = "photos" | "details" | "notes";
type ScanMode = "card" | "qr";

export default function ScanScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const insets = useSafeAreaInsets();
  const { addOrUpdateCard, cards } = useCards();
  const { profile } = useProfile();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [mode, setMode] = useState<ScanMode>(params.mode === "connect" ? "qr" : "card");

  const [step, setStep] = useState<Step>("photos");
  const [imageFront, setImageFront] = useState<string | undefined>();
  const [imageBack, setImageBack] = useState<string | undefined>();
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrFields, setOcrFields] = useState<Set<string>>(new Set());
  const [enriching, setEnriching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [qrLocked, setQrLocked] = useState(false);
  const [savedCardForNotes, setSavedCardForNotes] = useState<BusinessCard | null>(null);
  const [isPromptingPermission, setIsPromptingPermission] = useState(false);
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const [bannerMsg, setBannerMsg] = useState("");

  const [form, setForm] = useState({
    name: "", title: "", company: "", email: "",
    phone: "", website: "", address: "",
    linkedin: "", twitter: "", instagram: "", notes: "",
  });

  const [enrichedMeta, setEnrichedMeta] = useState<{
    keywords: string[];
    category?: string;
    orgDescription?: string;
    decisionMakers?: string[];
    orgLocation?: string;
    webContext?: string;
  }>({ keywords: [] });

  useEffect(() => {
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => setLocationPermission(status === "granted"))
      .catch(() => {});
  }, []);

  const ensureCameraPermission = async () => {
    if (Platform.OS === "web") return false;
    if (cameraPermission?.granted) return true;
    const res = await requestCameraPermission();
    return !!res.granted;
  };

  const startQrScanner = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Unavailable on web", "QR scanner is available in iOS and Android only.");
      return;
    }
    const granted = await ensureCameraPermission();
    if (!granted) {
      Alert.alert("Camera permission required", "Allow access to scan QR codes, or switch to manual entry.", [
        { text: "Enter Manually", onPress: () => { setMode("card"); setStep("details"); } },
        { text: "Allow Camera", onPress: () => { void startQrScanner(); } },
      ]);
      return;
    }
    setQrLocked(false);
    setMode("qr");
  };

  useEffect(() => {
    if (params.mode === "connect") {
      void startQrScanner();
    }
  }, [params.mode]);

  useEffect(() => {
    if (Platform.OS === "web" || isPromptingPermission) return;
    if (cameraPermission?.granted) return;

    setIsPromptingPermission(true);
    Alert.alert(
      "Camera access",
      "CardBowl needs camera permission for card photos and QR scanning.",
      [
        {
          text: "Enter Manually",
          onPress: () => {
            setMode("card");
            setStep("details");
            setIsPromptingPermission(false);
          },
        },
        {
          text: "Allow Camera",
          onPress: async () => {
            await ensureCameraPermission();
            setIsPromptingPermission(false);
          },
        },
      ]
    );
  }, [cameraPermission, isPromptingPermission]);

  const showBanner = (msg: string) => {
    setBannerMsg(msg);
    Animated.sequence([
      Animated.timing(bannerAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(bannerAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const getCurrentScanLocation = async (): Promise<BusinessCard["location"] | undefined> => {
    if (!locationPermission) return undefined;

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
      });

      let locationAddress = "";
      try {
        const [rev] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (rev) {
          locationAddress = [rev.city, rev.region, rev.country]
            .filter(Boolean)
            .join(", ");
        }
      } catch {
        // Best-effort address lookup; coordinates are still useful.
      }

      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        address: locationAddress,
      };
    } catch {
      return undefined;
    }
  };

  const mergeExtractedFields = (extracted: Partial<BusinessCard>, touched: Set<string>) => {
    setForm((prev) => {
      const next = { ...prev };
      const fields: (keyof typeof form)[] = [
        "name", "title", "company", "email",
        "phone", "website", "address",
        "linkedin", "twitter", "instagram", "notes",
      ];
      fields.forEach((k) => {
        const v = (extracted as any)[k];
        if (v && typeof v === "string" && v.trim() && !prev[k]) {
          (next as any)[k] = v.trim();
          touched.add(k);
        }
      });
      return next;
    });
  };

  const takePhoto = async (side: "front" | "back") => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow camera access");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (side === "front") {
        setImageFront(uri);
      } else {
        setImageBack(uri);
      }
    }
  };

  const pickImage = async (side: "front" | "back") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo library access");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (side === "front") {
        setImageFront(uri);
      } else {
        setImageBack(uri);
      }
    }
  };

  const goToDetails = async () => {
    if (imageFront) {
      if (ocrRunning) return;
      setOcrRunning(true);
      const touched = new Set<string>();
      try {
        const frontExtracted = await ocrCard(imageFront);
        mergeExtractedFields(frontExtracted, touched);
        if (imageBack) {
          const backExtracted = await ocrCard(imageBack);
          mergeExtractedFields(backExtracted, touched);
        }
        setOcrFields(touched);
        showBanner(`Card scanned — ${touched.size} field${touched.size !== 1 ? "s" : ""} filled in`);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        showBanner("OCR unavailable — fill in details manually");
      } finally {
        setOcrRunning(false);
      }
    }
    setStep("details");
  };

  const handleEnrich = async () => {
    if (!form.name && !form.company && !form.website) {
      Alert.alert("Need more info", "Fill in at least a name, company, or website first.");
      return;
    }
    setEnriching(true);
    try {
      const enriched = await enrichCardMetadata({
        ...form, keywords: [], voiceNotes: [],
        createdAt: "", updatedAt: "", savedAt: "", id: "",
      });
      setForm((f) => ({
        ...f,
        linkedin: (enriched.linkedin as string) || f.linkedin,
        twitter: (enriched.twitter as string) || f.twitter,
        instagram: (enriched.instagram as string) || f.instagram,
      }));
      setEnrichedMeta({
        keywords: (enriched.keywords as string[]) || [],
        category: enriched.category as string | undefined,
        orgDescription: enriched.orgDescription as string | undefined,
        decisionMakers: enriched.decisionMakers as string[] | undefined,
        orgLocation: enriched.orgLocation as string | undefined,
        webContext: enriched.webContext as string | undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const kws = (enriched.keywords as string[] || []).slice(0, 3);
      showBanner(`Enriched: ${enriched.category || "data"} · ${kws.join(", ")}`);
    } catch {
      Alert.alert("Enrichment failed", "Could not fetch additional details. Fill in manually.");
    } finally {
      setEnriching(false);
    }
  };

  const runBackgroundEnrichment = (card: BusinessCard) => {
    void (async () => {
      try {
        const enriched = await enrichCardMetadata(card);
        const merged: BusinessCard = {
          ...card,
          linkedin: (enriched.linkedin as string) || card.linkedin,
          twitter: (enriched.twitter as string) || card.twitter,
          instagram: (enriched.instagram as string) || card.instagram,
          keywords: (enriched.keywords as string[]) || card.keywords,
          category: (enriched.category as string) || card.category,
          orgDescription: (enriched.orgDescription as string) || card.orgDescription,
          decisionMakers: (enriched.decisionMakers as string[]) || card.decisionMakers,
          orgLocation: (enriched.orgLocation as string) || card.orgLocation,
          webContext: (enriched.webContext as string) || card.webContext,
          updatedAt: new Date().toISOString(),
        };
        await addOrUpdateCard(merged);
      } catch {
        // Intentionally silent: enrichment is best-effort in background.
      }
    })();
  };

  const saveCard = async () => {
    if (!form.name.trim() && !form.company.trim()) {
      Alert.alert("Missing info", "Please add at least a name or company");
      return;
    }
    setSaving(true);
    try {
      const locationData = await getCurrentScanLocation();

      const card: BusinessCard = {
        id: generateId(),
        ...form,
        imageFront,
        imageBack,
        voiceNotes,
        keywords: enrichedMeta.keywords || [],
        category: enrichedMeta.category,
        orgDescription: enrichedMeta.orgDescription,
        decisionMakers: enrichedMeta.decisionMakers,
        orgLocation: enrichedMeta.orgLocation,
        location: locationData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
      } as BusinessCard;

      await addOrUpdateCard(card);
      runBackgroundEnrichment(card);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Card Saved", "Would you like to add a voice note now?", [
        {
          text: "Skip",
          onPress: () => router.replace(`/card/${card.id}`),
        },
        {
          text: "Add Voice Note",
          onPress: () => {
            setSavedCardForNotes(card);
            setStep("notes");
          },
        },
      ]);
    } catch {
      Alert.alert("Error", "Could not save card");
    } finally {
      setSaving(false);
    }
  };

  const finishWithVoiceNotes = async () => {
    if (!savedCardForNotes) {
      return;
    }

    try {
      await addOrUpdateCard({
        ...savedCardForNotes,
        voiceNotes,
        notes: form.notes,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      Alert.alert("Warning", "Card was saved but voice note update failed.");
    } finally {
      router.replace(`/card/${savedCardForNotes.id}`);
    }
  };

  const handleQrScanned = async ({ data }: { data: string }) => {
    if (qrLocked) return;
    setQrLocked(true);

    const payload = parseProfileQrPayload(data);
    if (!payload) {
      Alert.alert("Invalid QR", "This QR code is not a CardBowl profile.", [
        { text: "Try Again", onPress: () => setQrLocked(false) },
      ]);
      return;
    }

    if (profile?.id && payload.user.id === profile.id) {
      Alert.alert("Same profile", "You scanned your own QR code.", [
        { text: "Scan Another", onPress: () => setQrLocked(false) },
      ]);
      return;
    }

    const normalizeEmail = (value: unknown) =>
      typeof value === "string" ? value.trim().toLowerCase() : "";

    const scannedEmail = normalizeEmail(payload.user.email);
    const existing = cards.find(
      (card) =>
        card.id === `connected:${payload.user.id}` ||
        (!!scannedEmail && scannedEmail === normalizeEmail((card as any).email))
    );

    if (existing) {
      Alert.alert("Already Connected", "This contact is already in your cards.", [
        { text: "View Card", onPress: () => router.replace(`/card/${existing.id}`) },
        { text: "Scan Another", onPress: () => setQrLocked(false) },
      ]);
      return;
    }

    try {
      const locationData = await getCurrentScanLocation();
      const connectedCard = profilePayloadToBusinessCard(payload);
      await addOrUpdateCard({
        ...connectedCard,
        location: locationData,
        updatedAt: new Date().toISOString(),
      });

      if (profile?.id) {
        const now = new Date().toISOString();
        await saveConnection({
          id: generateId(),
          myUserId: profile.id,
          peerUserId: payload.user.id,
          peerName: payload.user.name,
          connectedAt: now,
          updatedAt: now,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showBanner(`Connected with ${payload.user.name || "new contact"}`);

      Alert.alert(
        "Connected",
        `${payload.user.name || "Contact"} is now in your Cards tab.`,
        [
          { text: "Scan Another", onPress: () => setQrLocked(false) },
          { text: "View Card", onPress: () => router.replace(`/card/${connectedCard.id}`) },
          { text: "Done", onPress: () => setMode("card") },
        ]
      );
    } catch {
      Alert.alert("Connection failed", "Could not save this connection.", [
        { text: "Try Again", onPress: () => setQrLocked(false) },
      ]);
    }
  };

  const ImageSlot = ({
    label, uri, side,
  }: { label: string; uri?: string; side: "front" | "back" }) => (
    <View style={styles.imageSlot}>
      <Text style={[styles.slotLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {uri ? (
        <View style={styles.imagePreviewWrap}>
          <Image source={{ uri }} style={styles.imagePreview} resizeMode="cover" />
          <TouchableOpacity
            style={[styles.removeImg, { backgroundColor: colors.destructive }]}
            onPress={() => (side === "front" ? setImageFront(undefined) : setImageBack(undefined))}
          >
            <Feather name="x" size={12} color="#fff" />
          </TouchableOpacity>
          {side === "front" && ocrRunning && (
            <View style={[styles.ocrOverlay, { backgroundColor: colors.navy + "cc" }]}>
              <Feather name="cpu" size={20} color={colors.gold} />
              <Text style={[styles.ocrOverlayText, { color: "#fff" }]}>Reading card…</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.imageBtns}>
          <TouchableOpacity
            style={[styles.imgBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={() => takePhoto(side)}
          >
            <Feather name="camera" size={20} color={colors.primary} />
            <Text style={[styles.imgBtnText, { color: colors.primary }]}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.imgBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={() => pickImage(side)}
          >
            <Feather name="image" size={20} color={colors.primary} />
            <Text style={[styles.imgBtnText, { color: colors.primary }]}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (mode === "qr") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        {/* Mode toggle always at the top, styled as pill/segmented */}
        <View style={[styles.modeTogglePill, { marginTop: topPad + 12, backgroundColor: colors.background, borderColor: colors.border }]}> 
          <TouchableOpacity
            style={[styles.modeBtnPill, mode === "card" && styles.modeBtnPillInactive]}
            onPress={() => setMode("card")}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === "card" }}
          >
            <Feather name="credit-card" size={16} color={mode === "card" ? colors.foreground : colors.mutedForeground} style={{ marginRight: 6 }} />
            <Text style={[styles.modeBtnText, { color: mode === "card" ? colors.foreground : colors.mutedForeground }]}>Card Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtnPill, mode === "qr" && styles.modeBtnPillActive]}
            onPress={() => setMode("qr")}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === "qr" }}
          >
            <Feather name="grid" size={16} color={mode === "qr" ? colors.primary : colors.mutedForeground} style={{ marginRight: 6 }} />
            <Text style={[styles.modeBtnText, { color: mode === "qr" ? colors.primary : colors.mutedForeground }]}>Scan QR</Text>
          </TouchableOpacity>
        </View>

        {/* Camera viewfinder and prompt */}
        {cameraPermission?.granted ? (
          <View style={styles.qrScannerWrap}>
            <CameraView
              style={styles.qrScanner}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleQrScanned}
            />
            <View pointerEvents="none" style={styles.qrFrameWrap}>
              <View style={[styles.qrFrame, { borderColor: "#fff" }]} />
            </View>
            {/* Centered prompt below viewfinder */}
            <View style={{ alignItems: "center", marginTop: 18 }}>
              <Text style={[styles.qrHint, { color: colors.mutedForeground, fontWeight: "600", fontSize: 16, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 }]}>Point at a CardBowl QR code</Text>
            </View>
          </View>
        ) : (
          <View style={styles.qrFallback}>
            <Text style={[styles.qrHint, { color: colors.mutedForeground }]}>Camera access is needed to scan QR codes.</Text>
            <TouchableOpacity style={[styles.qrDoneBtn, { backgroundColor: colors.primary }]} onPress={startQrScanner}>
              <Text style={styles.qrDoneText}>Allow Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.manualBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
              onPress={() => {
                setMode("card");
                setStep("details");
              }}
            >
              <Text style={[styles.manualBtnText, { color: colors.foreground }]}>Enter Manually</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Mode toggle always at the top, styled as pill/segmented */}
      <View style={[styles.modeTogglePill, { marginTop: topPad + 12, backgroundColor: colors.background, borderColor: colors.border }]}> 
        <TouchableOpacity
          style={[styles.modeBtnPill, mode === "card" && styles.modeBtnPillActive]}
          onPress={() => setMode("card")}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === "card" }}
        >
          <Feather name="credit-card" size={16} color={mode === "card" ? colors.primary : colors.mutedForeground} style={{ marginRight: 6 }} />
          <Text style={[styles.modeBtnText, { color: mode === "card" ? colors.primary : colors.mutedForeground }]}>Card Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtnPill, mode === "qr" && styles.modeBtnPillActive]}
          onPress={() => setMode("qr")}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === "qr" }}
        >
          <Feather name="grid" size={16} color={mode === "qr" ? colors.primary : colors.mutedForeground} style={{ marginRight: 6 }} />
          <Text style={[styles.modeBtnText, { color: mode === "qr" ? colors.primary : colors.mutedForeground }]}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      {/* Floating banner */}
      <Animated.View
        style={[
          styles.banner,
          { backgroundColor: colors.primary, opacity: bannerAnim, transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }] },
        ]}
        pointerEvents="none"
      >
        <Feather name="check-circle" size={14} color="#fff" />
        <Text style={styles.bannerText}>{bannerMsg}</Text>
      </Animated.View>

      <View style={styles.stepsRow}>
        {(["photos", "details", "notes"] as Step[]).map((s, i) => (
          <View key={s} style={styles.stepWrap}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor:
                    step === s
                      ? colors.primary
                      : i < (["photos", "details", "notes"] as Step[]).indexOf(step)
                      ? colors.success
                      : colors.border,
                },
              ]}
            >
              {i < (["photos", "details", "notes"] as Step[]).indexOf(step) ? (
                <Feather name="check" size={10} color="#fff" />
              ) : (
                <Text style={styles.stepNum}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, { color: step === s ? colors.primary : colors.mutedForeground }]}>
              {STEP_LABELS[i]}
            </Text>
          </View>
        ))}
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
        ]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === "photos" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Card Photos</Text>
            <View style={[styles.ocrInfoBox, { backgroundColor: colors.accent, borderColor: colors.primary + "30" }]}>
              <Feather name="cpu" size={14} color={colors.primary} />
              <Text style={[styles.ocrInfoText, { color: colors.primary }]}>
                AI OCR auto-fills card details from the front photo
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.connectBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={startQrScanner}
            >
              <Feather name="user-plus" size={16} color={colors.primary} />
              <Text style={[styles.connectBtnText, { color: colors.primary }]}>Connect by Scanning CardBowl QR</Text>
            </TouchableOpacity>
            <ImageSlot label="Front Side" uri={imageFront} side="front" />
            <ImageSlot label="Back Side (optional)" uri={imageBack} side="back" />
            <TouchableOpacity
              style={[styles.manualBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
              onPress={() => setStep("details")}
            >
              <Text style={[styles.manualBtnText, { color: colors.foreground }]}>Enter Details Manually</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
              onPress={goToDetails}
            >
              <Text style={styles.nextBtnText}>
                {ocrRunning ? "Scanning card…" : "Continue to Details"}
              </Text>
              <Feather name={ocrRunning ? "loader" : "arrow-right"} size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {step === "details" && (
          <View style={styles.section}>
            <View style={styles.detailsHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Card Details</Text>
              <TouchableOpacity
                style={[styles.enrichBtn, { backgroundColor: enriching ? colors.muted : colors.accent, borderColor: colors.primary + "40" }]}
                onPress={handleEnrich}
                disabled={enriching}
              >
                <Feather name={enriching ? "loader" : "zap"} size={13} color={colors.primary} />
                <Text style={[styles.enrichText, { color: colors.primary }]}>
                  {enriching ? "Enriching…" : "AI Enrich"}
                </Text>
              </TouchableOpacity>
            </View>

            {ocrFields.size > 0 && (
              <View style={[styles.ocrInfoBox, { backgroundColor: colors.accent, borderColor: colors.primary + "30" }]}>
                <Feather name="check-circle" size={14} color={colors.primary} />
                <Text style={[styles.ocrInfoText, { color: colors.primary }]}>
                  OCR filled {ocrFields.size} field{ocrFields.size !== 1 ? "s" : ""} — highlighted below. Edit any mistakes.
                </Text>
              </View>
            )}

            <Field label="Full Name" value={form.name} onChangeText={set("name")} placeholder="Jane Doe" icon="user" highlight={ocrFields.has("name")} />
            <Field label="Job Title" value={form.title} onChangeText={set("title")} placeholder="CEO / Manager…" icon="briefcase" highlight={ocrFields.has("title")} />
            <Field label="Company" value={form.company} onChangeText={set("company")} placeholder="Acme Inc" icon="home" highlight={ocrFields.has("company")} />
            <Field label="Email" value={form.email} onChangeText={set("email")} placeholder="jane@company.com" icon="mail" keyboardType="email-address" highlight={ocrFields.has("email")} />
            <Field label="Phone" value={form.phone} onChangeText={set("phone")} placeholder="+1 234 567 8900" icon="phone" keyboardType="phone-pad" highlight={ocrFields.has("phone")} />
            <Field label="Website" value={form.website} onChangeText={set("website")} placeholder="https://company.com" icon="globe" keyboardType="url" highlight={ocrFields.has("website")} />
            <Field label="Address" value={form.address} onChangeText={set("address")} placeholder="City, Country" icon="map-pin" highlight={ocrFields.has("address")} />

            <Text style={[styles.subGroupTitle, { color: colors.mutedForeground }]}>Social Handles</Text>
            <Field label="LinkedIn" value={form.linkedin} onChangeText={set("linkedin")} placeholder="linkedin.com/in/jane" icon="linkedin" highlight={ocrFields.has("linkedin")} />
            <Field label="Twitter / X" value={form.twitter} onChangeText={set("twitter")} placeholder="@jane" icon="twitter" highlight={ocrFields.has("twitter")} />
            <Field label="Instagram" value={form.instagram} onChangeText={set("instagram")} placeholder="@jane" icon="instagram" highlight={ocrFields.has("instagram")} />

            {enrichedMeta.keywords.length > 0 && (
              <View style={[styles.kwPreview, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.kwPreviewLabel, { color: colors.mutedForeground }]}>
                  AI Keywords ({enrichedMeta.category || "category"})
                </Text>
                <View style={styles.kwChips}>
                  {enrichedMeta.keywords.slice(0, 6).map((kw, i) => (
                    <View key={i} style={[styles.kwChip, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.kwChipText, { color: colors.primary }]}>{kw}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveCardBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}
              onPress={saveCard}
              disabled={saving}
            >
              <Feather name="save" size={18} color="#fff" />
              <Text style={styles.saveCardBtnText}>{saving ? "Saving…" : "Save Card"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "notes" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Voice Notes</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              Optional: record a quick voice note for this contact
            </Text>

            <VoiceRecorder onSave={(note) => setVoiceNotes((v) => [...v, note])} />

            {voiceNotes.length > 0 && (
              <View style={styles.notesList}>
                {voiceNotes.map((note) => (
                  <VoiceNotePlayer
                    key={note.id}
                    note={note}
                    onDelete={() => setVoiceNotes((v) => v.filter((n) => n.id !== note.id))}
                  />
                ))}
              </View>
            )}

            <View style={[styles.notesInput, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                style={[styles.notesText, { color: colors.foreground }]}
                value={form.notes}
                onChangeText={set("notes")}
                placeholder="Additional text notes…"
                placeholderTextColor={colors.mutedForeground}
                multiline
              />
            </View>

            {locationPermission && (
              <View style={[styles.locationNotice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="map-pin" size={13} color={colors.success} />
                <Text style={[styles.locationNoticeText, { color: colors.mutedForeground }]}>
                  GPS location will be recorded when you save
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveCardBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}
              onPress={finishWithVoiceNotes}
              disabled={saving}
            >
              <Feather name="save" size={18} color="#fff" />
              <Text style={styles.saveCardBtnText}>{saving ? "Saving…" : "Save & Open Card"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.manualBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
              onPress={() => {
                if (savedCardForNotes) {
                  router.replace(`/card/${savedCardForNotes.id}`);
                }
              }}
            >
              <Text style={[styles.manualBtnText, { color: colors.foreground }]}>Skip Voice Note</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Removed navBar and navTitle for minimal top UI
  modeTogglePill: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 20,
    padding: 4,
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  modeBtnPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  modeBtnPillActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  modeBtnPillInactive: {
    backgroundColor: "transparent",
  },
  modeBtnText: { fontSize: 15, fontWeight: "700" },
  banner: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: Platform.OS === "ios" ? 100 : 70,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  bannerText: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1 },
  stepsRow: { flexDirection: "row", justifyContent: "center", gap: 32, paddingVertical: 14 },
  stepWrap: { alignItems: "center", gap: 4 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  stepNum: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepLabel: { fontSize: 11, fontWeight: "500" },
  content: { padding: 16, gap: 12 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "700" },
  sectionSub: { fontSize: 14, marginTop: -4 },
  ocrInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  ocrInfoText: { fontSize: 13, flex: 1, lineHeight: 18 },
  imageSlot: { gap: 8 },
  slotLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  imageBtns: { flexDirection: "row", gap: 10 },
  imgBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 24, borderRadius: 12, borderWidth: 1, gap: 8,
  },
  imgBtnText: { fontSize: 13, fontWeight: "500" },
  imagePreviewWrap: { position: "relative" },
  imagePreview: { width: "100%", height: 160, borderRadius: 12 },
  removeImg: {
    position: "absolute", top: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  ocrOverlay: {
    position: "absolute", inset: 0, borderRadius: 12,
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  ocrOverlayText: { fontSize: 14, fontWeight: "600" },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 8,
  },
  connectBtnText: { fontSize: 13, fontWeight: "700" },
  manualBtn: {
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    marginTop: 2,
  },
  manualBtnText: { fontSize: 13, fontWeight: "700" },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 4,
  },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  detailsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  enrichBtn: {
    flexDirection: "row", alignItems: "center",
    gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  enrichText: { fontSize: 12, fontWeight: "600" },
  subGroupTitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 4 },
  kwPreview: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 8 },
  kwPreviewLabel: { fontSize: 11, fontWeight: "600" },
  kwChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  kwChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  kwChipText: { fontSize: 12, fontWeight: "500" },
  notesList: { gap: 8 },
  notesInput: { borderRadius: 12, borderWidth: 1, padding: 12, minHeight: 80 },
  notesText: { fontSize: 14 },
  locationNotice: {
    flexDirection: "row", alignItems: "center",
    gap: 8, padding: 10, borderRadius: 10, borderWidth: 1,
  },
  locationNoticeText: { fontSize: 13, flex: 1 },
  saveCardBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 4,
  },
  saveCardBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  qrScannerWrap: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  qrScanner: { flex: 1 },
  qrFrameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  qrFrame: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderRadius: 16,
  },
  qrFooter: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  qrFallback: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  qrHint: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  qrDoneBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 12,
  },
  qrDoneText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
