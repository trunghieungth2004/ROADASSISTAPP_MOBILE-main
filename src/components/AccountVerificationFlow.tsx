import {useEffect, useRef, useState} from "react";
import {ActivityIndicator, Pressable, StyleSheet, View, TextInput as NativeTextInput} from "react-native";
import {AppText as Text} from "./AppText";
import {MaterialIcons} from "@expo/vector-icons";
import type {AppTheme} from "../theme";
import type {Strings} from "../i18n/en";

type Props = {
  t: Strings;
  theme: AppTheme;
  identifier: string;
  onBack: () => void;
  onAutoLogin: () => void;
  onResendOtp: () => Promise<void>;
  onVerifyOtp: (code: string) => Promise<boolean>;
};

const OTP_LENGTH = 6;
const COOLDOWN_SEC = 45;

export default function AccountVerificationFlow({
  t,
  theme,
  identifier,
  onBack,
  onAutoLogin,
  onResendOtp,
  onVerifyOtp,
}: Props) {
  const [step, setStep] = useState<"verify" | "created">("verify");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(COOLDOWN_SEC);
  const otpRefs = useRef<(NativeTextInput | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  function handleOtpChange(text: string, index: number) {
    setErrorMsg(null);
    if (text.length > 1) {
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

  async function handleVerify() {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      setErrorMsg(t.auth.verifyAccountFailsMsg);
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const valid = await onVerifyOtp(code);
      if (!valid) {
        setErrorMsg(t.auth.verifyAccountFailsMsg);
        return;
      }
      setStep("created");
    } catch {
      setErrorMsg(t.auth.verifyAccountFailsMsg);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await onResendOtp();
      setCooldown(COOLDOWN_SEC);
      setOtp(Array(OTP_LENGTH).fill(""));
    } finally {
      setBusy(false);
    }
  }

  // ==========================================
  // SCREEN 6: ACCOUNT CREATED! (CELEBRATION)
  // ==========================================
  if (step === "created") {
    return (
      <View style={styles.createdContainer}>
        {/* Soft Circular Check Badge per Figma Image Panel 6 */}
        <View style={[styles.successIconCircle, {backgroundColor: "#dbeafe"}]}>
          <MaterialIcons name="check" size={42} color="#1e3a8a" />
        </View>

        <Text style={[styles.title, {color: theme.text, marginTop: 16, textAlign: "center"}]}>
          {t.auth.accountCreatedTitle}
        </Text>
        <Text style={[styles.subtitle, {color: theme.muted, textAlign: "center", paddingHorizontal: 12}]}>
          {t.auth.accountCreatedSubtitle}
        </Text>

        <Pressable
          style={[styles.primaryBtn, {backgroundColor: theme.primary, marginTop: 24}]}
          onPress={onAutoLogin}
          accessibilityRole="button"
        >
          <Text style={styles.primaryBtnText}>{t.auth.continueAutoLogin}</Text>
        </Pressable>
      </View>
    );
  }

  // ==========================================
  // SCREEN 4 & 5: VERIFY ACCOUNT / VERIFY ACCOUNT FAILS
  // ==========================================
  const isFailed = !!errorMsg;

  return (
    <View style={styles.container}>
      {/* Back Button per Figma Top Left */}
      <Pressable style={styles.backRow} onPress={onBack} accessibilityRole="button">
        <MaterialIcons name="arrow-back" size={20} color={theme.text} />
        <Text style={[styles.backText, {color: theme.text}]}>{t.auth.back}</Text>
      </Pressable>

      <Text style={[styles.title, {color: theme.text}]}>{t.auth.verifyAccountTitle}</Text>
      <Text style={[styles.subtitle, {color: theme.muted}]}>
        {t.auth.verifyAccountSubtitle.replace("{target}", identifier)}
      </Text>

      {/* 6 Individual OTP Digit Boxes per Figma Image Panel 4 & 5 */}
      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <NativeTextInput
            key={i}
            ref={(ref) => {
              otpRefs.current[i] = ref;
            }}
            style={[
              styles.otpBox,
              {
                borderColor: isFailed ? theme.danger : digit ? theme.primary : theme.border,
                color: theme.text,
                backgroundColor: theme.paper,
              },
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

      {/* Screen 5: Inline Error Alert directly under OTP */}
      {errorMsg ? (
        <View style={styles.inlineErrorRow}>
          <MaterialIcons name="warning-amber" size={16} color={theme.danger} />
          <Text style={[styles.inlineErrorText, {color: theme.danger}]}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Resend Link Row */}
      <View style={styles.resendRow}>
        <Text style={[styles.resendPrompt, {color: theme.muted}]}>{t.auth.didntReceiveCode}</Text>
        <Pressable onPress={() => void handleResend()} disabled={cooldown > 0 || busy}>
          <Text style={[styles.resendAction, {color: cooldown > 0 ? theme.muted : theme.primary}]}>
            {cooldown > 0
              ? t.auth.resendCodeWithTimer.replace("{time}", formatTimer(cooldown))
              : t.auth.resendCode}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.primaryBtn, {backgroundColor: theme.primary}, busy && styles.disabled]}
        disabled={busy || otp.join("").length < OTP_LENGTH}
        onPress={() => void handleVerify()}
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>{t.auth.verifyAccountBtn}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 14,
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
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -4,
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
    borderRadius: 12,
    fontSize: 20,
    fontWeight: "700",
  },
  inlineErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -4,
    marginBottom: 4,
  },
  inlineErrorText: {
    fontSize: 13,
    fontWeight: "600",
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
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
  createdContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 8,
    width: "100%",
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
