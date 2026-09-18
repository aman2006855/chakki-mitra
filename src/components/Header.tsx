import { Wheat, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  shopName: string;
  userName?: string;
}

export default function Header({ shopName }: HeaderProps) {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wheat className="w-6 h-6 text-amber-100" />
            <h1 className="text-xl font-bold tracking-wide">चक्की मित्र</h1>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20"
            title="Log out"
          >
            <LogOut className="w-4 h-4 text-orange-100" />
          </button>
        </div>
        {shopName && (
          <p className="text-xs text-orange-100 ml-8 truncate">{shopName}</p>
        )}
      </div>
    </header>
  );
}
