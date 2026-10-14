"use client";

import { Children, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type MotionListProps = {
  children: ReactNode;
  className?: string;
  maxAnimatedItems?: number;
};

export function MotionList({
  children,
  className,
  maxAnimatedItems = 8,
}: MotionListProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: reducedMotion
            ? { duration: 0 }
            : { staggerChildren: 0.035, delayChildren: 0.015 },
        },
      }}
    >
      {Children.map(children, (child, index) =>
        index < maxAnimatedItems ? (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 5 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
              },
            }}
          >
            {child}
          </motion.div>
        ) : (
          <div>{child}</div>
        ),
      )}
    </motion.div>
  );
}
