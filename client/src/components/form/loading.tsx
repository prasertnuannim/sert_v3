"use client";

import { motion } from "framer-motion";

interface LoadingProps {
  message?: string;
}

export default function Loading({ message }: LoadingProps) {
  const text = message ?? "Loading";
  const colors = ["#1e40af", "#9333ea", "#0ea5e9", "#db2777", "#1e40af"];

  return (
    <div
      className="
        fixed inset-0 z-50 
        flex flex-col justify-center items-center gap-4
        backdrop-blur-md
      "
    >
      {/* Bouncing dots */}
      <div className="flex space-x-2">
        {[0, 0.2, 0.4].map((delay, index) => (
          <motion.span
            key={index}
            className="w-4 h-4 rounded-full"
            animate={{
              y: ["0%", "-60%", "0%"],
              scale: [1, 1.3, 1],
              backgroundColor: colors,
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut",
              delay,
            }}
          />
        ))}
      </div>

      {/* Text animation */}
      <div className="flex space-x-1 text-2xl font-bold">
        {text.split("").map((char, i) => (
          <motion.span
            key={i}
            animate={{
              color: colors,
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
