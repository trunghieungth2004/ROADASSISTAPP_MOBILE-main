import {ActivityIndicator, Pressable, StyleSheet, View, useColorScheme} from "react-native";
import {MaterialIcons} from "@expo/vector-icons";
import {AppText as Text} from "./AppText";
import GlassSurface from "./GlassSurface";
import {darkTheme, lightTheme} from "../theme";
import type {Flag} from "../api/flags";
import {FLAG_CONSENSUS_THRESHOLD} from "../api/flags";
import type {Strings} from "../i18n/en";
import {hazardKind} from "./hazardStyle";
import {formatUntil} from "../screens/hazards/flagActions";

type Props = {
  t: Strings;
  flag: Flag | null;
  isOwn: boolean;
  voted: boolean;
  denied: boolean;
  busy: boolean;
  onConfirm: (flagId: string) => void;
  onDeny: (flagId: string) => void;
  onRemove: (flagId: string) => void;
  onClose: () => void;
};

export default function CommunityVerificationSheet({
  t,
  flag,
  isOwn,
  voted,
  denied,
  busy,
  onConfirm,
  onDeny,
  onRemove,
  onClose,
}: Props) {
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? darkTheme : lightTheme;

  if (!flag) return null;

  const confirmers = typeof flag.confirmerCount === "number" ? flag.confirmerCount : Math.max(0, flag.voteCount ?? 0);
  const kind = hazardKind(flag.type);
  const remainingTime = formatUntil(flag.ttlExpiresAtMs, Date.now(), t.flag);

  return (
    <View style={styles.sheetWrapper} pointerEvents="box-none">
      {/* Top Map Overview pill button */}
      <Pressable style={[styles.mapOverviewBtn, {backgroundColor: theme.paper, borderColor: theme.border}]} onPress={onClose}>
        <MaterialIcons name="arrow-back" size={18} color={theme.text} />
        <Text style={[styles.mapOverviewText, {color: theme.text}]}>{t.flag.mapOverview}</Text>
      </Pressable>

      <GlassSurface theme={theme} style={[styles.card, {borderRadius: 24, borderColor: theme.glassBorder}]}>
        <View style={styles.content}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <MaterialIcons name={kind.icon} size={18} color={kind.color} />
              <Text style={[styles.headerTag, {color: theme.muted}]}>{t.flag.communityVerification}</Text>
            </View>
            <Text style={[styles.confirmsText, {color: theme.muted}]}>
              {t.flag.confirmsCount.replace("{n}", String(confirmers))}
            </Text>
          </View>

          {/* Incident title and TTL */}
          <View style={styles.infoRow}>
            <Text style={[styles.questionText, {color: theme.text}]}>{t.flag.isStillCorrect}</Text>
            {remainingTime ? (
              <View style={[styles.timeBadge, {backgroundColor: `${kind.color}15`}]}>
                <MaterialIcons name="schedule" size={14} color={kind.color} />
                <Text style={[styles.timeText, {color: kind.color}]}>{remainingTime}</Text>
              </View>
            ) : null}
          </View>

          {flag.note ? (
            <Text style={[styles.noteText, {color: theme.muted}]} numberOfLines={2}>
              "{flag.note}"
            </Text>
          ) : null}

          {/* Buttons row */}
          {isOwn ? (
            <View style={styles.ownRow}>
              <Pressable
                style={[styles.removeBtn, {backgroundColor: theme.danger}, busy && styles.disabled]}
                disabled={busy}
                onPress={() => onRemove(flag.id)}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="delete-outline" size={20} color="#fff" />
                    <Text style={styles.btnLabelWhite}>{t.flag.remove}</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.actionsRow}>
              <Pressable
                style={[
                  styles.actionBtn,
                  styles.yesBtn,
                  {borderColor: voted ? "#16a34a" : theme.border, backgroundColor: voted ? "#16a34a15" : theme.paper},
                  (busy || voted) && styles.disabled,
                ]}
                disabled={busy || voted}
                onPress={() => onConfirm(flag.id)}
              >
                {busy ? (
                  <ActivityIndicator color="#16a34a" />
                ) : (
                  <>
                    <MaterialIcons name="thumb-up" size={20} color={voted ? "#16a34a" : theme.text} />
                    <Text style={[styles.btnLabel, {color: voted ? "#16a34a" : theme.text}]}>
                      {voted ? t.flag.alreadyVoted : t.flag.yesActive}
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.actionBtn,
                  styles.noBtn,
                  {borderColor: denied ? "#ef4444" : theme.border, backgroundColor: denied ? "#ef444415" : theme.paper},
                  (busy || denied) && styles.disabled,
                ]}
                disabled={busy || denied}
                onPress={() => onDeny(flag.id)}
              >
                {busy ? (
                  <ActivityIndicator color="#ef4444" />
                ) : (
                  <>
                    <MaterialIcons name="thumb-down" size={20} color={denied ? "#ef4444" : theme.text} />
                    <Text style={[styles.btnLabel, {color: denied ? "#ef4444" : theme.text}]}>
                      {denied ? t.flag.alreadyDenied : t.flag.noDelete}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "space-between",
    padding: 16,
    zIndex: 99,
  },
  mapOverviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 40,
  },
  mapOverviewText: {fontSize: 13, fontWeight: "700"},
  card: {borderRadius: 24, padding: 18, borderWidth: 1},
  content: {gap: 12},
  headerRow: {flexDirection: "row", justifyContent: "space-between", alignItems: "center"},
  headerLeft: {flexDirection: "row", alignItems: "center", gap: 6},
  headerTag: {fontSize: 12, fontWeight: "700", letterSpacing: 0.5},
  confirmsText: {fontSize: 12, fontWeight: "600"},
  infoRow: {gap: 6},
  questionText: {fontSize: 18, fontWeight: "800"},
  timeBadge: {flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start"},
  timeText: {fontSize: 12, fontWeight: "700"},
  noteText: {fontSize: 13, fontStyle: "italic"},
  actionsRow: {flexDirection: "row", gap: 12, marginTop: 4},
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  yesBtn: {},
  noBtn: {},
  btnLabel: {fontSize: 14, fontWeight: "700"},
  btnLabelWhite: {fontSize: 14, fontWeight: "700", color: "#ffffff"},
  ownRow: {marginTop: 4},
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  disabled: {opacity: 0.75},
});
