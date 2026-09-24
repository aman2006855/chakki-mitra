import { Home, BookText, BarChart3, Settings, Crown } from "lucide-react";
import { useId } from "react";

type Tab = "home" | "khata" | "reports" | "plan" | "settings";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "होम", icon: Home },
  { id: "khata", label: "खाता", icon: BookText },
  { id: "reports", label: "रिपोर्ट", icon: BarChart3 },
  { id: "plan", label: "प्लान", icon: Crown },
  { id: "settings", label: "सेटिंग", icon: Settings },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const id = useId();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`flex-1 flex flex-col items-center py-2 px-1 transition-colors duration-100 ${
              activeTab === id
                ? "text-orange-600"
                : "text-gray-400 active:text-orange-400"
            }`}
            aria-label={label}
            role="tab"
            aria-selected={activeTab === id}
          >
            <Icon
              className={`w-5 h-5 ${activeTab === id ? "stroke-[2.5]" : ""}`}
            />
            <span className="text-[10px] mt-0.5 font-medium">{label}</span>
            {activeTab === id && (
              <div
                className="absolute top-0 w-12 h-0.5 bg-orange-500 rounded-b-full"
                style={{
                  left: `${tabs.findIndex((t) => t.id === id) * 20 + 10}%`,
                  transform: "translateX(-50%)",
                }}
              />
            )}
          </button>
        ))}
      </div>
      {/* Bottom safe area spacer */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white" />
    </nav>
  );
}
