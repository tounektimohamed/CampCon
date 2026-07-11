import React, { useState, useEffect } from "react";
import { Download, Smartphone, X, Check, HelpCircle, ArrowDown, ChevronLeft, Info, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"ios" | "android" | "chrome">("ios");

  useEffect(() => {
    // 1. Detect if already in standalone/PWA mode
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Listen for the native install prompt event (Android / Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 3. Detect if already installed (alternative check)
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    // Detect browser default to guide better
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setActiveTab("ios");
    } else if (/android/.test(userAgent)) {
      setActiveTab("android");
    } else {
      setActiveTab("chrome");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Trigger native browser install prompt
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      // Show custom step-by-step instruction modal
      setShowModal(true);
    }
  };

  // If already installed or running as standalone, don't render the installation button
  if (isInstalled) return null;

  return (
    <>
      {/* Floating PWA Install FAB */}
      <div className="fixed bottom-6 left-6 z-40">
        <motion.button
          onClick={handleInstallClick}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black py-3 px-4.5 rounded-full shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 flex items-center gap-2 border border-amber-400/30 cursor-pointer text-xs select-none"
        >
          <div className="relative">
            <Smartphone className="w-4 h-4 animate-bounce" />
            <span className="absolute -top-1 -left-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
          </div>
          <span>تثبيت التطبيق للهاتف</span>
        </motion.button>
      </div>

      {/* PWA Install Guide Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-amber-100 text-right relative my-8"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 left-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-full transition-colors z-10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white text-center relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-400 rounded-full opacity-30"></div>
                <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-amber-700 rounded-full opacity-30"></div>
                
                <div className="mx-auto w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-3">
                  <Smartphone className="w-7 h-7 text-white" />
                </div>
                
                <h3 className="text-base font-black tracking-wide">تثبيت منصة Camp Connect كـ تطبيق 📱</h3>
                <p className="text-xs text-amber-50 mt-1 font-medium">
                  تمتع بتجربة تصفح سريعة وتلقي الإشعارات مباشرة كأنه تطبيق رسمي على هاتفك!
                </p>
              </div>

              {/* Tabs for OS Types */}
              <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1">
                <button
                  onClick={() => setActiveTab("ios")}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                    activeTab === "ios"
                      ? "bg-white text-amber-600 shadow-sm border border-amber-100"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  أجهزة آيفون (iOS)
                </button>
                <button
                  onClick={() => setActiveTab("android")}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                    activeTab === "android"
                      ? "bg-white text-amber-600 shadow-sm border border-amber-100"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  أجهزة أندرويد (Android)
                </button>
                <button
                  onClick={() => setActiveTab("chrome")}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                    activeTab === "chrome"
                      ? "bg-white text-amber-600 shadow-sm border border-amber-100"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  الكمبيوتر (Chrome)
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* iOS Instructions */}
                {activeTab === "ios" && (
                  <div className="space-y-4">
                    <div className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-100 p-3 rounded-2xl leading-normal">
                      💡 متصفح <span className="underline">Safari</span> يدعم تثبيت التطبيق بخطوات بسيطة كالتالي:
                    </div>
                    
                    <ol className="space-y-3.5 text-xs text-slate-700 font-bold">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                        <span>افتح الموقع عبر متصفح <span className="text-amber-600 font-extrabold">Safari</span> على الآيفون.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                        <div className="space-y-1">
                          <span>اضغط على زر المشاركة <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 border border-slate-200">مشاركة 📤</span> الموجود في شريط المتصفح بالأسفل.</span>
                        </div>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                        <span>اسحب القائمة للأعلى واختر <span className="text-amber-600 font-extrabold">"إضافة إلى الشاشة الرئيسية"</span> (Add to Home Screen) ➕.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">4</span>
                        <span>اضغط على كلمة <span className="text-amber-600 font-extrabold">"إضافة"</span> (Add) في الزاوية العلوية لتأكيد التثبيت.</span>
                      </li>
                    </ol>
                  </div>
                )}

                {/* Android Instructions */}
                {activeTab === "android" && (
                  <div className="space-y-4">
                    <div className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-100 p-3 rounded-2xl leading-normal">
                      💡 يمكنك تثبيت التطبيق مباشرة من المتصفح (Chrome, Edge, Samsung Internet) كالتالي:
                    </div>

                    <ol className="space-y-3.5 text-xs text-slate-700 font-bold">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                        <span>اضغط على زر النقاط الثلاثة <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">⁝</span> في الزاوية العلوية للمتصفح.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                        <span>اختر <span className="text-amber-600 font-extrabold">"تثبيت التطبيق"</span> (Install App) أو <span className="text-amber-600 font-extrabold">"إضافة للشاشة الرئيسية"</span>.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                        <span>وافق على التثبيت، وسيظهر الرمز الخاص بالمنصة على شاشة هاتفك فوراً!</span>
                      </li>
                    </ol>
                  </div>
                )}

                {/* Desktop Instructions */}
                {activeTab === "chrome" && (
                  <div className="space-y-4">
                    <div className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-100 p-3 rounded-2xl leading-normal">
                      💡 لتثبيت التطبيق على جهاز الكمبيوتر باستخدام متصفح Chrome أو Edge:
                    </div>

                    <ol className="space-y-3.5 text-xs text-slate-700 font-bold">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                        <span>انظر إلى شريط العنوان (URL bar) بالمتصفح في الأعلى جهة اليسار/اليمين.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                        <span>اضغط على أيقونة الشاشة مع السهم <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">💻 📥</span> التي تظهر بجانب المفضلة.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                        <span>اضغط على زر <span className="text-amber-600 font-extrabold">"تثبيت"</span> (Install)، وسيفتح الموقع في نافذة تطبيق مستقلة رائعة!</span>
                      </li>
                    </ol>
                  </div>
                )}

                {/* Benefits / Info Section */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-600 font-bold leading-relaxed">
                    ميزة PWA تسمح لك بمتابعة نشاطات أطفالك، ومعرض الصور اليومي، وتقارير المعلمين مباشرة وبسرعة فائقة من الشاشة الرئيسية، حتى مع ضعف شبكة الإنترنت!
                  </p>
                </div>

                {/* Confirm/Dismiss Button */}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 transition-all cursor-pointer text-center"
                >
                  حسناً، فهمت الطريقة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
