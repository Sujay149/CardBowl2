import { Feather } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate(): boolean {
    const newErrors: typeof errors = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = "Enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSignIn() {
    if (!validate()) return;

    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const message = err?.message || "Sign in failed. Please try again.";
      Alert.alert("Sign In Failed", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Brand */}
        <View style={styles.brandSection}>
          <View style={[styles.logoCircle, { backgroundColor: colors.navy }]}>
            <Feather name="credit-card" size={36} color={colors.gold} />
          </View>
          <Text style={[styles.appName, { color: colors.navy }]}>CardBowl</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Your smart business card manager
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={[styles.heading, { color: colors.foreground }]}>
            Welcome back
          </Text>
          <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
            Sign in to your account
          </Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
            <View
              style={[
                styles.inputRow,
                {
                  borderColor: errors.email ? colors.destructive : colors.border,
                  backgroundColor: colors.card,
                },
              ]}
            >
              <Feather
                name="mail"
                size={18}
                color={colors.mutedForeground}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!loading}
              />
            </View>
            {errors.email && (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {errors.email}
              </Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Password
            </Text>
            <View
              style={[
                styles.inputRow,
                {
                  borderColor: errors.password ? colors.destructive : colors.border,
                  backgroundColor: colors.card,
                },
              ]}
            >
              <Feather
                name="lock"
                size={18}
                color={colors.mutedForeground}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.foreground, flex: 1 }]}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errors.password)
                    setErrors((e) => ({ ...e, password: undefined }));
                }}
                placeholder="Enter your password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
                style={styles.eyeButton}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
            {errors.password && (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {errors.password}
              </Text>
            )}
          </View>

          {/* Sign In Button */}
          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: loading ? colors.mutedForeground : colors.primary,
                borderRadius: colors.radius,
              },
            ]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>

          {/* Link to Sign Up */}
          <View style={styles.linkRow}>
            <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
              Don't have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable>
                <Text style={[styles.linkAction, { color: colors.primary }]}>
                  Sign Up
                </Text>
              </Pressable>
            </Link>
          </View>
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
  brandSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  formSection: {
    flex: 1,
  },
  heading: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 28,
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
});
