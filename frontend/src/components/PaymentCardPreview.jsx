import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const PaymentCardPreview = ({ number, name, expiry, cvv, type, focused }) => {
  const formatNumber = (num) => {
    const d = num.replace(/\D/g, "").padEnd(16, "•");
    return `${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8, 12)} ${d.slice(12, 16)}`;
  };

  const maskedCvv = (c) => String(c).replace(/./g, "•").padEnd(3, "•");

  return (
    <div className="perspective-1000 w-full max-w-[340px] h-[200px] mx-auto mb-10">
      <motion.div
        animate={{ rotateY: focused === "cvv" ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        className="relative w-full h-full preserve-3d"
      >
        {/* Front */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-[#1e1e1e] to-[#3a3a3a] rounded-2xl p-6 text-white shadow-2xl flex flex-col justify-between border border-white/10 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          
          <div className="flex justify-between items-start z-10">
            <div className="w-12 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg shadow-inner" />
            <div className="text-xl font-bold italic opacity-80">{type === "visa" ? "VISA" : "Mastercard"}</div>
          </div>

          <div className="z-10">
            <div className={`text-2xl font-mono tracking-[0.2em] mb-4 transition-all ${focused === "number" ? "scale-105 origin-left text-red-500" : ""}`}>
              {formatNumber(number)}
            </div>
            <div className="flex justify-between items-end">
              <div className="flex-1">
                <div className="text-[10px] uppercase opacity-50 mb-1">Card Holder</div>
                <div className={`text-sm font-bold tracking-wider truncate uppercase ${focused === "name" ? "text-red-500" : ""}`}>{name || "YOUR NAME"}</div>
              </div>
              <div className="ml-4">
                <div className="text-[10px] uppercase opacity-50 mb-1">Expires</div>
                <div className={`text-sm font-bold ${focused === "expiry" ? "text-red-500" : ""}`}>{expiry || "MM/YY"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 w-full h-full backface-hidden [transform:rotateY(180deg)] bg-gradient-to-br from-[#1e1e1e] to-[#2a2a2a] rounded-2xl py-6 text-white shadow-2xl border border-white/10">
          <div className="w-full h-10 bg-black/80 mt-2 mb-4" />
          <div className="px-6 flex flex-col items-end">
            <div className="text-[8px] uppercase opacity-50 mb-1 mr-2">CVV</div>
            <div className="w-full bg-white h-10 rounded flex items-center justify-end px-3">
               <span className="text-black font-mono font-bold tracking-widest">{maskedCvv(cvv)}</span>
            </div>
            <div className="mt-4 text-[8px] opacity-30 px-4 text-center leading-tight">
              This card is a secure demo representantion. Do not use real sensitive data in public environments.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentCardPreview;
