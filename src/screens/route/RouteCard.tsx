import {useState} from "react";
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, View} from "react-native";
import {AppText as Text, AppTextInput as TextInput} from "../../components/AppText";
import StatusRow from "../../components/StatusRow";
import {MaterialCommunityIcons, MaterialIcons} from "@expo/vector-icons";
import type {AppTheme} from "../../theme";
import type {Strings} from "../../i18n/en";
import type {HazardZone, RouteOption, WidthBlock} from "../../api/routes";
import type {MeVehicle} from "../../api/users";
import {formatPoint} from "../../api/places";
import {vehicleMeta} from "../../components/vehicleMeta";
import {MAX_STOPS, type Point, type SearchField, type Stop} from "./types";
import {vehicleIcon} from "./routeGeo";
import {useStopLabels} from "./useStopLabels";
import GlassSurface from "../../components/GlassSurface";
import {useTutorial} from "../../context/TutorialContext";

export type TravelMode = "foot" | "scooter" | "car" | "custom";

type Props = {
  t: Strings;
  theme: AppTheme;
  lang: string;
  originText: string;
  destText: string;
  stops: Stop[];
  result: RouteOption | null;
  origin: Point | null;
  dest: Point | null;
  activeVehicle: MeVehicle | null;
  travelMode: TravelMode;
  customWidth: number;
  customHeight: number;
  busy: boolean;
  starting: boolean;
  hazardZones: HazardZone[];
  widthBlocks: WidthBlock[];
  onSelectTravelMode: (mode: TravelMode) => void;
  onChangeCustomWidth: (w: number) => void;
  onChangeCustomHeight: (h: number) => void;
  onOpenSearch: (field: SearchField) => void;
  onQuickSelectDest: (label: string, lat: number, lng: number) => void;
  onSwap: () => void;
  onDeleteStop: (index: number) => void;
  onOpenVehicle: () => void;
  onStart: () => void;
  onFindRoute?: () => void;
  onSave: () => void;
};

const POPULAR_PLACES = [
  {label: "FPT University", lat: 10.8411, lng: 106.8099},
  {label: "KDL Suối Tiên", lat: 10.8659, lng: 106.8028},
  {label: "Chợ Bến Thành", lat: 10.7725, lng: 106.6980},
];

