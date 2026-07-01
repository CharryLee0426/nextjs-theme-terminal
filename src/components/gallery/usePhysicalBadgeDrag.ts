"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Options = {
  ignoreSelector?: string;
  onTap?: () => void;
};

const DRAG_THRESHOLD_PX = 5;
const MAX_TILT_DEG = 9;

function setDragVars(el: HTMLElement, x: number, y: number) {
  const tilt = Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, x * 0.035));
  el.style.setProperty("--badge-x", `${x}px`);
  el.style.setProperty("--badge-y", `${y}px`);
  el.style.setProperty("--badge-rot", `${tilt}deg`);
}

export function usePhysicalBadgeDrag<T extends HTMLElement>({
  ignoreSelector,
  onTap,
}: Options = {}) {
  const ref = useRef<T | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const returnTimerRef = useRef<number | null>(null);
  const finishDragRef = useRef<(pointerId: number, allowTap: boolean) => void>(
    () => {},
  );

  const shouldIgnore = useCallback(
    (target: EventTarget | null) => {
      if (!ignoreSelector || !(target instanceof Element)) return false;
      return target.closest(ignoreSelector) != null;
    },
    [ignoreSelector],
  );

  const resetBadge = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("is-physical-dragging");
    el.classList.add("is-physical-returning");
    setDragVars(el, 0, 0);
    if (returnTimerRef.current != null) {
      window.clearTimeout(returnTimerRef.current);
    }
    returnTimerRef.current = window.setTimeout(() => {
      el.classList.remove("is-physical-returning");
      returnTimerRef.current = null;
    }, 520);
  }, []);

  const moveBadge = useCallback((clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const dx = clientX - startRef.current.x;
    const dy = clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      movedRef.current = true;
    }
    setDragVars(el, dx, dy);
  }, []);

  const onWindowPointerMove = useCallback(
    (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return;
      moveBadge(event.clientX, event.clientY);
    },
    [moveBadge],
  );

  const onWindowPointerUp = useCallback(
    (event: PointerEvent) => finishDragRef.current(event.pointerId, true),
    [],
  );

  const onWindowPointerCancel = useCallback(
    (event: PointerEvent) => finishDragRef.current(event.pointerId, false),
    [],
  );

  const removeWindowListeners = useCallback(() => {
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerCancel);
  }, [onWindowPointerCancel, onWindowPointerMove, onWindowPointerUp]);

  const finishDrag = useCallback(
    (pointerId: number, allowTap: boolean) => {
      if (pointerIdRef.current !== pointerId) return;
      const el = ref.current;
      pointerIdRef.current = null;
      if (el?.hasPointerCapture?.(pointerId)) {
        el.releasePointerCapture(pointerId);
      }
      removeWindowListeners();
      const moved = movedRef.current;
      if (moved) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
      resetBadge();
      if (allowTap && !moved) {
        onTap?.();
      }
    },
    [onTap, removeWindowListeners, resetBadge],
  );

  useEffect(() => {
    finishDragRef.current = finishDrag;
  }, [finishDrag]);

  useEffect(() => {
    return () => {
      removeWindowListeners();
      if (returnTimerRef.current != null) {
        window.clearTimeout(returnTimerRef.current);
      }
    };
  }, [removeWindowListeners]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<T>) => {
      if (event.button !== 0 || shouldIgnore(event.target)) return;
      const el = ref.current;
      if (!el) return;
      pointerIdRef.current = event.pointerId;
      startRef.current = { x: event.clientX, y: event.clientY };
      movedRef.current = false;
      suppressClickRef.current = false;
      if (returnTimerRef.current != null) {
        window.clearTimeout(returnTimerRef.current);
        returnTimerRef.current = null;
      }
      el.classList.remove("is-physical-returning");
      el.classList.add("is-physical-dragging");
      el.setPointerCapture(event.pointerId);
      window.addEventListener("pointermove", onWindowPointerMove);
      window.addEventListener("pointerup", onWindowPointerUp);
      window.addEventListener("pointercancel", onWindowPointerCancel);
    },
    [
      onWindowPointerCancel,
      onWindowPointerMove,
      onWindowPointerUp,
      shouldIgnore,
    ],
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<T>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    moveBadge(event.clientX, event.clientY);
  }, [moveBadge]);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<T>) => finishDrag(event.pointerId, true),
    [finishDrag],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<T>) => finishDrag(event.pointerId, false),
    [finishDrag],
  );

  const onClickCapture = useCallback((event: ReactMouseEvent<T>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    ref,
    onClickCapture,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
