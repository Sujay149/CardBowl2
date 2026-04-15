import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiPublicPost } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

interface FormErrors {
  email?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    const trimmed = email.trim();
    if (!trimmed) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      newErrors.email = "Enter a valid email address";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function clearError(field: keyof FormErrors) {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
    if (apiError) setApiError(null);
  }

  async function handleReset() {
    if (!validate()) return;

    setApiError(null);
    setLoading(true);
    try {
      await apiPublicPost("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setApiError(err?.message || "Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View style={[styles.container, styles.successContainer, { backgroundColor: colors.background, paddingTop: insets.top + 80 }]}>
        <View style={[styles.successCircle, { backgroundColor: colors.success + "20" }]}>
          <Feather name="check-circle" size={48} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>
          Password Reset
        </Text>
        <Text style={[styles.successText, { color: colors.mutedForeground }]}>
          Your password has been updated successfully. You can now sign in with your new password.
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={() => router.replace("/(auth)/sign-in")}
        >
          <Text style={styles.buttonText}>Go to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="key" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.heading, { color: colors.foreground }]}>
            Reset Password
          </Text>
          <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
            Enter your email and choose a new password
          </Text>
        </View>

        {/* API Error Banner */}
        {apiError && (
          <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}>
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[styles.errorBannerText, { color: colors.destructive }]}>
              {apiError}
            </Text>
            <Pressable onPress={() => setApiError(null)} hitSlop={8}>
              <Feather name="x" size={16} color={colors.destructive} />
            </Pressable>
          </View>
        )}

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
          <View style={[styles.inputRow, { borderColor: errors.email ? colors.destructive : colors.border, backgroundColor: colors.card }]}>
            <Feather name="mail" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={email}
              onChangeText={(t) => { setEmail(t); clearError("email"); }}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>
          {errors.email && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.email}</Text>}
        </View>

        {/* New Password */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>New Password</Text>
          <View style={[styles.inputRow, { borderColor: errors.newPassword ? colors.destructive : colors.border, backgroundColor: colors.card }]}>
            <Feather name="lock" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); clearError("newPassword"); }}
              placeholder="Min. 6 characters"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8} style={styles.eyeButton}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {errors.newPassword && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.newPassword}</Text>}
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Confirm New Password</Text>
          <View style={[styles.inputRow, { borderColor: errors.confirmPassword ? colors.destructive : colors.border, backgroundColor: colors.card }]}>
            <Feather name="lock" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); clearError("confirmPassword"); }}
              placeholder="Re-enter new password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>
          {errors.confirmPassword && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.confirmPassword}</Text>}
        </View>

        {/* Reset Button */}
        <Pressable
          style={[styles.button, { backgroundColor: loading ? colors.mutedForeground : colors.primary, borderRadius: colors.radius }]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </Pressable>

        {/* Back to sign in */}
        <View style={styles.linkRow}>
          <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
            Remember your password?{" "}
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text style={[styles.linkAction, { color: colors.primary }]}>Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  backBtn: {
    marginBottom: 16,
    width: 40,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heading: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
    marginLeft: 4,
  },
  button: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  linkText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  linkAction: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  successContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
});
