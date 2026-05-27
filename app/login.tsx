/**
 * Login / Register screen
 * - Email + password (two tabs: login / register)
 * - Google Sign-In via expo-auth-session (works in Expo Go!)
 *
 * Setup required:
 *   1. Add to .env:  EXPO_PUBLIC_GOOGLE_CLIENT_ID=<your web client id>
 *   2. Add expo-auth-session:  pnpm add expo-auth-session
 */
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import * as AuthHelpers from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

// Required for expo-auth-session on web
WebBrowser.maybeCompleteAuthSession();

type Tab = "login" | "register";

export default function LoginScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Google OAuth setup ─────────────────────────────────────────────────────
  // Uses expo-auth-session with Google provider — works in Expo Go via auth.expo.io proxy
  const [_request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
    // For Expo Go, the redirect is automatically proxied through auth.expo.io
    // No extra setup needed here — just add EXPO_PUBLIC_GOOGLE_CLIENT_ID to .env
  });

  // Handle Google response when it comes back
  const handleGoogleResponse = useCallback(async () => {
    if (!response || response.type !== "success") return;
    setGoogleLoading(true);
    try {
      const { id_token } = response.params;
      if (!id_token) throw new Error("No id_token in Google response");

      const result = await AuthHelpers.loginWithGoogle(id_token);
      await Auth.setSessionToken(result.sessionToken);
      await Auth.setUserInfo({
        id: result.user.id,
        openId: result.user.openId,
        name: result.user.name,
        email: result.user.email,
        loginMethod: result.user.loginMethod,
        lastSignedIn: new Date(result.user.lastSignedIn),
      });
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Google Sign-In Failed", err?.message ?? "Please try again");
    } finally {
      setGoogleLoading(false);
    }
  }, [response, router]);

  // Trigger the Google handler when response changes
  useState(() => {
    if (response?.type === "success") handleGoogleResponse();
  });

  // ── Email/password submit ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your email and password");
      return;
    }
    if (tab === "register" && !name.trim()) {
      Alert.alert("Missing name", "Please enter your name");
      return;
    }

    setLoading(true);
    try {
      const result =
        tab === "login"
          ? await AuthHelpers.loginWithEmail(email.trim(), password)
          : await AuthHelpers.registerWithEmail(email.trim(), password, name.trim());

      await Auth.setSessionToken(result.sessionToken);
      await Auth.setUserInfo({
        id: result.user.id,
        openId: result.user.openId,
        name: result.user.name,
        email: result.user.email,
        loginMethod: result.user.loginMethod,
        lastSignedIn: new Date(result.user.lastSignedIn),
      });
      router.replace("/(tabs)");
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong";
      Alert.alert(tab === "login" ? "Login Failed" : "Registration Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const isGoogleConfigured = !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <Text style={{ fontSize: 40 }}>❤️</Text>
            <Text style={{ fontSize: 28, fontWeight: "bold", marginTop: 8, color: "#111" }}>
              HealthTrack
            </Text>
            <Text style={{ fontSize: 14, color: "#888", marginTop: 4 }}>
              Track your health records
            </Text>
          </View>

          {/* Tab switcher */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#f3f4f6",
              borderRadius: 12,
              padding: 4,
              marginBottom: 24,
            }}
          >
            {(["login", "register"] as Tab[]).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: tab === t ? "#fff" : "transparent",
                  shadowColor: tab === t ? "#000" : "transparent",
                  shadowOpacity: tab === t ? 0.08 : 0,
                  shadowRadius: 4,
                  elevation: tab === t ? 2 : 0,
                }}
              >
                <Text
                  style={{
                    fontWeight: "600",
                    color: tab === t ? "#111" : "#888",
                    textTransform: "capitalize",
                  }}
                >
                  {t === "login" ? "Sign In" : "Register"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Name (register only) */}
          {tab === "register" && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 6 }}>
                Full Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                autoCapitalize="words"
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: "#111",
                  backgroundColor: "#fafafa",
                }}
              />
            </View>
          )}

          {/* Email */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 6 }}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: "#111",
                backgroundColor: "#fafafa",
              }}
            />
          </View>

          {/* Password */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 6 }}>
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={tab === "register" ? "Min 6 characters" : "Your password"}
              secureTextEntry
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: "#111",
                backgroundColor: "#fafafa",
              }}
            />
          </View>

          {/* Primary button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={{
              backgroundColor: "#2563eb",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 16,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 17 }}>
                {tab === "login" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          {isGoogleConfigured && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginVertical: 16,
                  gap: 8,
                }}
              >
                <View style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }} />
                <Text style={{ color: "#9ca3af", fontSize: 13 }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }} />
              </View>

              {/* Google button */}
              <TouchableOpacity
                onPress={() => promptAsync()}
                disabled={googleLoading}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: "#e5e7eb",
                  borderRadius: 14,
                  paddingVertical: 14,
                  backgroundColor: "#fff",
                  gap: 10,
                  opacity: googleLoading ? 0.7 : 1,
                }}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#444" />
                ) : (
                  <>
                    <Text style={{ fontSize: 18 }}>G</Text>
                    <Text style={{ fontWeight: "600", fontSize: 16, color: "#111" }}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Skip to demo */}
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            style={{ marginTop: 24, alignItems: "center" }}
          >
            <Text style={{ color: "#6b7280", fontSize: 14 }}>Skip — view demo instead</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
