import {useEffect, useState} from "react";
import {Pressable, StyleSheet, View, useColorScheme, useWindowDimensions} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {AppText as Text} from "./AppText";
import {darkTheme, lightTheme} from "../theme";
import {TUTORIAL_STEPS, useTutorial} from "../context/TutorialContext";
import {useStrings} from "../context/LanguageContext";

type Bounds = {x: number; y: number; width: number; height: number};

export default function TutorialOverlay() {
  const {t} = useStrings();
  const {active, step, anchorVersion, getTarget, setStep, dismiss, navigateTab} = useTutorial();
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? darkTheme : lightTheme;
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const current = TUTORIAL_STEPS[step];
  const copy = t.tutorial.steps[step];

  useEffect(() => {
    if (!active || !current) {
      setBounds(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    setBounds(null);
    const measure = (): void => {
      const target = getTarget(current.target);
      if (attempts >= 20) return;
      attempts += 1;
      if (!target) {
        timer = setTimeout(measure, 100);
        return;
      }
      target.measureInWindow((x, y, measuredWidth, measuredHeight) => {
        if (cancelled) return;
        if (measuredWidth > 0 && measuredHeight > 0) {
          setBounds({x, y, width: measuredWidth, height: measuredHeight});
          return;
        }
        timer = setTimeout(measure, 100);
      });
    };
    timer = setTimeout(measure, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, anchorVersion, current, getTarget]);

  if (!active || !copy || !current) return null;

  const goToStep = (nextStep: number): void => {
    const next = TUTORIAL_STEPS[nextStep];
    if (!next) {
      dismiss();
      return;
    }
    setStep(nextStep);
    navigateTab(next.tab);
  };
  const padding = 8;
  const x = bounds ? Math.max(0, bounds.x - padding) : 0;
  const y = bounds ? Math.max(0, bounds.y - padding) : 0;
  const holeWidth = bounds ? Math.min(width - x, bounds.width + padding * 2) : 0;
  const holeHeight = bounds ? Math.min(height - y, bounds.height + padding * 2) : 0;
  const bottomInset = Math.max(insets.bottom, 12);
  const panelPosition = bounds && bounds.y + bounds.height / 2 > height / 2
    ? {top: insets.top + 8}
    : {bottom: bottomInset + 78};

  return (
    <View style={styles.root}>
      {bounds ? (
        <>
          <Pressable accessibilityLabel={t.tutorial.dismiss} onPress={dismiss} style={[styles.dim, {top: 0, left: 0, right: 0, height: y}]} />
          <Pressable accessibilityLabel={t.tutorial.dismiss} onPress={dismiss} style={[styles.dim, {top: y, left: 0, width: x, height: holeHeight}]} />
          <Pressable accessibilityLabel={t.tutorial.dismiss} onPress={dismiss} style={[styles.dim, {top: y, left: x + holeWidth, right: 0, height: holeHeight}]} />
          <Pressable accessibilityLabel={t.tutorial.dismiss} onPress={dismiss} style={[styles.dim, {top: y + holeHeight, left: 0, right: 0, bottom: 0}]} />
          <View pointerEvents="none" style={[styles.highlight, {left: x, top: y, width: holeWidth, height: holeHeight, borderColor: theme.primary}]} />
        </>
      ) : (
        <Pressable accessibilityLabel={t.tutorial.dismiss} onPress={dismiss} style={[styles.dim, StyleSheet.absoluteFill]} />
      )}
      <View style={[styles.card, {backgroundColor: theme.paper, borderColor: theme.border}, panelPosition]}>
        <View style={styles.headingRow}>
          <Text style={[styles.counter, {color: theme.primary}]}>{t.tutorial.stepOf.replace("{current}", String(step + 1)).replace("{total}", String(TUTORIAL_STEPS.length))}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t.tutorial.dismiss} onPress={dismiss} hitSlop={8}>
            <Text style={[styles.close, {color: theme.muted}]}>×</Text>
          </Pressable>
        </View>
        <Text style={[styles.title, {color: theme.text}]}>{copy.title}</Text>
        <Text style={[styles.body, {color: theme.muted}]}>{copy.body}</Text>
        <View style={[styles.divider, {backgroundColor: theme.border}]} />
        <View style={styles.actions}>
          <Pressable onPress={dismiss} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.actionLabel, {color: theme.muted}]}>{t.tutorial.skip}</Text>
          </Pressable>
          {step > 0 ? (
            <Pressable onPress={() => goToStep(step - 1)} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.actionLabel, {color: theme.text}]}>{t.tutorial.back}</Text>
            </Pressable>
          ) : null}
          <View style={styles.spacer} />
          <Pressable
            style={[styles.nextButton, {backgroundColor: theme.primary}]}
            onPress={() => goToStep(step + 1)}
            accessibilityRole="button"
          >
            <Text style={styles.nextLabel}>{step === TUTORIAL_STEPS.length - 1 ? t.tutorial.finish : t.tutorial.next}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, elevation: 1000},
  dim: {position: "absolute", backgroundColor: "rgba(2,6,23,0.62)"},
  highlight: {position: "absolute", borderWidth: 2, borderRadius: 14, backgroundColor: "transparent"},
  card: {position: "absolute", left: 16, right: 16, borderWidth: 1, borderRadius: 16, padding: 16, gap: 8, elevation: 12},
  headingRow: {flexDirection: "row", alignItems: "center", justifyContent: "space-between"},
  counter: {fontSize: 12, fontWeight: "700", textTransform: "uppercase"},
  close: {fontSize: 24, lineHeight: 24},
  title: {fontSize: 18, fontWeight: "700"},
  body: {fontSize: 14, lineHeight: 20},
  divider: {height: 1, marginTop: 2},
  actions: {flexDirection: "row", alignItems: "center", gap: 16, minHeight: 36},
  actionLabel: {fontSize: 13, fontWeight: "600"},
  spacer: {flex: 1},
  nextButton: {borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, minWidth: 86, alignItems: "center"},
  nextLabel: {color: "#fff", fontSize: 13, fontWeight: "700"},
});
