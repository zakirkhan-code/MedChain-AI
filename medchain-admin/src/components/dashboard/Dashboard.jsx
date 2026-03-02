import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import Header from "../layout/Header";
import { getReadOnlyContract } from "../../services/contracts";
import { StatCard, Badge, Loader } from "../common/index";
import { Users, UserCheck, FileText, Shield, Brain, Clock, AlertTriangle, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#0D3B66", "#1B7A4A", "#D4380D", "#7C3AED", "#2563EB", "#DB2777"];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [chainStats, setChainStats] = useState(null);

  useEffect(() => {
    adminAPI.getDashboard()
      .then((res) => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch on-chain stats
    if (window.ethereum) {
      try {
        const core = getReadOnlyContract("MedChainCore");
        core.getPlatformStats().then((stats) => {
          setChainStats({
            totalUsers: Number(stats[0]),
            totalRecords: Number(stats[1]),
            totalConsents: Number(stats[2]),
            isPaused: stats[3],
          });
        }).catch(() => {});
      } catch {}
    }
  }, []);

  if (loading) return <><Header title="Dashboard" /><Loader /></>;

  const stats = data?.stats || {};
  const roleData = [
    { name: "Patients", value: stats.totalPatients || 0 },
    { name: "Doctors", value: stats.totalDoctors || 0 },
    { name: "Admins", value: (stats.totalUsers || 0) - (stats.totalPatients || 0) - (stats.totalDoctors || 0) },
  ].filter((d) => d.value > 0);

  const activityData = [
    { name: "Mon", users: 4, records: 2 },
    { name: "Tue", users: 6, records: 5 },
    { name: "Wed", users: 3, records: 8 },
    { name: "Thu", users: 8, records: 4 },
    { name: "Fri", users: 5, records: 7 },
    { name: "Sat", users: 2, records: 3 },
    { name: "Sun", users: 1, records: 1 },
  ];

  return (
    <>
      <Header title="Dashboard" subtitle="Platform overview and analytics" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Patients" value={stats.totalPatients || 0} color="primary" />
          <StatCard icon={UserCheck} label="Total Doctors" value={stats.totalDoctors || 0} color="green" />
          <StatCard icon={FileText} label="Medical Records" value={stats.totalRecords || 0} color="blue" />
          <StatCard icon={Brain} label="AI Interactions" value={stats.totalAI || 0} color="purple" />
        </div>
        {chainStats && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" /> On-Chain Stats (Sepolia)
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
                <p className={`text-xl font-bold ${chainStats.isPaused ? 'text-red-600' : 'text-emerald-600'}`}>
                  {chainStats.isPaused ? 'Paused' : 'Active'}
                </p>
                <p className="text-xs text-slate-500">Platform Status</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="stat-card bg-orange-50 border border-orange-200 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700">{stats.pendingDoctors || 0}</p>
              <p className="text-sm text-orange-600">Pending Doctor Verifications</p>
            </div>
          </div>
          <div className="stat-card bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.pendingPatients || 0}</p>
              <p className="text-sm text-blue-600">Pending Patient Registrations</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Area type="monotone" dataKey="users" stackId="1" stroke="#0D3B66" fill="#0D3B66" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="records" stackId="2" stroke="#1B7A4A" fill="#1B7A4A" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">User Distribution</h3>
            {roleData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                    {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">No users yet</div>
            )}
            <div className="flex justify-center gap-4 mt-2">
              {roleData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Recent Users</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {(data?.recentUsers || []).map((u) => (
                <div key={u._id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {u.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  <Badge variant={u.role === "doctor" ? "info" : u.role === "admin" ? "purple" : "success"}>{u.role}</Badge>
                </div>
              ))}
              {(!data?.recentUsers || data.recentUsers.length === 0) && (
                <div className="px-5 py-8 text-center text-sm text-slate-400">No users yet</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Recent Records</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {(data?.recentRecords || []).map((r) => (
                <div key={r._id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{r.title || "Medical Record"}</p>
                      <p className="text-xs text-slate-400">{r.patient?.name || "Unknown"}</p>
                    </div>
                  </div>
                  <Badge variant="default">{r.recordType}</Badge>
                </div>
              ))}
              {(!data?.recentRecords || data.recentRecords.length === 0) && (
                <div className="px-5 py-8 text-center text-sm text-slate-400">No records yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
