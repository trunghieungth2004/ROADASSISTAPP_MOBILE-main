import {Pressable, StyleSheet, View} from "react-native";
import {AppText as Text} from "./AppText";
import {MaterialIcons} from "@expo/vector-icons";
import GlassSurface from "./GlassSurface";
import Overlay from "./overlay/Overlay";
import type {AppTheme} from "../theme";
import type {Strings} from "../i18n/en";

type Props = {
  t: Strings;
  theme: AppTheme;
  visible: boolean;
  destLabel?: string | null;
  distanceMeters: number;
  durationSeconds: number;
  hazardsAvoidedCount: number;
  avgSpeedKmh?: number | null;
  onDone: () => void;
};

export default function TripFinishedModal({
  t,
  theme,
  visible,
  destLabel,
  distanceMeters,
  durationSeconds,
  hazardsAvoidedCount,
  avgSpeedKmh,
  onDone,
}: Props) {
  if (!visible) return null;

  const distKm = (distanceMeters / 1000).toFixed(1);
  const durMin = Math.max(1, Math.round(durationSeconds / 60));
  
  // Calculate average speed if not provided
  const speed = avgSpeedKmh !== null && avgSpeedKmh !== undefined && avgSpeedKmh > 0
    ? Math.round(avgSpeedKmh)
    : Math.round((distanceMeters / 1000) / Math.max(0.016, durationSeconds / 3600));

  return (
    <Overlay
      visible={visible}
      variant="dialog"
      title=""
      closeLabel={t.common.close}
      onClose={onDone}
    >
      <View style={styles.container}>
        {/* Large Green Check Circle per Figma Image 3 Panel 2 */}
        <View style={styles.badgeWrap}>
          <View style={[styles.outerCheckRing, {backgroundColor: theme.primary + "20"}]}>
            <View style={[styles.innerCheckCircle, {backgroundColor: theme.primary}]}>
              <MaterialIcons name="check" size={44} color="#fff" />
            </View>
          </View>
        </View>

        {/* Arrival Announcement */}
        <View style={styles.announceCol}>
          <Text style={[styles.arrivedTitle, {color: theme.text}]}>
            {t.nav.youHaveArrived}
          </Text>
          <Text style={[styles.destSub, {color: theme.muted}]} numberOfLines={2}>
            {t.nav.destinationLabel}: {destLabel || t.nav.turns.destination}
          </Text>
        </View>

        {/* Trip Summary Card */}
        <GlassSurface theme={theme} intensity={70} style={[styles.summaryCard, {borderColor: theme.glassBorder}]}>
          <Text style={[styles.summaryCardTitle, {color: theme.text}]}>
            {t.nav.tripSummaryTitle}
          </Text>

          <View style={styles.grid}>
            {/* Distance */}
            <View style={[styles.gridCell, {borderColor: theme.border}]}>
              <MaterialIcons name="straighten" size={20} color={theme.primary} />
              <Text style={[styles.metricLabel, {color: theme.muted}]}>{t.nav.distanceTraveled}</Text>
              <Text style={[styles.metricVal, {color: theme.text}]}>{distKm} {t.route.km}</Text>
            </View>

            {/* Duration */}
            <View style={[styles.gridCell, {borderColor: theme.border}]}>
              <MaterialIcons name="timer" size={20} color={theme.primary} />
              <Text style={[styles.metricLabel, {color: theme.muted}]}>{t.nav.durationElapsed}</Text>
              <Text style={[styles.metricVal, {color: theme.text}]}>{durMin} {t.route.min}</Text>
            </View>

            {/* Hazards Avoided */}
            <View style={[styles.gridCell, {borderColor: theme.border}]}>
              <MaterialIcons name="security" size={20} color="#10b981" />
              <Text style={[styles.metricLabel, {color: theme.muted}]}>{t.nav.hazardsAvoided}</Text>
              <Text style={[styles.metricVal, {color: theme.text}]}>
                {hazardsAvoidedCount} {t.nav.verifiedUnit}
              </Text>
            </View>

            {/* Average Speed */}
            <View style={[styles.gridCell, {borderColor: theme.border}]}>
              <MaterialIcons name="speed" size={20} color={theme.primary} />
              <Text style={[styles.metricLabel, {color: theme.muted}]}>{t.nav.avgSpeed}</Text>
              <Text style={[styles.metricVal, {color: theme.text}]}>{speed} {t.nav.kmh}</Text>
            </View>
          </View>
        </GlassSurface>

        {/* Done Action Button */}
        <Pressable
          style={[styles.doneBtn, {backgroundColor: theme.primary}]}
          onPress={onDone}
          accessibilityRole="button"
        >
          <Text style={styles.doneBtnText}>{t.nav.done}</Text>
        </Pressable>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
    alignItems: "center",
    paddingBottom: 8,
  },
  badgeWrap: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  outerCheckRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  innerCheckCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  announceCol: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  arrivedTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  destSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 18,
  },
  summaryCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridCell: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: "700",
  },
  doneBtn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
