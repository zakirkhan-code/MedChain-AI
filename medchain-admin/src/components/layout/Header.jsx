import { useState } from "react";
import { Bell, Search } from "lucide-react";
import WalletButton from "../common/WalletButton";

export default function Header({ title, subtitle }) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          <WalletButton />
          <div className={`flex items-center transition-all ${searchOpen ? "w-64" : "w-10"}`}>
            {searchOpen && (
              <input autoFocus type="text" placeholder="Search..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onBlur={() => setSearchOpen(false)} />
            )}
            {!searchOpen && (
              <button onClick={() => setSearchOpen(true)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>
          <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}