export default function RouteCard(props: Props) {
  const {t, theme} = props;
  const {getTargetRef} = useTutorial();
  const stopLabels = useStopLabels(props.stops, props.lang);
  const canAddStop = props.stops.length < MAX_STOPS;

  const [editClearance, setEditClearance] = useState(false);
  const [widthInput, setWidthInput] = useState(String(props.customWidth));
  const [heightInput, setHeightInput] = useState(String(props.customHeight));

  const hasOriginNoDest = !!props.origin && !props.dest;
  const readyCorridor = !!props.origin && !!props.dest && !!props.result;

  const resultMin = props.result ? Math.max(1, Math.round((props.result.durationSeconds ?? 0) / 60)) : 0;
  const resultKm = props.result ? ((props.result.distanceMeters ?? 0) / 1000).toFixed(1) : "0";

  return (
    <GlassSurface theme={theme} style={[styles.card, {borderColor: theme.glassBorder}]}>
      {/* 1. Vehicle Type Selector Tabs per Figma Image 1 Panel 1 */}
      <View style={styles.modeTabsRow}>
        <Pressable
          style={[styles.modeTab, props.travelMode === "foot" && [styles.modeTabActive, {backgroundColor: theme.primary}]]}
          onPress={() => props.onSelectTravelMode("foot")}
        >
          <MaterialIcons name="directions-walk" size={18} color={props.travelMode === "foot" ? "#fff" : theme.muted} />
          <Text style={[styles.modeTabText, {color: props.travelMode === "foot" ? "#fff" : theme.muted}]}>
            {t.route.vehicleTypeWalking}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.modeTab, props.travelMode === "scooter" && [styles.modeTabActive, {backgroundColor: theme.primary}]]}
          onPress={() => props.onSelectTravelMode("scooter")}
        >
          <MaterialCommunityIcons name="motorbike" size={18} color={props.travelMode === "scooter" ? "#fff" : theme.muted} />
          <Text style={[styles.modeTabText, {color: props.travelMode === "scooter" ? "#fff" : theme.muted}]}>
            {t.route.vehicleTypeBike}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.modeTab, props.travelMode === "car" && [styles.modeTabActive, {backgroundColor: theme.primary}]]}
          onPress={() => props.onSelectTravelMode("car")}
        >
          <MaterialIcons name="directions-car" size={18} color={props.travelMode === "car" ? "#fff" : theme.muted} />
          <Text style={[styles.modeTabText, {color: props.travelMode === "car" ? "#fff" : theme.muted}]}>
            {t.route.vehicleTypeCar}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.modeTab, props.travelMode === "custom" && [styles.modeTabActive, {backgroundColor: theme.primary}]]}
          onPress={() => {
            props.onSelectTravelMode("custom");
            setEditClearance(true);
          }}
        >
          <MaterialIcons name="tune" size={18} color={props.travelMode === "custom" ? "#fff" : theme.muted} />
          <Text style={[styles.modeTabText, {color: props.travelMode === "custom" ? "#fff" : theme.muted}]}>
            {t.route.vehicleTypeCustom}
          </Text>
        </Pressable>
      </View>

      {/* 2. Clearance Inputs (Width & Height) per Figma Image 1 Panel 1 */}
      {(props.travelMode === "custom" || editClearance || (props.travelMode === "car" && props.activeVehicle)) ? (
        <View style={[styles.clearanceRow, {borderColor: theme.border}]}>
          <View style={styles.clearanceCol}>
            <Text style={[styles.clearanceLabel, {color: theme.muted}]}>{t.route.widthLabel}</Text>
            <View style={[styles.clearanceInputWrap, {borderColor: theme.border, backgroundColor: theme.background + "88"}]}>
              <MaterialCommunityIcons name="arrow-split-vertical" size={16} color={theme.primary} />
              <TextInput
                style={[styles.clearanceInput, {color: theme.text}]}
                keyboardType="numeric"
                value={widthInput}
                onChangeText={(v) => {
                  setWidthInput(v);
                  const n = parseFloat(v);
                  if (!isNaN(n) && n > 0) props.onChangeCustomWidth(n);
                }}
                placeholder="2.1"
                placeholderTextColor={theme.muted}
              />
            </View>
          </View>

          <View style={styles.clearanceCol}>
            <Text style={[styles.clearanceLabel, {color: theme.muted}]}>{t.route.heightLabel}</Text>
            <View style={[styles.clearanceInputWrap, {borderColor: theme.border, backgroundColor: theme.background + "88"}]}>
              <MaterialCommunityIcons name="arrow-split-horizontal" size={16} color={theme.primary} />
              <TextInput
                style={[styles.clearanceInput, {color: theme.text}]}
                keyboardType="numeric"
                value={heightInput}
                onChangeText={(v) => {
                  setHeightInput(v);
                  const n = parseFloat(v);
                  if (!isNaN(n) && n > 0) props.onChangeCustomHeight(n);
                }}
                placeholder="3.85"
                placeholderTextColor={theme.muted}
              />
            </View>
          </View>
        </View>
      ) : null}

      {/* 3. Origin & Destination Input Row */}
      <View style={styles.row}>
        <View style={styles.fieldCol}>
          <Pressable style={[styles.input, styles.selectBtn, {borderColor: theme.border}]} onPress={() => props.onOpenSearch("origin")}>
            <Text style={{color: props.originText ? theme.text : theme.muted}} numberOfLines={1}>
              {props.originText || t.route.selectOrigin}
            </Text>
          </Pressable>
        </View>
        <Pressable style={[styles.swapBtn, {borderColor: theme.border}]} onPress={props.onSwap}>
          <Text style={{color: theme.primary}}>⇄</Text>
        </Pressable>
        <View style={styles.fieldCol}>
          <Pressable ref={getTargetRef("routeDestination")} style={[styles.input, styles.selectBtn, {borderColor: theme.border}]} onPress={() => props.onOpenSearch("destination")}>
            <Text style={{color: props.destText ? theme.text : theme.muted}} numberOfLines={1}>
              {props.destText || t.route.selectDestination}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 4. "A, not B" Validation Infobox per Figma Image 2 Panel 1 */}
      {hasOriginNoDest ? (
        <View style={[styles.validationBanner, {backgroundColor: "rgba(245, 158, 11, 0.12)", borderColor: "rgba(245, 158, 11, 0.4)"}]}>
          <MaterialIcons name="info-outline" size={18} color="#f59e0b" />
          <Text style={[styles.validationText, {color: theme.text}]}>
            {t.route.pleaseAddDest}
          </Text>
        </View>
      ) : null}

      {/* 5. "B, not A" Corridor Ready Banner per Figma Image 2 Panel 2 */}
      {readyCorridor ? (
        <View style={[styles.corridorBanner, {backgroundColor: theme.primary + "14", borderColor: theme.primary + "44"}]}>
          <MaterialIcons name="navigation" size={18} color={theme.primary} />
          <Text style={[styles.corridorText, {color: theme.primary}]}>
            {t.route.corridorReady} · {resultMin} {t.route.min} • {resultKm} {t.route.km}
          </Text>
        </View>
      ) : null}

      {/* 6. Recent / Quick Places Chips per Figma Image 1 Panel 1 */}
      {!props.dest ? (
        <View style={styles.quickPlacesRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPlacesScroll}>
            {POPULAR_PLACES.map((p) => (
              <Pressable
                key={p.label}
                style={[styles.quickChip, {borderColor: theme.border, backgroundColor: theme.paper}]}
                onPress={() => props.onQuickSelectDest(p.label, p.lat, p.lng)}
              >
                <MaterialIcons name="place" size={14} color={theme.primary} />
                <Text style={[styles.quickChipText, {color: theme.text}]}>{p.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* 7. Stops and Vehicle Selector */}
      <View style={styles.stopVehicleRow}>
        <View style={styles.stopGroup}>
          <Pressable style={[styles.plusBtn, {borderColor: canAddStop ? theme.primary : theme.border}, !canAddStop && styles.disabled]} disabled={!canAddStop} onPress={() => props.onOpenSearch("stop")} accessibilityRole="button" accessibilityLabel={t.route.addStop}>
            <MaterialIcons name="add" size={20} color={canAddStop ? theme.primary : theme.muted} />
          </Pressable>
          {props.stops.map((s, i) => (
            <View key={`${s.lat},${s.lng},${i}`} style={[styles.chip, {borderColor: theme.primary}]}>
              <View style={[styles.stopBadge, {backgroundColor: theme.primary}]}>
                <Text style={styles.stopBadgeText}>{i + 1}</Text>
              </View>
              <Text style={[styles.chipLabel, {color: theme.primary}]} numberOfLines={1}>{stopLabels[i] ?? formatPoint(s.lat, s.lng)}</Text>
              <Pressable onPress={() => props.onDeleteStop(i)} hitSlop={6} accessibilityRole="button" accessibilityLabel={t.route.stopRemove}>
                <MaterialIcons name="close" size={16} color={theme.primary} />
              </Pressable>
            </View>
          ))}
        </View>
        <Pressable ref={getTargetRef("routeVehicle")} style={[styles.input, styles.vehicleCompact, {borderColor: theme.border}]} onPress={props.onOpenVehicle}>
          <View style={styles.vehicleBtnRow}>
            <MaterialCommunityIcons name={vehicleIcon(props.activeVehicle?.type)} size={20} color={theme.primary} />
            <Text style={[styles.vehicleBtnText, {color: props.activeVehicle ? theme.text : theme.muted}]} numberOfLines={1}>
              {props.activeVehicle ? vehicleMeta(props.activeVehicle.baseWidth, props.activeVehicle.baseHeight) : t.route.selectVehicle}
            </Text>
            <MaterialIcons name="expand-more" size={20} color={theme.muted} />
          </View>
        </Pressable>
      </View>

      {/* 8. Action Buttons (Start, Save, or Find Route) */}
      {props.result ? (
        <View style={styles.actionRow}>
          <Pressable style={[styles.primary, styles.actionBtn, {backgroundColor: theme.primary}, (props.busy || props.starting) && styles.disabled]} disabled={props.busy || props.starting} onPress={props.onStart}>
            {props.starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t.nav.start}</Text>}
          </Pressable>
          <Pressable style={[styles.primary, styles.actionBtn, styles.saveBtn, {borderColor: theme.primary}, props.busy && styles.disabled]} disabled={props.busy} onPress={props.onSave}>
            <Text style={[styles.primaryText, {color: theme.primary}]}>{t.route.saveRoute}</Text>
          </Pressable>
        </View>
      ) : props.busy ? (
        <StatusRow theme={theme} text={t.route.findingRoute} />
      ) : (
        <Pressable
          style={[styles.primary, styles.fullWidth, {backgroundColor: hasOriginNoDest ? theme.border : theme.primary}, hasOriginNoDest && styles.disabled]}
          disabled={hasOriginNoDest || props.busy}
          onPress={props.onFindRoute}
        >
          <Text style={[styles.primaryText, {color: hasOriginNoDest ? theme.muted : "#fff"}]}>
            {t.route.findRoute}
          </Text>
        </Pressable>
      )}

      {/* 9. Width Blocks Warning */}
      {props.widthBlocks.length > 0 ? (
        <View style={[styles.resultCard, {borderColor: theme.danger}]}>
          <View style={styles.warnBox}>
            <Text style={[styles.warnTitle, {color: theme.danger}]}>{t.route.widthBlocked}</Text>
            {props.widthBlocks.map((w) => (
              <Text key={w.segmentId} style={{color: theme.text}}>{t.route.widthNarrow} · {w.baseWidth} m</Text>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={[styles.attribution, {color: theme.muted}]}>{t.route.geoAttribution}</Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {width: "100%", borderWidth: 1, borderRadius: 18, padding: 16, gap: 12, overflow: "hidden"},
  modeTabsRow: {flexDirection: "row", gap: 6, width: "100%"},
  modeTab: {flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10, gap: 4},
  modeTabActive: {elevation: 2},
  modeTabText: {fontSize: 12, fontWeight: "600"},
  clearanceRow: {flexDirection: "row", gap: 12, padding: 10, borderRadius: 12, borderWidth: 1},
  clearanceCol: {flex: 1, gap: 4},
  clearanceLabel: {fontSize: 11, fontWeight: "600"},
  clearanceInputWrap: {flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, height: 36, gap: 6},
  clearanceInput: {flex: 1, fontSize: 13, padding: 0},
  row: {flexDirection: "row", gap: 8, alignItems: "center"},
  validationBanner: {flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1, gap: 8},
  validationText: {fontSize: 12, fontWeight: "600", flex: 1},
  corridorBanner: {flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1, gap: 8},
  corridorText: {fontSize: 12, fontWeight: "700", flex: 1},
  quickPlacesRow: {marginTop: -4},
  quickPlacesScroll: {gap: 8, paddingVertical: 2},
  quickChip: {flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10, gap: 4},
  quickChipText: {fontSize: 12, fontWeight: "500"},
  stopVehicleRow: {flexDirection: "row", gap: 8, alignItems: "center"},
  stopGroup: {flexDirection: "row", flexWrap: "wrap", gap: 8, flex: 1, alignItems: "center"},
  plusBtn: {width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center"},
  vehicleCompact: {justifyContent: "center", minHeight: 42, maxWidth: "45%"},
  fieldCol: {flex: 1, gap: 8, minWidth: 0},
  input: {borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14},
  selectBtn: {justifyContent: "center", minHeight: 42},
  swapBtn: {width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center"},
  vehicleBtnRow: {flexDirection: "row", alignItems: "center", gap: 8},
  vehicleBtnText: {flex: 1, fontSize: 14, textAlign: "center"},
  chip: {borderWidth: 1, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6},
  stopBadge: {width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center"},
  stopBadgeText: {color: "#fff", fontSize: 11, fontWeight: "700"},
  chipLabel: {fontSize: 12, fontWeight: "600", flexShrink: 1, maxWidth: 140},
  actionRow: {flexDirection: "row", gap: 8},
  primary: {borderRadius: 10, padding: 12, alignItems: "center", justifyContent: "center"},
  fullWidth: {width: "100%"},
  actionBtn: {flex: 1},
  saveBtn: {borderWidth: 1, backgroundColor: "transparent"},
  disabled: {opacity: 0.6},
  primaryText: {color: "#fff", fontWeight: "700", fontSize: 15},
  resultCard: {borderWidth: 1, borderRadius: 12, padding: 12, gap: 6, borderStyle: "dashed"},
  warnBox: {gap: 2},
  warnTitle: {fontSize: 13, fontWeight: "700"},
  attribution: {fontSize: 10, textAlign: "right"},
});
