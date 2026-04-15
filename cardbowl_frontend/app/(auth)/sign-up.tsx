import { Feather } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
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

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiPublicGet } from "@/lib/api";

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function SignUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stats = await apiPublicGet<{ totalUsers?: number }>("/auth/stats");
        if (alive && typeof stats?.totalUsers === "number") {
          setTotalUsers(stats.totalUsers);
        }
      } catch {
        // Keep signup flow resilient if stats endpoint is unavailable.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = "Enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function clearError(field: keyof FormErrors) {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSignUp() {
    if (!validate()) return;

    setApiError(null);
    setLoading(true);
    try {
      await signUp({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        mobileNo: mobileNo.trim() || undefined,
      });
    } catch (err: any) {
      const msg = err?.message || "Sign up failed. Please check your connection and try again.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  function renderField(config: {
    label: string;
    value: string;
    onChange: (t: string) => void;
    placeholder: string;
    icon: keyof typeof Feather.glyphMap;
    error?: string;
    fieldKey: keyof FormErrors;
    secureTextEntry?: boolean;
    autoCapitalize?: "none" | "sentences" | "words";
    keyboardType?: "default" | "email-address" | "phone-pad";
    autoComplete?: string;
    textContentType?: string;
    optional?: boolean;
  }) {
    return (
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {config.label}
          {config.optional && (
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
              {" "}(optional)
            </Text>
          )}
        </Text>
        <View
          style={[
            styles.inputRow,
            {
              borderColor: config.error ? colors.destructive : colors.border,
              backgroundColor: colors.card,
            },
          ]}
        >
          <Feather
            name={config.icon}
            size={18}
            color={colors.mutedForeground}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            value={config.value}
            onChangeText={(t) => {
              config.onChange(t);
              clearError(config.fieldKey);
            }}
            placeholder={config.placeholder}
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={config.secureTextEntry && !showPassword}
            autoCapitalize={config.autoCapitalize ?? "sentences"}
            keyboardType={config.keyboardType}
            editable={!loading}
          />
          {config.secureTextEntry && (
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
          )}
        </View>
        {config.error && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {config.error}
          </Text>
        )}
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
        {/* Logo */}
        <View style={styles.brandSection}>
          <View style={[styles.logoCircle, { backgroundColor: colors.navy }]}>
            <Feather name="credit-card" size={32} color={colors.gold} />
          </View>
          <Text style={[styles.appName, { color: colors.navy }]}>CardBowl</Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={[styles.heading, { color: colors.foreground }]}>
            Create account
          </Text>
          <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
            Start managing your business cards smartly
          </Text>
          {typeof totalUsers === "number" ? (
            <Text style={[styles.userCountText, { color: colors.primary }]}> 
              Join {totalUsers.toLocaleString()} registered users
            </Text>
          ) : null}

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

          {/* Name row */}
          <View style={styles.nameRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              {renderField({
                label: "First Name",
                value: firstName,
                onChange: setFirstName,
                placeholder: "John",
                icon: "user",
                error: errors.firstName,
                fieldKey: "firstName",
                autoCapitalize: "words",
              })}
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              {renderField({
                label: "Last Name",
                value: lastName,
                onChange: setLastName,
                placeholder: "Doe",
                icon: "user",
                fieldKey: "lastName",
                autoCapitalize: "words",
                optional: true,
              })}
            </View>
          </View>

          {renderField({
            label: "Email",
            value: email,
            onChange: setEmail,
            placeholder: "you@example.com",
            icon: "mail",
            error: errors.email,
            fieldKey: "email",
            autoCapitalize: "none",
            keyboardType: "email-address",
          })}

          {renderField({
            label: "Mobile",
            value: mobileNo,
            onChange: setMobileNo,
            placeholder: "+91 98765 43210",
            icon: "phone",
            fieldKey: "firstName",
            keyboardType: "phone-pad",
            optional: true,
          })}

          {renderField({
            label: "Password",
            value: password,
            onChange: setPassword,
            placeholder: "Min. 6 characters",
            icon: "lock",
            error: errors.password,
            fieldKey: "password",
            secureTextEntry: true,
            autoCapitalize: "none",
          })}

          {renderField({
            label: "Confirm Password",
            value: confirmPassword,
            onChange: setConfirmPassword,
            placeholder: "Re-enter password",
            icon: "lock",
            error: errors.confirmPassword,
            fieldKey: "confirmPassword",
            secureTextEntry: true,
            autoCapitalize: "none",
          })}

          {/* Sign Up Button */}
          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: loading ? colors.mutedForeground : colors.primary,
                borderRadius: colors.radius,
              },
            ]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </Pressable>

          {/* Link to Sign In */}
          <View style={styles.linkRow}>
            <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable>
                <Text style={[styles.linkAction, { color: colors.primary }]}>
                  Sign In
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
    marginBottom: 28,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  appName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
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
    marginBottom: 6,
  },
  userCountText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 18,
  },
  nameRow: {
    flexDirection: "row",
  },
  fieldGroup: {
    marginBottom: 16,
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
