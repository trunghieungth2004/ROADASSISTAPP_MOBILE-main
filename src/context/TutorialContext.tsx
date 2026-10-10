import AsyncStorage from "@react-native-async-storage/async-storage";
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from "react";
import type {View} from "react-native";
import {useAuth} from "./AuthContext";

export type TutorialStep = {
  target: string;
  tab: string;
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {target: "routeDestination", tab: "Route"},
  {target: "routeVehicle", tab: "Route"},
  {target: "routeHazards", tab: "Route"},
  {target: "routeLocation", tab: "Route"},
  {target: "routeLocation", tab: "Route"},
  {target: "hazardsTab", tab: "Hazards"},
  {target: "assistTab", tab: "Assist"},
  {target: "routeTab", tab: "Route"},
  {target: "moreTab", tab: "More"},
  {target: "moreProfile", tab: "More"},
];

type TutorialContextValue = {
  active: boolean;
  step: number;
  anchorVersion: number;
  start: () => void;
  dismiss: () => void;
  setStep: (step: number) => void;
  getTargetRef: (name: string) => (node: View | null) => void;
  getTarget: (name: string) => View | null;
  setTabNavigation: (navigate: (tab: string) => void) => void;
  navigateTab: (tab: string) => void;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);
const STORAGE_PREFIX = "roadassist.tutorial.v1";

export function TutorialProvider({children}: {children: ReactNode}) {
  const {uid} = useAuth();
  const anchors = useRef(new Map<string, View>());
  const targetCallbacks = useRef(new Map<string, (node: View | null) => void>());
  const navigateTabRef = useRef<(tab: string) => void>(() => {});
  const autoStarted = useRef(false);
  const [anchorVersion, setAnchorVersion] = useState(0);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);

  const storageKey = `${STORAGE_PREFIX}.${uid ?? "guest"}`;

  useEffect(() => {
    let mounted = true;
    setReady(false);
    setCompleted(false);
    autoStarted.current = false;
    void AsyncStorage.getItem(storageKey).then((value) => {
      if (!mounted) return;
      setCompleted(value === "done");
      setReady(true);
    }).catch((error: unknown) => {
      console.error("Unable to load tutorial completion state", error);
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const getTargetRef = useCallback((name: string) => {
    let callback = targetCallbacks.current.get(name);
    if (!callback) {
      callback = (node) => {
        const existing = anchors.current.get(name);
        if (node) {
          if (existing === node) return;
          anchors.current.set(name, node);
        } else {
          if (!existing) return;
          anchors.current.delete(name);
        }
        setAnchorVersion((version) => version + 1);
      };
      targetCallbacks.current.set(name, callback);
    }
    return callback;
  }, []);
  const getTarget = useCallback((name: string) => anchors.current.get(name) ?? null, []);

  const start = useCallback(() => {
    setStep(0);
    setActive(true);
    navigateTabRef.current(TUTORIAL_STEPS[0].tab);
  }, []);

  const dismiss = useCallback(() => {
    setActive(false);
    setCompleted(true);
    void AsyncStorage.setItem(storageKey, "done").catch((error: unknown) => {
      console.error("Unable to save tutorial completion state", error);
    });
  }, [storageKey]);

  const setTabNavigation = useCallback((navigate: (tab: string) => void) => {
    navigateTabRef.current = navigate;
  }, []);
  const navigateTab = useCallback((tab: string) => {
    navigateTabRef.current(tab);
  }, []);

  useEffect(() => {
    if (!ready || completed || active || autoStarted.current || !anchors.current.has("routeDestination")) return;
    const timer = setTimeout(() => {
      autoStarted.current = true;
      start();
    }, 700);
    return () => clearTimeout(timer);
  }, [active, anchorVersion, completed, ready, start]);

  const value = useMemo<TutorialContextValue>(() => ({
    active,
    step,
    anchorVersion,
    start,
    dismiss,
    setStep,
    getTargetRef,
    getTarget,
    setTabNavigation,
    navigateTab,
  }), [active, step, anchorVersion, start, dismiss, getTargetRef, getTarget, setTabNavigation, navigateTab]);

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial(): TutorialContextValue {
  const context = useContext(TutorialContext);
  if (!context) throw new Error("useTutorial must be used within TutorialProvider");
  return context;
}
