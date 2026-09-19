"use client";

import { useState, useEffect } from "react";
import { Check, ChevronRight, ChevronLeft, User, Store, Phone, Wheat } from "lucide-react";
import { api } from "@/lib/api";

type Step = {
  id: number;
  key: string;
  label: string;
  icon: typeof User;
  placeholder: string;
  type: "text" | "tel" | "number";
  inputMode: string;
  hint: string;
};

const steps: Step[] = [
  { id: 1, key: "name", label: "आपका नाम", icon: User, placeholder: "जैसे: रमेश भाई", type: "text", inputMode: "text", hint: "जैसा आप जाना जाते हैं" },
  { id: 2, key: "shopName", label: "दुकान का नाम", icon: Store, placeholder: "जैसे: श्री श्याम आटा चक्की", type: "text", inputMode: "text", hint: "रसीद पर प्रिंट होगा" },
  { id: 3, key: "shopPhone", label: "दुकान का मोबाइल", icon: Phone, placeholder: "9876543210", type: "tel", inputMode: "numeric", hint: "बिजनेस नंबर (वैकल्पिक)" },
  { id: 4, key: "attaRate", label: "आटा पिसाई रेट", icon: Wheat, placeholder: "5", type: "number", inputMode: "decimal", hint: "प्रति किग्रा कितना चार्ज?" },
  { id: 5, key: "daliaRate", label: "दलिया पिसाई रेट", icon: Wheat, placeholder: "8", type: "number", inputMode: "decimal", hint: "प्रति किग्रा कितना चार्ज?" },
];

export default function RegisterPage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({
    name: "",
    shopName: "",
    shopPhone: "",
    attaRate: "5",
    daliaRate: "8",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api("/api/auth/session");
        const data = await res.json();
        if (!data.auth) {
          window.location.href = "/login";
        }
      } catch {
        window.location.href = "/login";
      }
    }
    checkAuth();
  }, []);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isValid = (values[step.key] || "").trim().length > 0 || step.key === "shopPhone";

  const handleNext = () => {
    if (!isValid && step.key !== "shopPhone") {
      setError("यह फ़ील्ड जरूरी है");
      return;
    }
    setError("");
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const body = { ...values, isRegistered: true };
      try {
        localStorage.setItem("chakki_mitra_settings", JSON.stringify(body));
      } catch {}

      const res = await api("/api/settings", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const result = await res.json();
      console.log("[register] response:", JSON.stringify(result), "status:", res.status);

      setTimeout(() => { window.location.href = "/"; }, 200);
    } catch (e) {
      console.error("[register] error:", e);
      setError("सेव नहीं हो पाई, फिर से कोशिश करें");
    }
    setSaving(false);
  };

  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-amber-400 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-orange-400 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-32 h-32 bg-orange-600 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-4000" />

        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative z-10 border border-white/20">
          <div className="w-20 h-20 mx-auto bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">
            ॐ
          </div>

          <h1 className="text-2xl font-bold text-orange-600 mb-2 font-serif tracking-wide">
            ॥ श्री गणेशाय नमः ॥
          </h1>
          
          <div className="flex items-center justify-center gap-4 text-orange-500 font-semibold mb-6">
            <span>शुभ</span>
            <span className="text-xl">❋</span>
            <span>लाभ</span>
          </div>

          <h2 className="text-xl font-bold text-gray-800 mb-4">
            चक्की मित्र में आपका स्वागत है!
          </h2>
          
          <p className="text-gray-600 mb-8 leading-relaxed">
            हम आपके व्यापार की अपार सुख, शांति, समृद्धि और सफलता की मंगल कामना करते हैं।<br/><br/>
            चलिए, आपके डिजिटल बहीखाते की शुरुआत करते हैं।
          </p>

          <button
            onClick={() => setShowWelcome(false)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] transition-all shadow-lg"
          >
            शुरुआत करें
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-amber-400 flex flex-col">
      <div className="w-full bg-black/20 h-1.5">
        <div className="bg-white h-1.5 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-orange-100 text-sm font-medium">
            कदम {currentStep + 1}/{steps.length}
          </span>
        </div>
        <div className="flex gap-1">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i <= currentStep ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
            <step.icon className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-2">{step.label}</h2>
          <p className="text-orange-100 text-center text-sm mb-8">{step.hint}</p>

          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <input
              type={step.type}
              value={values[step.key]}
              onChange={(e) => {
                setValues((v) => ({ ...v, [step.key]: e.target.value }));
                setError("");
              }}
              placeholder={step.placeholder}
              inputMode={step.inputMode as any}
              className="w-full text-center text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm text-center mt-3 bg-red-50 rounded-lg py-2">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl text-white active:bg-white/30 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={saving || (!isValid && step.key !== "shopPhone")}
              className="flex-1 flex items-center justify-center gap-2 h-14 bg-white rounded-xl text-gray-900 font-bold text-lg active:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                "सेव हो रहा है..."
              ) : isLast ? (
                <>
                  <Check className="w-5 h-5" />
                  शुरू करें
                </>
              ) : (
                <>
                  आगे
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {step.key === "shopPhone" && (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              className="w-full mt-3 py-2 text-orange-100 text-sm font-medium active:text-white"
            >
              छोड़ें (वैकल्पिक)
            </button>
          )}
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}
