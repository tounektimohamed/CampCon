import React, { useState, useEffect } from "react";
import { Download, Smartphone, X, Check, HelpCircle, ArrowDown, ChevronLeft, Info, RefreshCw, Puzzle, Chrome, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";

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
  const [activeTab, setActiveTab] = useState<"ios" | "android" | "chrome" | "extension">("ios");
  const [isGeneratingExtension, setIsGeneratingExtension] = useState(false);
  const [extensionDownloadSuccess, setExtensionDownloadSuccess] = useState(false);

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

  const handleDownloadExtensionZip = async () => {
    setIsGeneratingExtension(true);
    setExtensionDownloadSuccess(false);

    try {
      const zip = new JSZip();
      
      // 1. manifest.json for Extension V3
      const manifest = {
        manifest_version: 3,
        name: "Camp Connect | تواصل المخيم الصيفي",
        version: "1.0.0",
        description: "إضافة متصفح سريعة للوصول المباشر ومتابعة أنشطة الأبناء في المخيم الصيفي.",
        icons: {
          "16": "icon16.png",
          "48": "icon48.png",
          "128": "icon128.png"
        },
        action: {
          "default_popup": "popup.html",
          "default_icon": "icon128.png"
        },
        permissions: []
      };

      zip.file("manifest.json", JSON.stringify(manifest, null, 2));

      // 2. popup.html
      const popupHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      width: 320px;
      margin: 0;
      padding: 0;
      background-color: #fffbeb;
      color: #1e293b;
      text-align: center;
    }
    .header {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      padding: 20px 15px;
      border-bottom-left-radius: 20px;
      border-bottom-right-radius: 20px;
      box-shadow: 0 4px 10px rgba(217, 119, 6, 0.15);
    }
    .logo {
      width: 65px;
      height: 65px;
      border-radius: 16px;
      border: 3px solid rgba(255, 255, 255, 0.4);
      margin: 0 auto 10px auto;
      display: block;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .title {
      font-size: 16px;
      font-weight: 900;
      margin: 0;
    }
    .subtitle {
      font-size: 11px;
      opacity: 0.9;
      margin-top: 4px;
    }
    .content {
      padding: 20px 15px;
    }
    .card {
      background: white;
      border: 1px solid #fef3c7;
      border-radius: 16px;
      padding: 15px;
      margin-bottom: 15px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.02);
    }
    .info {
      font-size: 11px;
      font-weight: 700;
      color: #b45309;
      line-height: 1.5;
      margin: 0;
    }
    .btn {
      display: block;
      width: 100%;
      box-sizing: border-box;
      background: linear-gradient(to right, #f59e0b, #d97706);
      color: white;
      border: none;
      padding: 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .btn:hover {
      background: linear-gradient(to right, #d97706, #b45309);
      transform: translateY(-1px);
    }
    .footer {
      font-size: 9px;
      color: #94a3b8;
      padding-bottom: 15px;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="icon128.png" class="logo" alt="Logo">
    <div class="title">مخيم Camp Connect</div>
    <div class="subtitle">بوابة تواصل وأنشطة الأبناء اليومية</div>
  </div>
  <div class="content">
    <div class="card">
      <p class="info">تابع تقارير المعلمين، الحضور، الإنجازات اليومية، ومعرض الصور أولاً بأول مباشرة من متصفحك!</p>
    </div>
    <button id="openPortalBtn" class="btn">الذهاب إلى المنصة 🚀</button>
  </div>
  <div class="footer">جميع الحقوق محفوظة © مخيم تواصل الصيفي</div>
  <script src="popup.js"></script>
</body>
</html>`;

      zip.file("popup.html", popupHtml);

      // 3. popup.js (uses the current domain context so it routes correctly)
      const portalUrl = window.location.origin;
      const popupJs = `document.getElementById('openPortalBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: "${portalUrl}" });
});`;

      zip.file("popup.js", popupJs);

      // 4. Load the official application logo image
      try {
        const logoRes = await fetch("/logo_camp_192.png");
        const logoBlob = await logoRes.blob();
        zip.file("icon16.png", logoBlob);
        zip.file("icon48.png", logoBlob);
        zip.file("icon128.png", logoBlob);
      } catch (err) {
        console.error("Failed to load logo image for extension packaging, using fallback placeholder", err);
      }

      // Generate the zip binary
      const zipContent = await zip.generateAsync({ type: "blob" });
      
      // Trigger a direct client browser download of the ZIP file
      const downloadUrl = URL.createObjectURL(zipContent);
      const tempLink = document.createElement("a");
      tempLink.href = downloadUrl;
      tempLink.download = "camp_connect_chrome_extension.zip";
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(downloadUrl);

      setExtensionDownloadSuccess(true);
    } catch (e) {
      console.error("Failed to generate and package the Chrome Extension", e);
    } finally {
      setIsGeneratingExtension(false);
    }
  };

  // If already installed or running as standalone, don't render the installation button
  if (isInstalled) return null;

  return (
    <>
      {/* Floating PWA / Extension Install FAB */}
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
            <Puzzle className="w-4 h-4 animate-bounce" />
            <span className="absolute -top-1 -left-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
          </div>
          <span>تنزيل تطبيق أو إضافة المتصفح 💻📱</span>
        </motion.button>
      </div>

      {/* PWA / Extension Install Guide Modal */}
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
                  <Puzzle className="w-7 h-7 text-white" />
                </div>
                
                <h3 className="text-base font-black tracking-wide">تثبيت منصة Camp Connect كـ تطبيق أو إضافة 📱</h3>
                <p className="text-xs text-amber-50 mt-1 font-medium">
                  اختر الطريقة الأنسب لهاتفك أو جهاز الكمبيوتر لسهولة وسرعة الوصول
                </p>
              </div>

              {/* Tabs for OS Types & Extension */}
              <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("extension")}
                  className={`flex-none px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1 ${
                    activeTab === "extension"
                      ? "bg-white text-amber-600 shadow-sm border border-amber-100"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <Puzzle className="w-3.5 h-3.5" />
                  <span>إضافة المتصفح (Extension)</span>
                </button>
                <button
                  onClick={() => setActiveTab("ios")}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                    activeTab === "ios"
                      ? "bg-white text-amber-600 shadow-sm border border-amber-100"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  آيفون (iOS)
                </button>
                <button
                  onClick={() => setActiveTab("android")}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                    activeTab === "android"
                      ? "bg-white text-amber-600 shadow-sm border border-amber-100"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  أندرويد (Android)
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
                {/* Extension Instructions */}
                {activeTab === "extension" && (
                  <div className="space-y-4">
                    <div className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-100 p-4 rounded-2xl leading-normal space-y-2">
                      <p className="flex items-center gap-1.5 font-black text-[13px]">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>إضافة متصفح حقيقية بشعار مخيم تواصل! 🛡️</span>
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        قم بتحميل الملحق وتثبيته في متصفحك (Chrome أو Edge أو Opera) على الكمبيوتر للوصول الفوري للمنصة ومتابعة أطفالك بنقرة زر واحدة من شريط المتصفح!
                      </p>
                    </div>

                    {/* Download Button */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleDownloadExtensionZip}
                        disabled={isGeneratingExtension}
                        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all transform hover:-translate-y-0.5 cursor-pointer text-center flex items-center justify-center gap-2 select-none"
                      >
                        {isGeneratingExtension ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>جاري إنشاء ملف الإضافة المتكامل...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>تحميل ملف إضافة الكروم (.zip) الآن 📥</span>
                          </>
                        )}
                      </button>

                      {extensionDownloadSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100 py-2 rounded-xl"
                        >
                          ✓ تم تحميل الملف بنجاح! اتبع الخطوات أدناه لتثبيته.
                        </motion.div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <h4 className="text-xs font-black text-slate-800 mb-2">🛠️ طريقة التثبيت في المتصفح في دقيقة واحدة:</h4>
                      <ol className="space-y-3 text-[11px] text-slate-600 font-bold leading-relaxed">
                        <li className="flex items-start gap-2">
                          <span className="w-4.5 h-4.5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">1</span>
                          <span>فك الضغط عن ملف الـ <span className="text-amber-600 font-extrabold">zip</span> الذي قمت بتحميله للتو لتستخرج المجلد.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4.5 h-4.5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">2</span>
                          <span>افتح متصفحك واذهب إلى صفحة الإضافات عبر هذا الرابط: <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 border border-slate-200 select-all font-mono">chrome://extensions/</span></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4.5 h-4.5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">3</span>
                          <span>قم بتفعيل <span className="text-rose-600 font-black">"وضع مطور البرامج"</span> (Developer Mode) من المفتاح أعلى يمين الصفحة.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4.5 h-4.5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">4</span>
                          <span>اضغط على زر <span className="text-amber-600 font-black">"تحميل ملفات غير معبأة"</span> (Load Unpacked) في الزاوية العلوية اليسرى.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4.5 h-4.5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">5</span>
                          <span>اختر مجلد الإضافة الذي قمت بفك الضغط عنه.. ومبروك! ستظهر أيقونة وشعار المخيم في المتصفح فوراً.</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                )}

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

                {/* Desktop PWA Instructions */}
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
                    التطبيقات الإضافية وملحقات المتصفح تسمح لك بمتابعة نشاطات أطفالك، ومعرض الصور اليومي، وتقارير المعلمين مباشرة وبسرعة فائقة، حتى مع ضعف شبكة الإنترنت!
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
