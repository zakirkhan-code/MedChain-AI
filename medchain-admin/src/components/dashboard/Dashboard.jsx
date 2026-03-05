import { useState, useEffect } from "react";
import { Users, UserCheck, FileText, Brain, Shield, Activity, Clock, Loader2 } from "lucide-react";
import { adminAPI } from "../../services/api";
import { getPlatformStats } from "../../services/blockchain";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [chainStats, setChainStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Backend stats
    adminAPI.getDashboard()
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // On-chain stats
    if (window.ethereum) {
      getPlatformStats()
        .then(stats => { if (stats) setChainStats(stats); })
        .catch(() => {});
    }
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  const stats = data?.stats || {};

  const cards = [
    { label: "Total Users", value: stats.totalUsers || 0, icon: Users, color: "bg-blue-500" },
    { label: "Patients", value: stats.totalPatients || 0, icon: Users, color: "bg-emerald-500" },
    { label: "Doctors", value: stats.totalDoctors || 0, icon: UserCheck, color: "bg-purple-500" },
    { label: "Records", value: stats.totalRecords || 0, icon: FileText, color: "bg-orange-500" },
    { label: "Pending Doctors", value: stats.pendingDoctors || 0, icon: Clock, color: "bg-amber-500" },
    { label: "AI Interactions", value: stats.totalAI || 0, icon: Brain, color: "bg-pink-500" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">MedChain AI Platform Overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className={`w-10 h-10 ${c.color} rounded-lg flex items-center justify-center mb-3`}>
              <c.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{c.value}</p>
            <p className="text-xs text-slate-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* On-Chain Stats */}
      {chainStats && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" /> On-Chain Stats (Sepolia Testnet)
          </h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-slate-900">{chainStats.totalUsers}</p>
              <p className="text-xs text-slate-500">On-Chain Users</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{chainStats.totalRecords}</p>
              <p className="text-xs text-slate-500">On-Chain Records</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{chainStats.totalConsents}</p>
              <p className="text-xs text-slate-500">Consent Logs</p>
            </div>
            <div>
              <p className={`text-xl font-bold ${chainStats.isPaused ? "text-red-600" : "text-emerald-600"}`}>
                {chainStats.isPaused ? "Paused" : "Active"}
              </p>
              <p className="text-xs text-slate-500">Platform Status</p>
            </div>
          </div>
        </div>
      )}

      {!chainStats && window.ethereum && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-700">⚠️ Connect MetaMask to see on-chain stats</p>
        </div>
      )}

      {/* Recent Users */}
      {data?.recentUsers?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> Recent Registrations
          </h3>
          <div className="space-y-2">
            {data.recentUsers.map((u, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email || u.cnic || "—"}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${u.role === "doctor" ? "bg-purple-100 text-purple-700" : u.role === "admin" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                    {u.role}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">{new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Records */}
      {data?.recentRecords?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-600" /> Recent Records
          </h3>
          <div className="space-y-2">
            {data.recentRecords.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-400">{r.patient?.name || "—"}</p>
                </div>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">{r.recordType}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}