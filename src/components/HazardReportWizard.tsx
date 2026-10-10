import {useEffect, useMemo, useRef, useState} from "react";
import {ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View, useColorScheme, useWindowDimensions} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {MaterialIcons} from "@expo/vector-icons";
import {Camera, GeoJSONSource, Map, type CameraRef} from "@maplibre/maplibre-react-native";
import {AppText as Text} from "./AppText";
import StyledLayer from "./StyledLayer";
import {bundledMapStyle} from "../map/style";
import {formatPoint, reverseLabel} from "../api/places";
import type {FlagType} from "../api/flags";
import type {Strings} from "../i18n/en";
import {darkTheme, lightTheme} from "../theme";
import type {FlagReport} from "./FlagSheet";

type Props = {
  t: Strings;
  lang: string;
  lat: number;
  lng: number;
  onClose: () => void;
  onSubmit: (report: FlagReport) => Promise<void> | void;
  onViewOnMap?: (lat: number, lng: number) => void;
};

const TTL_MAP: Record<FlagType, number> = {
  FLOOD: 6,
  OBSTRUCTION: 12,
  ACCIDENT: 2,
};

function circleCoordinates(lat: number, lng: number, radiusMeters: number): [number, number][] {
  const pts: [number, number][] = [];
  const cosLat = Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i < 36; i++) {
    const a = (2 * Math.PI * i) / 36;
    pts.push([
      lng + (radiusMeters * Math.sin(a)) / (111320 * cosLat),
      lat + (radiusMeters * Math.cos(a)) / 111320,
    ]);
  }
  pts.push(pts[0]);
  return pts;
}

