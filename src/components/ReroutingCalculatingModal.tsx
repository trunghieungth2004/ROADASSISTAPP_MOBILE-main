import {ActivityIndicator, Pressable, StyleSheet, View} from "react-native";
import {AppText as Text} from "./AppText";
import {MaterialIcons} from "@expo/vector-icons";
import GlassSurface from "./GlassSurface";
import type {AppTheme} from "../theme";
import type {Strings} from "../i18n/en";

type Props = {
  t: Strings;
  theme: AppTheme;
  visible: boolean;
  topInset?: number;
  onCancel?: () => void;
};

export default function ReroutingCalculatingModal({
  t,
  theme,
  visible,
  topInset = 48,
  onCancel,
}: Props) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      {/* Background Dim */}
      <View style={[StyleSheet.absoluteFill, styles.backdrop]} />

      {/* Top Banner per Figma Image 1 Panel 3 */}
      <View style={[styles.topBannerWrap, {top: topInset}]}>
        <GlassSurface theme={theme} intensity={70} style={[styles.topBanner, {borderColor: theme.primary}]}>
          <MaterialIcons name="alt-route" size={20} color={theme.primary} />
          <Text style={[styles.topBannerText, {color: theme.text}]}>
            {t.route.reroutingSafePath}
          </Text>
        </GlassSurface>
      </View>

      {/* Center Calculating Box */}
      <View style={styles.centerContainer}>
        <GlassSurface theme={theme} intensity={80} style={[styles.calcBox, {borderColor: theme.glassBorder}]}>
          <View style={[styles.spinnerCircle, {backgroundColor: theme.primary + "18"}]}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
          <Text style={[styles.calcTitle, {color: theme.text}]}>
            {t.route.recalculatingClearance}
          </Text>
          <Text style={[styles.calcSubtitle, {color: theme.muted}]}>
            {t.route.checkingVehicleLimits}
          </Text>
          {onCancel ? (
            <Pressable
              style={[styles.cancelBtn, {borderColor: theme.border}]}
              onPress={onCancel}
              accessibilityRole="button"
            >
              <Text style={[styles.cancelBtnText, {color: theme.muted}]}>{t.common.cancel}</Text>
            </Pressable>
          ) : null}
        </GlassSurface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  topBannerWrap: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 10,
  },
  topBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 10,
    justifyContent: "center",
  },
  topBannerText: {
    fontSize: 13,
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  calcBox: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 12,
  },
  spinnerCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  calcTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  calcSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
