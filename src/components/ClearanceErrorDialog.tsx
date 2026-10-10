import {Pressable, StyleSheet, View} from "react-native";
import {AppText as Text} from "./AppText";
import {MaterialCommunityIcons, MaterialIcons} from "@expo/vector-icons";
import GlassSurface from "./GlassSurface";
import Overlay from "./overlay/Overlay";
import type {AppTheme} from "../theme";
import type {Strings} from "../i18n/en";
import type {MeVehicle} from "../api/users";
import {vehicleMeta} from "./vehicleMeta";

type Props = {
  t: Strings;
  theme: AppTheme;
  visible: boolean;
  vehicle: MeVehicle | null;
  detailMessage?: string | null;
  onAdjustVehicle: () => void;
  onChangeDestination: () => void;
  onClose: () => void;
};

export default function ClearanceErrorDialog({
  t,
  theme,
  visible,
  vehicle,
  detailMessage,
  onAdjustVehicle,
  onChangeDestination,
  onClose,
}: Props) {
  if (!visible) return null;

  const widthVal = vehicle?.baseWidth ?? 2.1;
  const heightVal = vehicle?.baseHeight ?? 3.85;
  const valString = `${widthVal}m × ${heightVal}m`;

  const desc = detailMessage
    || t.route.unableClearanceDesc
        .replace("{w}", String(widthVal))
        .replace("{h}", String(heightVal));

  return (
    <Overlay
      visible={visible}
      variant="dialog"
      title={t.route.unableClearanceTitle}
      leading={<MaterialCommunityIcons name="alert-octagon" size={24} color={theme.danger} />}
      closeLabel={t.common.close}
      onClose={onClose}
    >
      <View style={styles.body}>
        {/* Warning Icon Badge */}
        <View style={styles.iconCenter}>
          <View style={[styles.iconCircle, {backgroundColor: "rgba(239, 68, 68, 0.12)", borderColor: theme.danger}]}>
            <MaterialIcons name="no-transfer" size={36} color={theme.danger} />
          </View>
        </View>

        {/* Warning Details */}
        <View style={[styles.alertCard, {borderColor: theme.danger + "44", backgroundColor: theme.danger + "0d"}]}>
          <Text style={[styles.descText, {color: theme.text}]}>{desc}</Text>
        </View>

        {/* Suggested Actions matching Figma Image 2 Panel 3 */}
        <View style={styles.btnCol}>
          <Pressable
            style={[styles.actionBtn, styles.profileBtn, {borderColor: theme.primary, backgroundColor: theme.primary + "18"}]}
            onPress={onAdjustVehicle}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="car-cog" size={20} color={theme.primary} />
            <Text style={[styles.actionBtnText, {color: theme.primary}]}>
              {t.route.adjustVehicleProfile.replace("{val}", valString)}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, styles.searchBtn, {backgroundColor: theme.primary}]}
            onPress={onChangeDestination}
            accessibilityRole="button"
          >
            <MaterialIcons name="search" size={20} color="#fff" />
            <Text style={[styles.actionBtnText, {color: "#fff", fontWeight: "700"}]}>
              {t.route.findAnotherPlace}
            </Text>
          </Pressable>
        </View>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 16,
    paddingTop: 8,
  },
  iconCenter: {
    alignItems: "center",
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  alertCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  descText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  btnCol: {
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    height: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  profileBtn: {
    borderWidth: 1.5,
  },
  searchBtn: {},
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