export default function HazardReportWizard({t, lang, lat, lng, onClose, onSubmit, onViewOnMap}: Props) {
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const {width: windowWidth} = useWindowDimensions();
  const [mapStyle] = useState(() => bundledMapStyle() ?? "https://demotiles.maplibre.org/style.json");

  const [step, setStep] = useState<1 | 2 | 3 | "finished">(1);
  const [type, setType] = useState<FlagType>("FLOOD");
  const [radiusMeters, setRadiusMeters] = useState(500);
  const [address, setAddress] = useState<string>("");
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [busy, setBusy] = useState(false);

  const miniMapCameraRef = useRef<CameraRef | null>(null);

  useEffect(() => {
    let alive = true;
    setLoadingAddress(true);
    void reverseLabel(lat, lng, lang)
      .then((res) => {
        if (alive) {
          setAddress(res);
          setLoadingAddress(false);
        }
      })
      .catch(() => {
        if (alive) {
          setAddress(formatPoint(lat, lng));
          setLoadingAddress(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [lat, lng, lang]);

  const timeLabel = useMemo(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    return t.flag.todayAt.replace("{time}", `${hours}:${mins}`);
  }, [t]);

  const ttlHours = TTL_MAP[type] ?? 6;

  const expiryTimeStr = useMemo(() => {
    const exp = new Date(Date.now() + ttlHours * 3600 * 1000);
    const hours = String(exp.getHours()).padStart(2, "0");
    const mins = String(exp.getMinutes()).padStart(2, "0");
    return `${ttlHours} hours (${hours}:${mins})`;
  }, [ttlHours]);

  const miniCircleCoords = useMemo(() => {
    return circleCoordinates(lat, lng, radiusMeters);
  }, [lat, lng, radiusMeters]);

  async function handleFinalSubmit() {
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit({type, radiusMeters, note: undefined});
      setStep("finished");
    } finally {
      setBusy(false);
    }
  }

  function handleViewOnMap() {
    if (onViewOnMap) {
      onViewOnMap(lat, lng);
    } else {
      onClose();
    }
  }

  const sliderWidth = Math.min(windowWidth - 48, 380);
  const minR = 100;
  const maxR = 2000;
  const progressRatio = Math.max(0, Math.min(1, (radiusMeters - minR) / (maxR - minR)));

  const typeConfig: {id: FlagType; title: string; icon: "flood" | "construction" | "car-crash"; ttl: number}[] = [
    {id: "FLOOD", title: t.flag.flood, icon: "flood", ttl: 6},
    {id: "OBSTRUCTION", title: t.flag.obstruction, icon: "construction", ttl: 12},
    {id: "ACCIDENT", title: t.flag.accident, icon: "car-crash", ttl: 2},
  ];

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.root, {backgroundColor: theme.background, paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16)}]}>
        {step !== "finished" && (
          <View style={styles.topBar}>
            {step === 1 ? (
              <Pressable onPress={onClose} hitSlop={12} style={styles.navAction}>
                <Text style={[styles.navActionText, {color: theme.muted}]}>✕ {t.common.cancel}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setStep((s) => (s === 3 ? 2 : 1))} hitSlop={12} style={styles.navAction}>
                <MaterialIcons name="arrow-back" size={20} color={theme.text} />
                <Text style={[styles.navActionText, {color: theme.text}]}>{t.tutorial.back}</Text>
              </Pressable>
            )}
            <Text style={[styles.stepCounter, {color: theme.muted}]}>
              {t.flag.stepOf.replace("{current}", String(step)).replace("{total}", "3")}
            </Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.title, {color: theme.text}]}>{t.flag.reportWizardTitle}</Text>
              <Text style={[styles.subtitle, {color: theme.muted}]}>{t.flag.reportWizardSub}</Text>

              <View style={[styles.gpsCard, {backgroundColor: theme.paper, borderColor: theme.border}]}>
                <View style={[styles.gpsIconSlot, {backgroundColor: `${theme.primary}18`}]}>
                  <MaterialIcons name="location-pin" size={24} color={theme.primary} />
                </View>
                <View style={styles.gpsTextCol}>
                  <Text style={[styles.gpsHeading, {color: theme.muted}]}>{t.flag.autoPinnedGps}</Text>
                  {loadingAddress ? (
                    <ActivityIndicator size="small" color={theme.primary} style={{alignSelf: "flex-start", marginVertical: 4}} />
                  ) : (
                    <Text style={[styles.gpsAddress, {color: theme.text}]} numberOfLines={2}>
                      {address || formatPoint(lat, lng)}
                    </Text>
                  )}
                  <Text style={[styles.gpsTime, {color: theme.muted}]}>{timeLabel}</Text>
                </View>
              </View>

              <Text style={[styles.sectionHeading, {color: theme.text}]}>{t.flag.selectIncidentType}</Text>

              <View style={styles.typeList}>
                {typeConfig.map((item) => {
                  const selected = type === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.typeCard,
                        {backgroundColor: theme.paper, borderColor: selected ? theme.primary : theme.border},
                        selected && {borderWidth: 2, backgroundColor: `${theme.primary}08`},
                      ]}
                      onPress={() => setType(item.id)}
                    >
                      <View style={[styles.typeIconSlot, {backgroundColor: selected ? `${theme.primary}22` : `${theme.muted}15`}]}>
                        <MaterialIcons name={item.icon} size={22} color={selected ? theme.primary : theme.muted} />
                      </View>
                      <View style={styles.typeTextCol}>
                        <Text style={[styles.typeTitle, {color: theme.text}]}>{item.title}</Text>
                        <Text style={[styles.typeTtl, {color: theme.muted}]}>
                          {t.flag.activeTtl.replace("{n}", String(item.ttl))}
                        </Text>
                      </View>
                      <View style={[styles.radioCircle, {borderColor: selected ? theme.primary : theme.border}]}>
                        {selected ? <View style={[styles.radioInner, {backgroundColor: theme.primary}]} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.title, {color: theme.text}]}>{t.flag.setRadiusTitle}</Text>
              <Text style={[styles.subtitle, {color: theme.muted}]}>{t.flag.setRadiusSub}</Text>

              <View style={[styles.miniMapWrapper, {borderColor: theme.border}]}>
                <Map
                  style={StyleSheet.absoluteFill}
                  mapStyle={mapStyle}
                  logo={false}
                  attribution={false}
                  androidView="texture"
                >
                  <Camera ref={miniMapCameraRef} initialViewState={{center: [lng, lat], zoom: 14.5}} />
                  <GeoJSONSource
                    id="mini-radius-fill"
                    data={{
                      type: "Feature",
                      geometry: {type: "Polygon", coordinates: [miniCircleCoords]},
                      properties: {},
                    }}
                  >
                    <StyledLayer
                      type="fill"
                      id="mini-radius-fill-layer"
                      style={{fillColor: "#ef4444", fillOpacity: 0.3}}
                    />
                    <StyledLayer
                      type="line"
                      id="mini-radius-line-layer"
                      style={{lineColor: "#dc2626", lineWidth: 2, lineDasharray: [3, 2]}}
                    />
                  </GeoJSONSource>
                  <GeoJSONSource
                    id="mini-radius-center"
                    data={{
                      type: "Feature",
                      geometry: {type: "Point", coordinates: [lng, lat]},
                      properties: {},
                    }}
                  >
                    <StyledLayer
                      type="circle"
                      id="mini-center-dot"
                      style={{circleRadius: 6, circleColor: "#111827", circleStrokeWidth: 2, circleStrokeColor: "#ffffff"}}
                    />
                  </GeoJSONSource>
                </Map>
                <View style={styles.radiusPill}>
                  <Text style={styles.radiusPillText}>{radiusMeters} m radius</Text>
                </View>
              </View>

              <View style={[styles.sliderCard, {backgroundColor: theme.paper, borderColor: theme.border}]}>
                <View style={styles.sliderHeader}>
                  <Text style={[styles.sliderTitle, {color: theme.text}]}>{t.flag.detectionRadius}</Text>
                  <Text style={[styles.sliderVal, {color: theme.primary}]}>{radiusMeters} m</Text>
                </View>

                <View style={styles.presetRow}>
                  {[100, 250, 500, 1000, 2000].map((preset) => (
                    <Pressable
                      key={preset}
                      onPress={() => setRadiusMeters(preset)}
                      style={[
                        styles.presetChip,
                        {borderColor: radiusMeters === preset ? theme.primary : theme.border},
                        radiusMeters === preset && {backgroundColor: `${theme.primary}18`},
                      ]}
                    >
                      <Text style={[styles.presetText, {color: radiusMeters === preset ? theme.primary : theme.text}]}>
                        {preset >= 1000 ? `${preset / 1000}km` : `${preset}m`}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={[styles.trackBg, {width: sliderWidth, backgroundColor: `${theme.muted}33`}]}>
                  <View style={[styles.trackFill, {width: sliderWidth * progressRatio, backgroundColor: theme.primary}]} />
                  <View style={[styles.sliderThumb, {left: Math.max(0, sliderWidth * progressRatio - 12), backgroundColor: theme.paper, borderColor: theme.primary}]} />
                </View>
                <View style={[styles.sliderLabels, {width: sliderWidth}]}>
                  <Text style={[styles.boundLabel, {color: theme.muted}]}>100 m</Text>
                  <Text style={[styles.boundLabel, {color: theme.muted}]}>500 m (Default)</Text>
                  <Text style={[styles.boundLabel, {color: theme.muted}]}>2 km</Text>
                </View>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.title, {color: theme.text}]}>{t.flag.confirmReportTitle}</Text>
              <Text style={[styles.subtitle, {color: theme.muted}]}>{t.flag.confirmReportSub}</Text>

              <View style={[styles.summaryCard, {backgroundColor: theme.paper, borderColor: theme.border}]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, {color: theme.muted}]}>{t.flag.incidentType}</Text>
                  <Text style={[styles.summaryValue, {color: theme.text}]}>
                    {type === "FLOOD" ? `${t.flag.flood} Hazard` : type === "OBSTRUCTION" ? `${t.flag.obstruction} Hazard` : `${t.flag.accident} Hazard`}
                  </Text>
                </View>
                <View style={[styles.cardDivider, {backgroundColor: theme.border}]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, {color: theme.muted}]}>{t.flag.location}</Text>
                  <Text style={[styles.summaryValue, styles.flexVal, {color: theme.text}]} numberOfLines={2}>
                    {address || formatPoint(lat, lng)}
                  </Text>
                </View>
                <View style={[styles.cardDivider, {backgroundColor: theme.border}]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, {color: theme.muted}]}>{t.flag.safetyRadius}</Text>
                  <Text style={[styles.summaryValue, {color: theme.text}]}>{radiusMeters} meters</Text>
                </View>
                <View style={[styles.cardDivider, {backgroundColor: theme.border}]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, {color: theme.muted}]}>{t.flag.expiryTime}</Text>
                  <Text style={[styles.summaryValue, {color: theme.text}]}>{expiryTimeStr}</Text>
                </View>
              </View>

              <View style={[styles.noticeBox, {backgroundColor: `${theme.primary}12`, borderColor: `${theme.primary}33`}]}>
                <MaterialIcons name="info-outline" size={20} color={theme.primary} style={{marginTop: 2}} />
                <Text style={[styles.noticeText, {color: theme.text}]}>{t.flag.detourNotice}</Text>
              </View>
            </View>
          )}

          {step === "finished" && (
            <View style={styles.finishedContainer}>
              <View style={[styles.successCircle, {backgroundColor: "#22c55e"}]}>
                <MaterialIcons name="check" size={54} color="#ffffff" />
              </View>
              <Text style={[styles.finishTitle, {color: theme.text}]}>{t.flag.reportSubmitted}</Text>
              <Text style={[styles.finishSub, {color: theme.muted}]}>{t.flag.broadcastNotice}</Text>

              <View style={[styles.validBadge, {backgroundColor: `${theme.primary}18`}]}>
                <MaterialIcons name="hourglass-empty" size={16} color={theme.primary} />
                <Text style={[styles.validBadgeText, {color: theme.primary}]}>
                  {t.flag.validFor.replace("{time}", `0${ttlHours - 1}h:59m`)}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          {step === 1 && (
            <Pressable style={[styles.primaryBtn, {backgroundColor: theme.primary}]} onPress={() => setStep(2)}>
              <Text style={styles.primaryBtnText}>{t.flag.nextRadius}</Text>
            </Pressable>
          )}

          {step === 2 && (
            <View style={styles.btnCol}>
              <Pressable style={[styles.primaryBtn, {backgroundColor: theme.primary}]} onPress={() => setStep(3)}>
                <Text style={styles.primaryBtnText}>{t.flag.confirmRadius}</Text>
              </Pressable>
              <Pressable
                style={[styles.outlineBtn, {borderColor: theme.border}]}
                onPress={() => {
                  setRadiusMeters(500);
                  setStep(3);
                }}
              >
                <Text style={[styles.outlineBtnText, {color: theme.text}]}>
                  {t.flag.keepDefault.replace("{n}", "500")}
                </Text>
              </Pressable>
            </View>
          )}

          {step === 3 && (
            <View style={styles.btnCol}>
              <Pressable
                style={[styles.primaryBtn, {backgroundColor: theme.primary}, busy && styles.disabled]}
                disabled={busy}
                onPress={() => void handleFinalSubmit()}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{t.flag.submit}</Text>}
              </Pressable>
              <Pressable style={styles.cancelTextBtn} onPress={onClose} disabled={busy}>
                <Text style={[styles.cancelText, {color: theme.muted}]}>{t.common.cancel}</Text>
              </Pressable>
            </View>
          )}

          {step === "finished" && (
            <Pressable style={[styles.primaryBtn, {backgroundColor: theme.primary}]} onPress={handleViewOnMap}>
              <Text style={styles.primaryBtnText}>{t.flag.viewOnMap}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  topBar: {flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10},
  navAction: {flexDirection: "row", alignItems: "center", gap: 6, minHeight: 32},
  navActionText: {fontSize: 14, fontWeight: "600"},
  stepCounter: {fontSize: 13, fontWeight: "600"},
  scrollContent: {paddingHorizontal: 20, paddingBottom: 24},
  stepContainer: {gap: 16, paddingTop: 8},
  title: {fontSize: 24, fontWeight: "800"},
  subtitle: {fontSize: 14, lineHeight: 20},
  gpsCard: {flexDirection: "row", padding: 14, borderRadius: 16, borderWidth: 1, gap: 14, alignItems: "center"},
  gpsIconSlot: {width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center"},
  gpsTextCol: {flex: 1, gap: 2},
  gpsHeading: {fontSize: 11, fontWeight: "700", letterSpacing: 0.5},
  gpsAddress: {fontSize: 15, fontWeight: "700"},
  gpsTime: {fontSize: 12},
  sectionHeading: {fontSize: 13, fontWeight: "700", letterSpacing: 0.5, marginTop: 8},
  typeList: {gap: 12},
  typeCard: {flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1, gap: 14},
  typeIconSlot: {width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center"},
  typeTextCol: {flex: 1, gap: 2},
  typeTitle: {fontSize: 16, fontWeight: "700"},
  typeTtl: {fontSize: 13},
  radioCircle: {width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center"},
  radioInner: {width: 12, height: 12, borderRadius: 6},
  miniMapWrapper: {height: 200, borderRadius: 20, overflow: "hidden", borderWidth: 1, position: "relative"},
  radiusPill: {position: "absolute", bottom: 12, right: 12, backgroundColor: "rgba(15,23,42,0.85)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999},
  radiusPillText: {color: "#ffffff", fontSize: 12, fontWeight: "700"},
  sliderCard: {padding: 16, borderRadius: 18, borderWidth: 1, gap: 14, alignItems: "center"},
  sliderHeader: {flexDirection: "row", justifyContent: "space-between", width: "100%"},
  sliderTitle: {fontSize: 15, fontWeight: "700"},
  sliderVal: {fontSize: 16, fontWeight: "800"},
  presetRow: {flexDirection: "row", gap: 8, width: "100%", justifyContent: "space-between"},
  presetChip: {flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: "center"},
  presetText: {fontSize: 12, fontWeight: "700"},
  trackBg: {height: 6, borderRadius: 3, position: "relative", marginVertical: 8},
  trackFill: {height: 6, borderRadius: 3},
  sliderThumb: {position: "absolute", top: -9, width: 24, height: 24, borderRadius: 12, borderWidth: 3},
  sliderLabels: {flexDirection: "row", justifyContent: "space-between"},
  boundLabel: {fontSize: 11, fontWeight: "600"},
  summaryCard: {padding: 18, borderRadius: 18, borderWidth: 1, gap: 12},
  summaryRow: {flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12},
  summaryLabel: {fontSize: 14},
  summaryValue: {fontSize: 14, fontWeight: "700"},
  flexVal: {flex: 1, textAlign: "right"},
  cardDivider: {height: 1, width: "100%"},
  noticeBox: {flexDirection: "row", padding: 14, borderRadius: 14, borderWidth: 1, gap: 10},
  noticeText: {flex: 1, fontSize: 13, lineHeight: 18},
  finishedContainer: {alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 16},
  successCircle: {width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center", marginBottom: 8},
  finishTitle: {fontSize: 24, fontWeight: "800", textAlign: "center"},
  finishSub: {fontSize: 14, lineHeight: 22, textAlign: "center", paddingHorizontal: 20},
  validBadge: {flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginTop: 6},
  validBadgeText: {fontSize: 13, fontWeight: "700"},
  bottomBar: {paddingHorizontal: 20, paddingTop: 10},
  btnCol: {gap: 10},
  primaryBtn: {borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center"},
  primaryBtnText: {color: "#ffffff", fontSize: 16, fontWeight: "700"},
  outlineBtn: {borderRadius: 16, paddingVertical: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center"},
  outlineBtnText: {fontSize: 15, fontWeight: "700"},
  cancelTextBtn: {paddingVertical: 10, alignItems: "center"},
  cancelText: {fontSize: 14, fontWeight: "600"},
  disabled: {opacity: 0.6},
});
