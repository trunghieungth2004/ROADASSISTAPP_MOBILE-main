import {useState} from "react";
import {ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, useColorScheme} from "react-native";
import {AppText as Text, AppTextInput as TextInput} from "../components/AppText";
import {MaterialIcons} from "@expo/vector-icons";
import {signInWithEmailAndPassword} from "firebase/auth";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {auth} from "../auth/firebase";
import {register, requestPasswordResetOtp, verifyPasswordResetOtp} from "../api/auth";
import {toMessage} from "../api/client";
import {useAuth} from "../context/AuthContext";
import {useProfile} from "../context/ProfileContext";
import {useStrings} from "../context/LanguageContext";
import {darkTheme, lightTheme} from "../theme";
import ScreenContainer from "../components/ScreenContainer";
import Snack from "../components/Snack";
import {SNACK_GAP} from "../components/snackOffset";
import ForgotPasswordFlow from "../components/ForgotPasswordFlow";
import AccountVerificationFlow from "../components/AccountVerificationFlow";

type AuthMode = "login" | "register" | "forgot" | "verify_account";

export default function LoginScreen() {
  const {t} = useStrings();
  const {signIn} = useAuth();
  const {refresh} = useProfile();
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();

  const [mode, setModeState] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  const [inlineLoginError, setInlineLoginError] = useState<string | null>(null);
  const [errorSnack, setErrorSnack] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Cached credentials for auto login after verification
  const [registeredCreds, setRegisteredCreds] = useState<{email: string; pass: string} | null>(null);

  function switchTab(next: "login" | "register"): void {
    setInlineLoginError(null);
    setErrorSnack(null);
    setShowPassword(false);
    setModeState(next);
  }

  async function handleLogin() {
    setInlineLoginError(null);
    setErrorSnack(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setInlineLoginError(t.auth.loginFailsMsg);
      return;
    }

    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const token = await cred.user.getIdToken();
      await signIn(cred.user.uid, token);
      await refresh();
    } catch {
      // Per Figma Screen 2: LOGIN FAILS displays inline error
      setInlineLoginError(t.auth.loginFailsMsg);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister() {
    setInlineLoginError(null);
    setErrorSnack(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorSnack(t.auth.emailRequired);
      return;
    }
    if (password.length < 8) {
      setErrorSnack(t.auth.min8CharsHint);
      return;
    }

    setBusy(true);
    try {
      await register({
        email: trimmedEmail,
        password,
        displayName: displayName.trim() || undefined,
        phone: phone.trim() || "0900000000",
      });
      // Save credentials for auto login on Screen 6
      setRegisteredCreds({email: trimmedEmail, pass: password});
      // Transition to Screen 4: VERIFY ACCOUNT
      setModeState("verify_account");
    } catch (err) {
      setErrorSnack(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoLoginAfterVerification() {
    if (!registeredCreds) {
      setModeState("login");
      return;
    }
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, registeredCreds.email, registeredCreds.pass);
      const token = await cred.user.getIdToken();
      await signIn(cred.user.uid, token);
      await refresh();
    } catch (err) {
      setModeState("login");
      setErrorSnack(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.avoid}>
        <ScrollView
          contentContainerStyle={[styles.container, {backgroundColor: theme.background}]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ======================================================== */}
          {/* FORGOT PASSWORD FLOW */}
          {/* ======================================================== */}
          {mode === "forgot" ? (
            <ForgotPasswordFlow
              t={t}
              theme={theme}
              initialIdentifier={email}
              onBackToLogin={() => setModeState("login")}
              onSuccess={(id) => {
                if (id) setEmail(id);
                setModeState("login");
              }}
              onError={(msg) => setErrorSnack(msg)}
            />
          ) : mode === "verify_account" ? (
            /* ======================================================== */
            /* SCREENS 4, 5, 6: VERIFY ACCOUNT & ACCOUNT CREATED */
            /* ======================================================== */
            <AccountVerificationFlow
              t={t}
              theme={theme}
              identifier={email}
              onBack={() => setModeState("register")}
              onAutoLogin={() => void handleAutoLoginAfterVerification()}
              onResendOtp={async () => {
                await requestPasswordResetOtp(email.trim());
              }}
              onVerifyOtp={async (code) => {
                return await verifyPasswordResetOtp(email.trim(), code);
              }}
            />
          ) : (
            /* ======================================================== */
            /* SCREENS 1, 2, 3: LOGIN / LOGIN FAILS / SIGN UP */
            /* ======================================================== */
            <View style={styles.mainAuthWrap}>
              {/* Header Title per Figma: "Welcome Back" or "Let's Get Started" */}
              <Text style={[styles.mainTitle, {color: theme.text}]}>
                {mode === "login" ? t.auth.welcomeBack : t.auth.letsGetStarted}
              </Text>

              {/* Tab Header with clean underline per Figma */}
              <View style={[styles.tabBar, {borderColor: theme.border}]}>
                <Pressable
                  style={[styles.tabBtn, mode === "login" && styles.tabBtnActive]}
                  onPress={() => switchTab("login")}
                  accessibilityRole="tab"
                  accessibilityState={{selected: mode === "login"}}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {color: mode === "login" ? theme.text : theme.muted, fontWeight: mode === "login" ? "800" : "500"},
                    ]}
                  >
                    {t.auth.tabLogin}
                  </Text>
                  {mode === "login" ? <View style={[styles.tabUnderline, {backgroundColor: theme.primary}]} /> : null}
                </Pressable>

                <Pressable
                  style={[styles.tabBtn, mode === "register" && styles.tabBtnActive]}
                  onPress={() => switchTab("register")}
                  accessibilityRole="tab"
                  accessibilityState={{selected: mode === "register"}}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {color: mode === "register" ? theme.text : theme.muted, fontWeight: mode === "register" ? "800" : "500"},
                    ]}
                  >
                    {t.auth.tabSignup}
                  </Text>
                  {mode === "register" ? <View style={[styles.tabUnderline, {backgroundColor: theme.primary}]} /> : null}
                </Pressable>
              </View>

              {/* Form Inputs */}
              <View style={styles.formCol}>
                {/* Full Name in Signup mode */}
                {mode === "register" ? (
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.inputLabel, {color: theme.muted}]}>{t.auth.fullName}</Text>
                    <TextInput
                      style={[styles.input, {borderColor: theme.border, color: theme.text}]}
                      placeholder="Username"
                      placeholderTextColor={theme.muted}
                      value={displayName}
                      onChangeText={setDisplayName}
                      autoComplete="name"
                    />
                  </View>
                ) : null}

                {/* Email or Mobile no */}
                <View style={styles.fieldBlock}>
                  <Text style={[styles.inputLabel, {color: theme.muted}]}>{t.auth.emailOrMobile}</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: inlineLoginError ? theme.danger : theme.border,
                        color: theme.text,
                        borderStyle: inlineLoginError ? "dashed" : "solid",
                      },
                    ]}
                    placeholder="user@domain.com"
                    placeholderTextColor={theme.muted}
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (inlineLoginError) setInlineLoginError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Password Input with eye toggle */}
                <View style={styles.fieldBlock}>
                  <Text style={[styles.inputLabel, {color: theme.muted}]}>{t.auth.password}</Text>
                  <View
                    style={[
                      styles.passwordInputWrap,
                      {
                        borderColor: inlineLoginError ? theme.danger : theme.border,
                        borderStyle: inlineLoginError ? "dashed" : "solid",
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.passwordField, {color: theme.text}]}
                      placeholder="••••••••••••"
                      placeholderTextColor={theme.muted}
                      value={password}
                      onChangeText={(val) => {
                        setPassword(val);
                        if (inlineLoginError) setInlineLoginError(null);
                      }}
                      secureTextEntry={!showPassword}
                    />
                    <Pressable
                      style={styles.eyeIconBtn}
                      onPress={() => setShowPassword((v) => !v)}
                      accessibilityRole="button"
                    >
                      <MaterialIcons
                        name={showPassword ? "visibility-off" : "visibility"}
                        size={20}
                        color={theme.muted}
                      />
                    </Pressable>
                  </View>

                  {/* Password hint for Signup */}
                  {mode === "register" ? (
                    <Text style={[styles.fieldHint, {color: theme.muted}]}>
                      {t.auth.min8CharsHint}
                    </Text>
                  ) : null}
                </View>

                {/* Screen 2: Inline Error Alert directly under inputs */}
                {inlineLoginError ? (
                  <View style={styles.inlineLoginErrorRow}>
                    <MaterialIcons name="warning-amber" size={16} color={theme.danger} />
                    <Text style={[styles.inlineLoginErrorText, {color: theme.danger}]}>
                      {inlineLoginError}
                    </Text>
                  </View>
                ) : null}

                {/* Forgot Password link in Login mode */}
                {mode === "login" ? (
                  <Pressable
                    style={styles.forgotBtn}
                    onPress={() => setModeState("forgot")}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.forgotText, {color: theme.muted}]}>
                      {t.auth.forgotPasswordPrompt}
                    </Text>
                  </Pressable>
                ) : null}

                {/* Primary Action Button */}
                <Pressable
                  style={[styles.primaryBtn, {backgroundColor: theme.primary}, busy && styles.disabled]}
                  disabled={busy}
                  onPress={() => (mode === "login" ? void handleLogin() : void handleRegister())}
                  accessibilityRole="button"
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {mode === "login" ? t.auth.tabLogin : t.auth.tabSignup}
                    </Text>
                  )}
                </Pressable>

                {/* Terms and Policies footer in Signup mode per Figma Screen 3 */}
                {mode === "register" ? (
                  <Text style={[styles.agreementText, {color: theme.muted}]}>
                    {t.auth.termsPolicyAgreement}
                  </Text>
                ) : null}

                {/* Divider: "or continue with" and Social Icons in Login mode per Figma */}
                {mode === "login" ? (
                  <View style={styles.socialSection}>
                    <View style={styles.dividerRow}>
                      <View style={[styles.dividerLine, {backgroundColor: theme.border}]} />
                      <Text style={[styles.dividerText, {color: theme.muted}]}>
                        {t.auth.orContinueWith}
                      </Text>
                      <View style={[styles.dividerLine, {backgroundColor: theme.border}]} />
                    </View>

                    <View style={styles.socialIconsRow}>
                      {/* Google */}
                      <Pressable style={[styles.socialCircle, {borderColor: theme.border}]}>
                        <Text style={[styles.googleLetter, {color: "#ea4335"}]}>G</Text>
                      </Pressable>

                      {/* Zalo */}
                      <Pressable style={[styles.socialCircle, {borderColor: theme.border}]}>
                        <Text style={[styles.zaloText, {color: "#0068ff"}]}>Zalo</Text>
                      </Pressable>

                      {/* Facebook */}
                      <Pressable style={[styles.socialCircle, {borderColor: theme.border}]}>
                        <Text style={[styles.fbLetter, {color: "#1877f2"}]}>f</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Snack
        message={errorSnack}
        severity="error"
        sticky
        bottom={insets.bottom + SNACK_GAP}
        dangerColor={theme.danger}
        onHide={() => setErrorSnack(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  avoid: {flex: 1},
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  mainAuthWrap: {
    width: "100%",
    gap: 16,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 4,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    marginBottom: 10,
  },
  tabBtn: {
    paddingVertical: 10,
    marginRight: 28,
    alignItems: "center",
  },
  tabBtnActive: {},
  tabText: {
    fontSize: 16,
  },
  tabUnderline: {
    position: "absolute",
    bottom: -1.5,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
  formCol: {
    gap: 14,
  },
  fieldBlock: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1.2,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  passwordInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  passwordField: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  eyeIconBtn: {
    padding: 4,
  },
  fieldHint: {
    fontSize: 11,
    marginTop: 2,
  },
  inlineLoginErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -4,
  },
  inlineLoginErrorText: {
    fontSize: 13,
    fontWeight: "600",
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
  agreementText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 8,
  },
  socialSection: {
    marginTop: 24,
    gap: 16,
    alignItems: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
  },
  socialIconsRow: {
    flexDirection: "row",
    gap: 18,
    justifyContent: "center",
  },
  socialCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  googleLetter: {
    fontSize: 20,
    fontWeight: "800",
  },
  zaloText: {
    fontSize: 11,
    fontWeight: "800",
  },
  fbLetter: {
    fontSize: 20,
    fontWeight: "800",
  },
});
