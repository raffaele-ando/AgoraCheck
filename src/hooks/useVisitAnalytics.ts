import { useEffect, useRef, useState, useCallback } from "react";
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { signInAnonymously } from "firebase/auth";

function uuidv4() {
  return crypto.randomUUID();
}

export function useVisitAnalytics() {
  const [sessionId] = useState(() => {
    const existing = sessionStorage.getItem("visit_session_id");
    if (existing) return existing;
    const newId = uuidv4();
    sessionStorage.setItem("visit_session_id", newId);
    return newId;
  });

  const timeSpentRef = useRef({
    timeSpentWhen: 0,
    timeSpentWhere: 0,
    timeSpentLookingFor: 0,
    timeSpentInstagram: 0,
  });

  const lastActiveFieldRef = useRef<string | null>(null);
  const activeFocusStartRef = useRef<number | null>(null);
  const hasSubmittedRef = useRef(false);
  const docCreatedRef = useRef(false);

  const shouldTrackRef = useRef<boolean>(false);
  const settingsLoadedRef = useRef(false);

  useEffect(() => {
    const initTracking = async () => {
      const isInstagramBrowser = navigator.userAgent.includes("Instagram");
      let ignoreAnalytics = false;
      try { ignoreAnalytics = localStorage.getItem("IGNORE_ANALYTICS") === "true"; } catch {}

      if (ignoreAnalytics) {
        shouldTrackRef.current = false;
        settingsLoadedRef.current = true;
        return;
      }

      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth error in analytics:", e);
      }

      try {
        const docSnap = await getDoc(doc(db, "settings", "analytics"));
        let forceTrackAll = false;
        if (docSnap.exists() && docSnap.data().trackAllBrowsers) {
          forceTrackAll = true;
        }
        shouldTrackRef.current = isInstagramBrowser || forceTrackAll;
      } catch (e) {
        console.error("Settings fetch error:", e);
        shouldTrackRef.current = isInstagramBrowser; // Fallback
      }

      settingsLoadedRef.current = true;
      createDocOnce();
    };

    initTracking();
  }, []);

  useEffect(() => {
    const savedState = sessionStorage.getItem(`visit_state_${sessionId}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        timeSpentRef.current = parsed.timeSpent || timeSpentRef.current;
        lastActiveFieldRef.current = parsed.lastActiveField || null;
        hasSubmittedRef.current = parsed.hasSubmitted || false;
        docCreatedRef.current = parsed.docCreated || false;
      } catch (e) {}
    }
  }, [sessionId]);

  const saveToSession = useCallback(() => {
    sessionStorage.setItem(`visit_state_${sessionId}`, JSON.stringify({
      timeSpent: timeSpentRef.current,
      lastActiveField: lastActiveFieldRef.current,
      hasSubmitted: hasSubmittedRef.current,
      docCreated: docCreatedRef.current,
    }));
  }, [sessionId]);

  const createDocOnce = useCallback(async () => {
    if (docCreatedRef.current || !settingsLoadedRef.current || !shouldTrackRef.current) return;
    docCreatedRef.current = true;
    saveToSession();
    try {
      await setDoc(doc(db, "analytics_visits", sessionId), {
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent.slice(0, 600),
        hasSubmitted: hasSubmittedRef.current,
        timeSpentWhen: 0,
        timeSpentWhere: 0,
        timeSpentLookingFor: 0,
        timeSpentInstagram: 0,
        abandonedAfter: "none",
      }, { merge: true });
    } catch (e) {
      console.error(e);
      docCreatedRef.current = false;
    }
  }, [sessionId, saveToSession]);

  const flushCurrentFocus = useCallback(() => {
    if (lastActiveFieldRef.current && activeFocusStartRef.current) {
      const field = lastActiveFieldRef.current as keyof typeof timeSpentRef.current;
      const duration = Date.now() - activeFocusStartRef.current;
      if (timeSpentRef.current[field] !== undefined) {
          timeSpentRef.current[field] += duration;
      }
      activeFocusStartRef.current = Date.now();
      saveToSession();
    }
  }, [saveToSession]);

  const updateFirebase = useCallback(() => {
    if (!docCreatedRef.current) return;
    saveToSession();
    
    // Convert ms to seconds
    const dataToUpdate = {
      hasSubmitted: hasSubmittedRef.current,
      timeSpentWhen: Math.round(timeSpentRef.current.timeSpentWhen / 1000),
      timeSpentWhere: Math.round(timeSpentRef.current.timeSpentWhere / 1000),
      timeSpentLookingFor: Math.round(timeSpentRef.current.timeSpentLookingFor / 1000),
      timeSpentInstagram: Math.round(timeSpentRef.current.timeSpentInstagram / 1000),
      abandonedAfter: hasSubmittedRef.current ? "submitted" : (lastActiveFieldRef.current || "none"),
    };

    updateDoc(doc(db, "analytics_visits", sessionId), dataToUpdate).catch(() => {});
  }, [sessionId, saveToSession]);

  useEffect(() => {
    createDocOnce();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushCurrentFocus();
        updateFirebase();
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);

    const handleBeforeUnload = () => {
      flushCurrentFocus();
      updateFirebase();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushCurrentFocus();
      updateFirebase();
    };
  }, [createDocOnce, flushCurrentFocus, updateFirebase]);

  const handleFocus = (field: string) => {
    createDocOnce();
    flushCurrentFocus();
    if (!field.startsWith('timeSpent')) {
        field = 'timeSpent' + field.charAt(0).toUpperCase() + field.slice(1);
    }
    lastActiveFieldRef.current = field;
    activeFocusStartRef.current = Date.now();
  };

  const handleBlur = (field: string) => {
    flushCurrentFocus();
    activeFocusStartRef.current = null;
    updateFirebase();
  };

  const markSubmitted = () => {
    hasSubmittedRef.current = true;
    flushCurrentFocus();
    updateFirebase();
  };

  return { handleFocus, handleBlur, markSubmitted };
}
