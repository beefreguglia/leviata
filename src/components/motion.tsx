"use client";

import { MotionConfig, motion, type HTMLMotionProps, type Transition } from "motion/react";

/** Mola padrão do painel (rápida, sem bounce exagerado) — ver skill apple-hig-ui. */
export const spring: Transition = { type: "spring", stiffness: 400, damping: 32, mass: 0.8 };

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={spring}>
      {children}
    </MotionConfig>
  );
}

/** Entrada simples: fade + sobe 8px. */
export function FadeIn({ delay = 0, ...props }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      {...props}
    />
  );
}

/** Container que anima os filhos <StaggerItem> em sequência. */
export function Stagger({ step = 0.04, ...props }: HTMLMotionProps<"div"> & { step?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: step } } }}
      {...props}
    />
  );
}

export function StaggerItem(props: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: spring } }}
      {...props}
    />
  );
}
