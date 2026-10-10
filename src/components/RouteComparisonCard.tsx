import {Pressable, StyleSheet, View} from "react-native";
import {AppText as Text} from "./AppText";
import {MaterialIcons} from "@expo/vector-icons";
import GlassSurface from "./GlassSurface";
import type {AppTheme} from "../theme";
import type {Strings} from "../i18n/en";
import type {RouteOption, FlagWarning} from "../api/routes";
import {formatDist} from "../screens/navigation/navUtils";
import {flagTypeLabel} from "../i18n/labels";
import {hazardKind} from "./hazardStyle";

type Props = {
  t: Strings;
  theme: AppTheme;
  currentRoute: RouteOption;
  detourRoute: RouteOption;
  hazard?: FlagWarning | null;
  hazardDistance?: number | null;
  hazardNote?: string | null;
  onTakeDetour: () => void;
  onKeepRoute: () => void;
  onClose?: () => void;
};

export default function RouteComparisonCard({
  t,
  theme,
  currentRoute,
  detourRoute,
  hazard,
  hazardDistance,
  hazardNote,
  onTakeDetour,
  onKeepRoute,
  onClose,
}: Props) {
  const currentSec = currentRoute.durationSeconds ?? 0;
  const detourSec = detourRoute.durationSeconds ?? 0;
  const currentMin = Math.max(1, Math.round(currentSec / 60));
  const detourMin = Math.max(1, Math.round(detourSec / 60));

  // If detour is faster, calculate saved mins; else show delay on current route
  const diffSec = currentSec - detourSec;
  const savedMin = Math.max(1, Math.round(Math.abs(diffSec) / 60));
  const delayMin = Math.max(1, Math.round((currentSec * 0.25) / 60)); // estimated hazard delay

  const currentDistKm = ((currentRoute.distanceMeters ?? 0) / 1000).toFixed(1);
  const detourDistKm = ((detourRoute.distanceMeters ?? 0) / 1000).toFixed(1);

  const kind = hazard ? hazardKind(hazard.type) : hazardKind("flood");
  const hazardLabel = hazard?.type ? flagTypeLabel(hazard.type, t) : t.flag.flood;
  const distText = hazardDistance !== null && hazardDistance !== undefined ? formatDist(hazardDistance, t.route.km, t.nav.m) : "800 m";

  return (
    <View style={styles.container}>
      {/* Top Hazard Warning Banner matching Figma Panel 2 */}
      <GlassSurface theme={theme} intensity={65} style={[styles.hazardBanner, {borderColor: kind.color}]}>
        <View style={[styles.hazardIconWrap, {backgroundColor: kind.color + "22"}]}>
          <MaterialIcons name={kind.icon} size={22} color={kind.color} />
        </View>
        <View style={styles.hazardBannerCol}>
          <Text style={[styles.hazardBannerTitle, {color: theme.text}]} numberOfLines={1}>
            {t.route.hazardAheadAlert.replace("{type}", hazardLabel).replace("{d}", distText)}
          </Text>
          <Text style={[styles.hazardBannerSub, {color: theme.muted}]} numberOfLines={1}>
            {hazardNote || t.route.waterDepth.replace("{depth}", "20")} · {t.nav.verifiedUnit}
          </Text>
        </View>
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <MaterialIcons name="close" size={18} color={theme.muted} />
          </Pressable>
        ) : null}
      </GlassSurface>

      {/* Main Route Comparison Card */}
      <GlassSurface theme={theme} intensity={70} style={[styles.card, {borderColor: theme.glassBorder}]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleRow}>
            <MaterialIcons name="compare-arrows" size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, {color: theme.text}]}>{t.route.routeComparison}</Text>
          </View>
          <Text style={[styles.activeLeftText, {color: theme.muted}]}>
            {t.route.activeLeft.replace("{d}", distText)}
          </Text>
        </View>

        {/* Current Route Row */}
        <View style={[styles.routeRow, styles.currentRouteRow, {borderColor: theme.border}]}>
          <View style={styles.routeRowLeft}>
            <View style={[styles.routeDot, {backgroundColor: "#f59e0b"}]} />
            <View>
              <Text style={[styles.routeRowLabel, {color: theme.text}]}>{t.route.currentRoute}</Text>
              <Text style={[styles.routeRowMetrics, {color: theme.muted}]}>
                {currentMin} {t.route.min} · {currentDistKm} {t.route.km}
              </Text>
            </View>
          </View>
          <View style={[styles.badge, styles.delayBadge]}>
            <Text style={styles.delayBadgeText}>
              {t.route.hazardDelay.replace("{min}", String(delayMin))}
            </Text>
          </View>
        </View>

        {/* Detour Bypass Row */}
        <View style={[styles.routeRow, styles.detourRouteRow, {borderColor: theme.primary + "66", backgroundColor: theme.primary + "12"}]}>
          <View style={styles.routeRowLeft}>
            <View style={[styles.routeDot, {backgroundColor: theme.primary}]} />
            <View>
              <Text style={[styles.routeRowLabel, {color: theme.text, fontWeight: "700"}]}>{t.route.detourBypass}</Text>
              <Text style={[styles.routeRowMetrics, {color: theme.muted}]}>
                {detourMin} {t.route.min} · {detourDistKm} {t.route.km}
              </Text>
            </View>
          </View>
          <View style={[styles.badge, styles.savedBadge, {backgroundColor: theme.primary}]}>
            <Text style={styles.savedBadgeText}>
              {t.route.saveTime.replace("{min}", String(savedMin))}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.btn, styles.detourBtn, {backgroundColor: theme.primary}]}
            onPress={onTakeDetour}
            accessibilityRole="button"
          >
            <MaterialIcons name="alt-route" size={18} color="#fff" />
            <Text style={styles.detourBtnText}>{t.route.takeDetour}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.keepBtn, {borderColor: theme.border}]}
            onPress={onKeepRoute}
            accessibilityRole="button"
          >
            <Text style={[styles.keepBtnText, {color: theme.text}]}>{t.route.keepRoute}</Text>
          </Pressable>
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 10,
  },
  hazardBanner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
    overflow: "hidden",
  },
  hazardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  hazardBannerCol: {
    flex: 1,
    gap: 2,
  },
  hazardBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  hazardBannerSub: {
    fontSize: 11,
  },
  closeBtn: {
    padding: 4,
  },
  card: {
    width: "100%",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  activeLeftText: {
    fontSize: 12,
    fontWeight: "600",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  currentRouteRow: {},
  detourRouteRow: {},
  routeRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeRowLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  routeRowMetrics: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  delayBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  delayBadgeText: {
    color: "#ef4444",
    fontSize: 11,
    fontWeight: "700",
  },
  savedBadge: {},
  savedBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  detourBtn: {},
  detourBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  keepBtn: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  keepBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
