import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import Header from "../layout/Header";
import { DataTable, Badge, Loader, Pagination } from "../common/index";
import { Shield, Clock } from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    adminAPI.getAuditLogs({ page, limit: 25 })
      .then((res) => { setLogs(res.data.data.logs); setPages(res.data.data.pages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const actionColors = {
    granted: "success", revoked: "danger", expired: "warning", emergency: "danger",
    requested: "info", approved: "success", rejected: "warning", cancelled: "default",
  };

  const columns = [
    { key: "createdAt", label: "Timestamp", render: (v) => (
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs">{new Date(v).toLocaleString()}</span>
      </div>
    )},
    { key: "action", label: "Action", render: (v) => <Badge variant={actionColors[v] || "default"}>{v?.toUpperCase()}</Badge> },
    { key: "patient", label: "Patient", render: (v) => (
      <div><p className="text-sm font-medium">{v?.name || "—"}</p></div>
    )},
    { key: "provider", label: "Provider", render: (v) => (
      <div><p className="text-sm font-medium">{v?.name || "—"}</p></div>
    )},
    { key: "accessLevel", label: "Access Level", render: (v) => v || "—" },
    { key: "txHash", label: "On-Chain", render: (v) => v ? (
      <span className="inline-flex items-center gap-1 text-xs">
        <Shield className="w-3 h-3 text-emerald-500" />
        <span className="font-mono text-slate-500">{v.substring(0, 10)}...</span>
      </span>
    ) : <span className="text-xs text-slate-300">Off-chain</span> },
  ];

  return (
    <>
      <Header title="Audit Trail" subtitle="Complete system activity log" />
      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          {loading ? <Loader /> : <DataTable columns={columns} data={logs} />}
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      </div>
    </>
  );
}
