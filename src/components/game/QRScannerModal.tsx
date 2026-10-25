/**
 * QRScannerModal
 * 
 * Full-screen modal for scanning physical Phomu cards.
 * Uses html5-qrcode for browser-based scanning.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export function QRScannerModal({ isOpen, onClose, onScan }: QRScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the container is rendered
      const timer = setTimeout(() => {
        try {
          scannerRef.current = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
          );
          
          scannerRef.current.render(
            (decodedText) => {
              onScan(decodedText);
              onClose();
            },
            (errorMessage) => {
              // Ignore constant "no QR found" messages
            }
          );
        } catch (err) {
          console.error("QR Initialization failed", err);
          setError("Kamera konnte nicht initialisiert werden.");
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.error("QR Cleanup failed", err));
        }
      };
    }
  }, [isOpen, onClose, onScan]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-xl p-6"
        >
          <header className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-black uppercase text-white">QR Scanner</h2>
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest text-white">Halte eine Phomu-Karte vor die Kamera</p>
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black"
            >
              ✕
            </button>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center">
            <div 
              id="qr-reader" 
              className="w-full max-w-sm overflow-hidden rounded-3xl border-2 border-white/20 bg-black/40"
            />
            {error && (
              <p className="mt-4 text-red-500 font-bold text-sm bg-red-500/10 px-4 py-2 rounded-xl">{error}</p>
            )}
            
            <div className="mt-12 text-center space-y-4 max-w-xs">
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping" />
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping animation-delay-300" />
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping animation-delay-600" />
              </div>
              <p className="text-xs text-white/40 font-bold uppercase leading-relaxed">
                Scanne den Code auf der Rückseite deiner Spielkarte um den Song sofort auf den Tisch zu bringen.
              </p>
            </div>
          </div>

          <footer className="mt-auto pt-8">
            <button 
              onClick={onClose}
              className="w-full py-5 bg-white text-black rounded-3xl font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              Abbrechen
            </button>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
