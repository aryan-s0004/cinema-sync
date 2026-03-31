import React from "react";
import { motion } from "framer-motion";

const CinemaBrandPanel = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-12 text-white text-center">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-1/4 -left-10 w-64 h-64 bg-[#E50914] rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-10 w-64 h-64 bg-[#0F3460] rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="z-10"
      >
        <h1 className="text-6xl font-black tracking-tighter mb-4">
          CINEMA<span className="text-[#E50914]">SYNC</span>
        </h1>
        <p className="text-xl text-white/70 max-w-sm mx-auto font-medium leading-relaxed">
          The most immersive movie booking experience. Sync your cinema, select your seat, and enjoy the show.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="absolute bottom-10 left-10 text-8xl font-black select-none pointer-events-none"
      >
        ADMIT ONE
      </motion.div>
    </div>
  );
};

export default CinemaBrandPanel;
