import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import Header from "../layout/Header";
import { StatCard, Loader } from "../common/index";
import { Brain, Zap, MessageSquare, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#0D3B66", "#1B7A4A", "#D4380D", "#7C3AED", "#2563EB", "#DB2777"];

const typeLabels = {
  "symptom-check": "Symptom Check",
  "report-summary": "Report Summary",
  "drug-interaction": "Drug Interaction",
  "health-insight": "Health Insights",
  "chat": "Medical Chat",
};

export default function AIAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getAIAnalytics()
      .then((res) => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <><Header title="AI Analytics" /><Loader /></>;

  const chartData = (data?.byType || []).map((t) => ({
    name: typeLabels[t._id] || t._id,
    count: t.count,
  }));

  return (
    <>
      <Header title="AI Analytics" subtitle="AI service usage and insights" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={Brain} label="Total AI Interactions" value={data?.totalInteractions || 0} color="purple" />
          <StatCard icon={Zap} label="Total Tokens Used" value={(data?.totalTokensUsed || 0).toLocaleString()} color="orange" />
          <StatCard icon={MessageSquare} label="AI Features Active" value={chartData.length} color="blue" />
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-6">Usage by Feature</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={120} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={32}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Activity className="w-10 h-10 mb-3 text-slate-300" />
              <p className="text-sm">No AI interactions yet</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
