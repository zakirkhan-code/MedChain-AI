import { useState, useEffect } from "react";
import { accessAPI } from "../../services/api";
import Header from "../layout/Header";
import { DataTable, Badge, Loader, Pagination } from "../common/index";

export default function AccessPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    accessAPI.getAudit({ page, limit: 20 })
      .then((res) => { setLogs(res.data.data.logs); setPages(res.data.data.pages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const actionColors = {
    granted: "success", revoked: "danger", expired: "warning", emergency: "danger",
    requested: "info", approved: "success", rejected: "warning", cancelled: "default",
  };

  const columns = [
    { key: "patient", label: "Patient", render: (v) => v?.name || "—" },
    { key: "provider", label: "Provider", render: (v) => v?.name || "—" },
    { key: "action", label: "Action", render: (v) => <Badge variant={actionColors[v] || "default"}>{v?.toUpperCase()}</Badge> },
    { key: "accessLevel", label: "Level", render: (v) => v || "—" },
    { key: "purpose", label: "Purpose", render: (v) => v ? <span className="truncate max-w-[200px] block">{v}</span> : "—" },
    { key: "txHash", label: "Tx Hash", render: (v) => v ? <span className="text-xs font-mono text-slate-400">{v.substring(0, 14)}...</span> : <span className="text-slate-300">Off-chain</span> },
    { key: "createdAt", label: "Date", render: (v) => new Date(v).toLocaleString() },
  ];

  return (
    <>
      <Header title="Access Logs" subtitle="Permission grants, revocations and audit trail" />
      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          {loading ? <Loader /> : <DataTable columns={columns} data={logs} />}
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      </div>
    </>
  );
}
