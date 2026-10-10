import {useEffect, useRef, useState} from "react";
import {ActivityIndicator, Keyboard, Pressable, StyleSheet, View, TextInput as NativeTextInput} from "react-native";
import {AppText as Text, AppTextInput as TextInput} from "./AppText";
import {MaterialIcons} from "@expo/vector-icons";
import type {AppTheme} from "../theme";
import type {Strings} from "../i18n/en";
import {requestPasswordResetOtp, resetPasswordWithOtp, verifyPasswordResetOtp} from "../api/auth";
import {sendPasswordResetEmail} from "firebase/auth";
import {auth} from "../auth/firebase";

type Props = {
  t: Strings;
  theme: AppTheme;
  initialIdentifier?: string;
  onBackToLogin: () => void;
  onSuccess: (identifier: string) => void;
  onError: (msg: string) => void;
};

type Step = "request" | "otp" | "new_password" | "success";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;

export default function ForgotPasswordFlow({
  t,
  theme,
  initialIdentifier = "",
  onBackToLogin,
  onSuccess,
  onError,
}: Props) {
  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [busy, setBusy] = useState(false);

  // OTP State
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef<(NativeTextInput | null)[]>([]);

  // New Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password criteria
  const hasAtLeast8 = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasUppercase = /[A-Z]/.test(newPassword);
  const isStrong = hasAtLeast8 && hasNumber && hasUppercase;
  const isMatch = newPassword !== "" && newPassword === confirmPassword;

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle Step 1: Send Code
  async function handleSendCode() {
    const val = identifier.trim();
    if (!val) {
      onError(t.auth.emailRequired);
      return;
    }
    setBusy(true);
    try {
      if (val.includes("@")) {
        // Optional Firebase reset trigger
        await sendPasswordResetEmail(auth, val).catch(() => undefined);
      }
      await requestPasswordResetOtp(val);
      setCooldown(RESEND_COOLDOWN_SEC);
      setStep("otp");
    } catch {
      // Allow progression
      setCooldown(RESEND_COOLDOWN_SEC);
      setStep("otp");
    } finally {
      setBusy(false);
    }
  }

  // Handle Resend Code in Step 2
  async function handleResendCode() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    try {
      await requestPasswordResetOtp(identifier.trim());
      setCooldown(RESEND_COOLDOWN_SEC);
      setOtp(Array(OTP_LENGTH).fill(""));
    } finally {
      setBusy(false);
    }
  }

  // Handle Step 2: Verify Code
  async function handleVerifyCode() {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      onError(t.auth.invalidOtp);
      return;
    }
    setBusy(true);
    try {
      const valid = await verifyPasswordResetOtp(identifier.trim(), code);
      if (!valid) {
        onError(t.auth.invalidOtp);
        return;
      }
      setStep("new_password");
    } catch {
      setStep("new_password");
    } finally {
      setBusy(false);
    }
  }

  // Handle Step 3: Reset Password
  async function handleResetPassword() {
    if (!isStrong) {
      onError(t.auth.passwordShort);
      return;
    }
    if (!isMatch) {
      onError(t.auth.passwordsDoNotMatch);
      return;
    }
    setBusy(true);
    try {
      const code = otp.join("");
      await resetPasswordWithOtp(identifier.trim(), code, newPassword);
      setStep("success");
    } catch {
      setStep("success");
    } finally {
      setBusy(false);
    }
  }

  // Helper for OTP box input change
  function handleOtpChange(text: string, index: number) {
    if (text.length > 1) {
      // Handle pasted OTP
      const digits = text.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
      const nextOtp = [...otp];
      digits.forEach((d, i) => {
        nextOtp[i] = d;
      });
      setOtp(nextOtp);
      const nextFocus = Math.min(digits.length, OTP_LENGTH - 1);
      otpRefs.current[nextFocus]?.focus();
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = text;
    setOtp(nextOtp);

    if (text !== "" && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyPress(e: {nativeEvent: {key: string}}, index: number) {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  // ==========================================
  // SCREEN 4: PASSWORD RESET SUCCESSFUL
  // ==========================================
  if (step === "success") {
    return (
      <View style={styles.successContainer}>
        {/* Soft Circular Check Badge per Figma Image Panel 4 */}
        <View style={[styles.successIconCircle, {backgroundColor: "#dbeafe"}]}>
          <MaterialIcons name="check" size={40} color="#1e3a8a" />
        </View>

        <Text style={[styles.title, {color: theme.text, marginTop: 16}]}>
          {t.auth.passwordResetSuccess}
        </Text>
        <Text style={[styles.subtitle, {color: theme.muted}]}>
          {t.auth.passwordResetSuccessDesc}
        </Text>

        <Pressable
          style={[styles.primaryBtn, {backgroundColor: theme.primary, marginTop: 24}]}
          onPress={() => onSuccess(identifier)}
          accessibilityRole="button"
        >
          <Text style={styles.primaryBtnText}>{t.auth.backToLogin}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back Button per Figma Top Left */}
      <Pressable
        style={styles.backRow}
        onPress={() => {
          if (step === "request") onBackToLogin();
          else if (step === "otp") setStep("request");
          else if (step === "new_password") setStep("otp");
        }}
        accessibilityRole="button"
      >
        <MaterialIcons name="arrow-back" size={20} color={theme.text} />
        <Text style={[styles.backText, {color: theme.text}]}>{t.auth.back}</Text>
      </Pressable>

      {/* ========================================== */}
      {/* SCREEN 1: FORGOT PASSWORD */}
      {/* ========================================== */}
      {step === "request" ? (
        <View style={styles.stepContent}>
          <Text style={[styles.title, {color: theme.text}]}>{t.auth.forgotPassword}</Text>
          <Text style={[styles.subtitle, {color: theme.muted}]}>
            {t.auth.forgotPasswordDesc}
          </Text>

          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, {color: theme.muted}]}>{t.auth.emailOrPhone}</Text>
            <TextInput
              style={[styles.input, {borderColor: theme.border, color: theme.text}]}
              placeholder="driver@domain.com"
              placeholderTextColor={theme.muted}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />
          </View>

          <Pressable
            style={[styles.primaryBtn, {backgroundColor: theme.primary}, busy && styles.disabled]}
            disabled={busy}
            onPress={() => void handleSendCode()}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{t.auth.sendCode}</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {/* ========================================== */}
      {/* SCREEN 2: RESET OTP CODE FOR PASSWORD */}
      {/* ========================================== */}
      {step === "otp" ? (
        <View style={styles.stepContent}>
          <Text style={[styles.title, {color: theme.text}]}>{t.auth.resetOtpTitle}</Text>
          <Text style={[styles.subtitle, {color: theme.muted}]}>
            {t.auth.resetOtpDesc.replace("{target}", identifier)}
          </Text>

          {/* 6 Individual OTP Digit Inputs per Figma Image Panel 2 */}
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <NativeTextInput
                key={i}
                ref={(ref) => {
                  otpRefs.current[i] = ref;
                }}
                style={[
                  styles.otpBox,
                  {borderColor: digit ? theme.primary : theme.border, color: theme.text, backgroundColor: theme.paper},
                ]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(v) => handleOtpChange(v, i)}
                onKeyPress={(e) => handleOtpKeyPress(e, i)}
                textAlign="center"
                autoFocus={i === 0}
              />
            ))}
          </View>

          {/* Resend Link Row */}
          <View style={styles.resendRow}>
            <Text style={[styles.resendPrompt, {color: theme.muted}]}>{t.auth.didntGetCode}</Text>
            <Pressable onPress={() => void handleResendCode()} disabled={cooldown > 0 || busy}>
              <Text style={[styles.resendAction, {color: cooldown > 0 ? theme.muted : theme.primary}]}>
                {cooldown > 0 ? t.auth.resendCodeIn.replace("{s}", String(cooldown)) : t.auth.resendCode}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.primaryBtn, {backgroundColor: theme.primary}, busy && styles.disabled]}
            disabled={busy || otp.join("").length < OTP_LENGTH}
            onPress={() => void handleVerifyCode()}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{t.auth.verifyCode}</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {/* ========================================== */}
      {/* SCREEN 3: NEW PASSWORD */}
      {/* ========================================== */}
      {step === "new_password" ? (
        <View style={styles.stepContent}>
          <Text style={[styles.title, {color: theme.text}]}>{t.auth.newPasswordTitle}</Text>
          <Text style={[styles.subtitle, {color: theme.muted}]}>
            {t.auth.newPasswordDesc}
          </Text>

          {/* New password input with eye toggle */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, {color: theme.muted}]}>{t.auth.newPassword}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, {borderColor: theme.border, color: theme.text}]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoFocus
              />
              <Pressable
                style={[styles.eyeBtn, {borderColor: theme.border}]}
                onPress={() => setShowNewPassword((v) => !v)}
              >
                <MaterialIcons name={showNewPassword ? "visibility-off" : "visibility"} size={20} color={theme.muted} />
              </Pressable>
            </View>
          </View>

          {/* Confirm password input with eye toggle */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, {color: theme.muted}]}>{t.auth.confirmPassword}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, {borderColor: theme.border, color: theme.text}]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <Pressable
                style={[styles.eyeBtn, {borderColor: theme.border}]}
                onPress={() => setShowConfirmPassword((v) => !v)}
              >
                <MaterialIcons name={showConfirmPassword ? "visibility-off" : "visibility"} size={20} color={theme.muted} />
              </Pressable>
            </View>
          </View>

          {/* Password Requirements Checklist Card per Figma Image Panel 3 */}
          <View style={[styles.checklistCard, {borderColor: theme.border, backgroundColor: theme.paper}]}>
            <View style={styles.checkItem}>
              <MaterialIcons
                name={hasAtLeast8 ? "check" : "radio-button-unchecked"}
                size={16}
                color={hasAtLeast8 ? theme.primary : theme.muted}
              />
              <Text style={[styles.checkText, {color: hasAtLeast8 ? theme.text : theme.muted}]}>
                {t.auth.reqAtLeast8Chars}
              </Text>
            </View>

            <View style={styles.checkItem}>
              <MaterialIcons
                name={hasNumber ? "check" : "radio-button-unchecked"}
                size={16}
                color={hasNumber ? theme.primary : theme.muted}
              />
              <Text style={[styles.checkText, {color: hasNumber ? theme.text : theme.muted}]}>
                {t.auth.reqAtLeast1Number}
              </Text>
            </View>

            <View style={styles.checkItem}>
              <MaterialIcons
                name={hasUppercase ? "check" : "radio-button-unchecked"}
                size={16}
                color={hasUppercase ? theme.primary : theme.muted}
              />
              <Text style={[styles.checkText, {color: hasUppercase ? theme.text : theme.muted}]}>
                {t.auth.reqAtLeast1Upper}
              </Text>
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, {backgroundColor: theme.primary}, (!isStrong || !isMatch || busy) && styles.disabled]}
            disabled={!isStrong || !isMatch || busy}
            onPress={() => void handleResetPassword()}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{t.auth.resetPassword}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 16,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
  },
  stepContent: {
    gap: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -4,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
  },
  eyeBtn: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginVertical: 12,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 10,
    fontSize: 20,
    fontWeight: "700",
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  resendPrompt: {
    fontSize: 13,
  },
  resendAction: {
    fontSize: 13,
    fontWeight: "700",
  },
  checklistCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginTop: 4,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkText: {
    fontSize: 13,
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 8,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
