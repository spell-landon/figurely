import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform, useInView, MotionValue } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  initial?: number;
  format?: "currency" | "number" | "percentage";
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  initial = 0,
  format = "number",
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: AnimatedCounterProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  const spring = useSpring(initial, {
    mass: 0.8,
    stiffness: 75,
    damping: 15,
  });

  const display = useTransform(spring, (current) => {
    const rounded = Number(current.toFixed(decimals));

    if (format === "currency") {
      return rounded.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }

    if (format === "percentage") {
      return rounded.toFixed(decimals);
    }

    return rounded.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  });

  // Use state to store the current display value for SSR compatibility
  const [displayValue, setDisplayValue] = useState(() => {
    const rounded = Number(initial.toFixed(decimals));
    if (format === "currency") {
      return rounded.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    if (format === "percentage") {
      return rounded.toFixed(decimals);
    }
    return rounded.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  });

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    } else {
      spring.set(initial);
    }
  }, [isInView, spring, value, initial]);

  useEffect(() => {
    return display.on("change", (latest) => {
      setDisplayValue(latest);
    });
  }, [display]);

  return (
    <motion.span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </motion.span>
  );
}
