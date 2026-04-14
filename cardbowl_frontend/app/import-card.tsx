import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "@/context/ProfileContext";
import { UserProfile, generateId } from "@/lib/storage";
import { useColors } from "@/hooks/useColors";
import {
  extractProfileFromCard,
  extractedToProfile,
  checkApiKeys,
  ExtractedProfile,
} from "@/lib/profileImportAi";

type Step = "capture" | "processing" | "review";

export default function ImportCardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useProfile();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [step, setStep] = useState<Step>("capture");
  const [imageFront, setImageFront] = useState<string | undefined>();
  const [imageBack, setImageBack] = useState<string | undefined>();
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [extracted, setExtracted] = useState<ExtractedProfile | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSide, setCameraSide] = useState<"front" | "back">("front");
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  const goBackOrProfile = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/profile");
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: false }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(0.4);
  };

  const ensureCameraPermission = async () => {
    if (Platform.OS === "web") return false;
    if (cameraPermission?.granted) return true;
    const res = await requestCameraPermission();
    return !!res.granted;
  };

  const openCamera = async (side: "front" | "back") => {
    const granted = await ensureCameraPermission();
    if (!granted) {
      Alert.alert("Camera permission required", "Allow camera access to take a photo of your card.");
      return;
    }
    setCameraSide(side);
    setCameraActive(true);
  };

  const takePhoto = async (side: "front" | "back") => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow camera access");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.4 });
    if (!result.canceled && result.assets[0]) {
      if (side === "front") {
        setImageFront(result.assets[0].uri);
      } else {
        setImageBack(result.assets[0].uri);
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
      mediaTypes: ["images"],
      quality: 0.4,
    });
    if (!result.canceled && result.assets[0]) {
      if (side === "front") {
        setImageFront(result.assets[0].uri);
      } else {
        setImageBack(result.assets[0].uri);
      }
    }
  };

  const processCard = async () => {
    if (processing) return;

    if (!imageFront) {
      Alert.alert("Photo required", "Please take or select a photo of the front of your card.");
      return;
    }

    // Validate API keys before starting
    const keys = checkApiKeys();
    if (!keys.openai && !keys.gemini && !keys.backend) {
      Alert.alert(
        "API Keys Missing",
        keys.message || "Add EXPO_PUBLIC_API_BASE_URL (backend mode) or OpenAI/Gemini keys to .env, then restart the Expo dev server (npx expo start).",
      );
      return;
    }

    setStep("processing");
    setProcessing(true);
    startPulse();

    try {
      setStatusText("Preparing image...");
      const result = await extractProfileFromCard(imageFront, imageBack, (msg) => {
        setStatusText(msg);
      });
      setExtracted(result);
      stopPulse();
      setStep("review");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      stopPulse();
      setStep("capture");
      const errMsg = e?.message || "Unknown error";
      Alert.alert(
        "Extraction Failed",
        `${errMsg}\n\nTips:\n- Restart Expo dev server after changing .env\n- Check API key validity\n- Try a clearer photo`,
      );
    } finally {
      setProcessing(false);
    }
  };

  const applyToProfile = async () => {
    if (!extracted) return;

    const profileData = extractedToProfile(extracted, profile?.id || generateId());
    const now = new Date().toISOString();

    const updatedProfile: UserProfile = {
      id: profileData.id || generateId(),
      name: profileData.name || profile?.name || "",
      title: profileData.title || profile?.title || "",
      company: profileData.company || profile?.company || "",
      email: profileData.email || profile?.email || "",
      phone: profileData.phone || profile?.phone || "",
      website: profileData.website || profile?.website || "",
      linkedin: profileData.linkedin || profile?.linkedin || "",
      twitter: profileData.twitter || profile?.twitter || "",
      address: profileData.address || profile?.address || "",
      bio: profileData.bio || profile?.bio || "",
      products: profileData.products || profile?.products || "",
      services: profileData.services || profile?.services || "",
      keywords: profileData.keywords?.length ? profileData.keywords : profile?.keywords || [],
      cardImageFront: imageFront || profile?.cardImageFront,
      cardImageBack: imageBack || profile?.cardImageBack,
      createdAt: profile?.createdAt || now,
      updatedAt: now,
    };

    await updateProfile(updatedProfile);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Profile Updated",
      "Your business card details have been imported and your e-card has been created!",
      [{ text: "View Profile", onPress: () => router.replace("/(tabs)/profile") }]
    );
  };

  const renderField = (label: string, value?: string) => {
    if (!value) return null;
    return (
      <View style={styles.reviewField}>
        <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.reviewValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    );
  };

  // --- CAPTURE STEP ---
  if (step === "capture") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[styles.navBar, { paddingTop: topPad + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}
        >
          <TouchableOpacity onPress={goBackOrProfile}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Import from Your Card</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.infoBox, { backgroundColor: colors.accent, borderColor: colors.primary + "30" }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Take a photo of your own business card. We'll use OpenAI and Gemini AI to extract your details, scan any QR codes, and auto-create your digital e-card.
            </Text>
          </View>

          {/* Front Photo */}
          <View style={styles.photoSection}>
            <Text style={[styles.photoLabel, { color: colors.foreground }]}>Front of Card *</Text>
            {imageFront ? (
              <View>
                <Image source={{ uri: imageFront }} style={styles.preview} resizeMode="cover" />
                <TouchableOpacity
                  style={[styles.removeBtn, { backgroundColor: colors.destructive }]}
                  onPress={() => setImageFront(undefined)}
                >
                  <Feather name="x" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoBtns}>
                <TouchableOpacity
                  style={[styles.photoBtn, { backgroundColor: colors.primary }]}
                  onPress={() => takePhoto("front")}
                >
                  <Feather name="camera" size={18} color="#fff" />
                  <Text style={styles.photoBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoBtn, { backgroundColor: colors.navyMid }]}
                  onPress={() => pickImage("front")}
                >
                  <Feather name="image" size={18} color="#fff" />
                  <Text style={styles.photoBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Back Photo */}
          <View style={styles.photoSection}>
            <Text style={[styles.photoLabel, { color: colors.foreground }]}>
              Back of Card <Text style={{ color: colors.mutedForeground, fontWeight: "400" }}>(optional)</Text>
            </Text>
            {imageBack ? (
              <View>
                <Image source={{ uri: imageBack }} style={styles.preview} resizeMode="cover" />
                <TouchableOpacity
                  style={[styles.removeBtn, { backgroundColor: colors.destructive }]}
                  onPress={() => setImageBack(undefined)}
                >
                  <Feather name="x" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoBtns}>
                <TouchableOpacity
                  style={[styles.photoBtn, { backgroundColor: colors.primary }]}
                  onPress={() => takePhoto("back")}
                >
                  <Feather name="camera" size={18} color="#fff" />
                  <Text style={styles.photoBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoBtn, { backgroundColor: colors.navyMid }]}
                  onPress={() => pickImage("back")}
                >
                  <Feather name="image" size={18} color="#fff" />
                  <Text style={styles.photoBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Process Button */}
          <TouchableOpacity
            style={[
              styles.processBtn,
              { backgroundColor: imageFront ? colors.primary : colors.muted },
              processing ? { opacity: 0.65 } : null,
            ]}
            onPress={() => void processCard()}
            disabled={processing}
          >
            <Feather name="cpu" size={18} color={imageFront ? "#fff" : colors.mutedForeground} />
            <Text
              style={[
                styles.processBtnText,
                { color: imageFront ? "#fff" : colors.mutedForeground },
              ]}
            >
              Extract Details with AI
            </Text>
          </TouchableOpacity>

          {!imageFront ? (
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>Add a front-card photo first.</Text>
          ) : null}

          <View style={[styles.modelBadges, { gap: 8 }]}>
            <View style={[styles.badge, { backgroundColor: "#10a37f20" }]}>
              <Text style={[styles.badgeText, { color: "#10a37f" }]}>OpenAI GPT-4o</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: "#4285f420" }]}>
              <Text style={[styles.badgeText, { color: "#4285f4" }]}>Gemini 2.5 Flash</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- PROCESSING STEP ---
  if (step === "processing") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[styles.navBar, { paddingTop: topPad + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}
        >
          <View style={{ width: 24 }} />
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Analyzing Card</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.processingContainer}>
          <Animated.View style={[styles.processingIcon, { backgroundColor: colors.accent, opacity: pulseAnim }]}>
            <Feather name="cpu" size={48} color={colors.primary} />
          </Animated.View>
          <Text style={[styles.processingTitle, { color: colors.foreground }]}>
            AI is reading your card...
          </Text>
          <Text style={[styles.processingStatus, { color: colors.mutedForeground }]}>
            {statusText}
          </Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />

          <View style={[styles.modelBadges, { marginTop: 24 }]}>
            <View style={[styles.processingBadge, { backgroundColor: "#10a37f15", borderColor: "#10a37f40" }]}>
              <View style={[styles.badgeDot, { backgroundColor: "#10a37f" }]} />
              <Text style={[styles.processingBadgeText, { color: "#10a37f" }]}>GPT-4o scanning text & layout</Text>
            </View>
            <View style={[styles.processingBadge, { backgroundColor: "#4285f415", borderColor: "#4285f440" }]}>
              <View style={[styles.badgeDot, { backgroundColor: "#4285f4" }]} />
              <Text style={[styles.processingBadgeText, { color: "#4285f4" }]}>Gemini 2.5 Flash detecting QR & links</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // --- REVIEW STEP ---
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[styles.navBar, { paddingTop: topPad + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity onPress={() => setStep("capture")}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Review & Import</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoBox, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
          <Feather name="check-circle" size={16} color={colors.success} />
          <Text style={[styles.infoText, { color: colors.success }]}>
            Extraction complete! Review the details below and tap "Apply to Profile" to create your e-card.
          </Text>
        </View>

        {/* Card Preview */}
        {imageFront && (
          <View style={styles.reviewImages}>
            <Image source={{ uri: imageFront }} style={styles.reviewImg} resizeMode="cover" />
            {imageBack && <Image source={{ uri: imageBack }} style={styles.reviewImg} resizeMode="cover" />}
          </View>
        )}

        {/* Extracted Details */}
        <View style={[styles.reviewSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.reviewSectionTitle, { color: colors.foreground }]}>Extracted Details</Text>
          {renderField("Name", extracted?.name)}
          {renderField("Title", extracted?.title)}
          {renderField("Company", extracted?.company)}
          {renderField("Email", extracted?.email)}
          {renderField("Phone", extracted?.phone)}
          {renderField("Website", extracted?.website)}
          {renderField("Address", extracted?.address)}
          {renderField("LinkedIn", extracted?.linkedin)}
          {renderField("Twitter", extracted?.twitter)}
          {renderField("Bio", extracted?.bio)}
          {renderField("Products", extracted?.products)}
          {renderField("Services", extracted?.services)}
          {extracted?.keywords && extracted.keywords.length > 0 && (
            <View style={styles.reviewField}>
              <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Keywords</Text>
              <View style={styles.kwRow}>
                {extracted.keywords.map((kw, i) => (
                  <View key={i} style={[styles.kwChip, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.kwText, { color: colors.primary }]}>{kw}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!extracted?.name && !extracted?.company && !extracted?.email && (
            <Text style={[styles.noDataText, { color: colors.mutedForeground }]}>
              No details could be extracted. Try retaking the photo with better lighting.
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: colors.primary }]}
          onPress={applyToProfile}
        >
          <Feather name="check" size={18} color="#fff" />
          <Text style={styles.applyBtnText}>Apply to Profile & Create E-Card</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.retakeBtn, { borderColor: colors.border }]}
          onPress={() => {
            setStep("capture");
            setExtracted(null);
          }}
        >
          <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
          <Text style={[styles.retakeBtnText, { color: colors.mutedForeground }]}>Retake Photos</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  navTitle: { fontSize: 16, fontWeight: "600", flex: 1, textAlign: "center" },
  content: { padding: 16, gap: 16 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: { fontSize: 13, lineHeight: 19, flex: 1 },
  photoSection: { gap: 8 },
  photoLabel: { fontSize: 15, fontWeight: "600" },
  photoBtns: { flexDirection: "row", gap: 10 },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 40,
    borderRadius: 14,
  },
  photoBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: 14,
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  processBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  processBtnText: { fontWeight: "700", fontSize: 16 },
  hintText: { textAlign: "center", fontSize: 12, marginTop: 6 },
  modelBadges: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  processingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  processingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  processingTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  processingStatus: { fontSize: 14, textAlign: "center" },
  processingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  processingBadgeText: { fontSize: 12, fontWeight: "500" },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  reviewImages: { flexDirection: "row", gap: 8 },
  reviewImg: { flex: 1, height: 120, borderRadius: 12 },
  reviewSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  reviewSectionTitle: { fontSize: 16, fontWeight: "700" },
  reviewField: { gap: 2 },
  reviewLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  reviewValue: { fontSize: 14, lineHeight: 20 },
  kwRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  kwChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  kwText: { fontSize: 12, fontWeight: "500" },
  noDataText: { fontSize: 13, textAlign: "center", paddingVertical: 8 },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  retakeBtnText: { fontSize: 14, fontWeight: "500" },
});
