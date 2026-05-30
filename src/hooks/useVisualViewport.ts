"use client";

import { useState, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";

export interface ViewportMetrics {
  height: number;
  width: number;
  offsetTop: number;
  isKeyboardOpen: boolean;
}

export function useVisualViewport() {
  const setGlobalKeyboardOpen = useChatStore((state) => state.setKeyboardOpen);

  const [metrics, setMetrics] = useState<ViewportMetrics>({
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    offsetTop: 0,
    isKeyboardOpen: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      const width = vv ? vv.width : window.innerWidth;
      const height = vv ? vv.height : window.innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;

      // On mobile, if active element is an input/textarea and visual viewport is smaller than window.innerHeight, keyboard is open.
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768;

      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true");

      // Keyboard usually takes up > 15% of screen height
      const isKeyboardOpen = !!(isMobile && isInputFocused && height < window.innerHeight * 0.85);

      setMetrics((prev) => {
        // Only update local state if values actually changed to prevent redundant renders
        if (
          prev.height === height &&
          prev.width === width &&
          prev.offsetTop === offsetTop &&
          prev.isKeyboardOpen === isKeyboardOpen
        ) {
          return prev;
        }
        return { height, width, offsetTop, isKeyboardOpen };
      });

      // Synchronize to the global Zustand store only when the keyboard state transitions
      setGlobalKeyboardOpen(isKeyboardOpen);
    };

    // Listen to visualViewport resize and scroll events
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", handleViewportChange);
      vv.addEventListener("scroll", handleViewportChange);
    } else {
      window.addEventListener("resize", handleViewportChange);
    }

    // Also listen to focusin/focusout to catch keyboard state changes instantly
    window.addEventListener("focusin", handleViewportChange);
    window.addEventListener("focusout", handleViewportChange);

    // Initial run
    handleViewportChange();

    return () => {
      if (vv) {
        vv.removeEventListener("resize", handleViewportChange);
        vv.removeEventListener("scroll", handleViewportChange);
      } else {
        window.removeEventListener("resize", handleViewportChange);
      }
      window.removeEventListener("focusin", handleViewportChange);
      window.removeEventListener("focusout", handleViewportChange);
    };
  }, [setGlobalKeyboardOpen]);

  return metrics;
}
