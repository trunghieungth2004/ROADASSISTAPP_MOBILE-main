import type {ReactNode} from "react";
import {BlurTargetView, BlurView} from "expo-blur";
import {createContext, useContext, useRef, type RefObject} from "react";
import {Platform, StyleSheet, View, type StyleProp, type ViewStyle} from "react-native";
import type {AppTheme} from "../theme";

const GlassTargetContext = createContext<RefObject<View | null> | null>(null);

type Props = {
  theme: AppTheme;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
};

export function GlassTargetProvider({children}: {children: ReactNode}) {
  const target = useRef<View>(null);
  return <GlassTargetContext.Provider value={target}>{children}</GlassTargetContext.Provider>;
}

export function useGlassTarget(): RefObject<View | null> | null {
  return useContext(GlassTargetContext);
}

export function GlassTarget({children, style}: {children: ReactNode; style?: StyleProp<ViewStyle>}) {
  const target = useGlassTarget();
  return target ? <BlurTargetView ref={target} style={style}>{children}</BlurTargetView> : <View style={style}>{children}</View>;
}

export default function GlassSurface({theme, children, style, intensity = 70}: Props) {
  const dark = theme.text === "#ffffff";
  const blurTarget = useGlassTarget();
  return (
    <BlurView
      intensity={intensity}
      tint={dark ? "dark" : "light"}
      blurTarget={blurTarget ?? undefined}
      blurMethod={Platform.OS === "android" && blurTarget ? "dimezisBlurViewSdk31Plus" : "none"}
      style={[styles.surface, {backgroundColor: theme.glassBackground, borderColor: theme.glassBorder}, style]}
    >
      <View pointerEvents="none" style={styles.highlight} />
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  highlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.42)",
  },
});
