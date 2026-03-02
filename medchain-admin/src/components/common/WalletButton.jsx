import { useWallet } from "../../context/WalletContext";
import { Wallet, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function WalletButton() {
  const { isConnected, formatted, connecting, error, connect, disconnect } = useWallet();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">{formatted}</span>
        </div>
        <button onClick={disconnect} className="px-3 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={connect} disabled={connecting}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light disabled:opacity-60 transition-colors">
        {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
        {connecting ? "Connecting..." : "Connect MetaMask"}
      </button>
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3" /> {error}
        </div>
      )}
    </div>
  );
}