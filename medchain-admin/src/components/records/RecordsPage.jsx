import { useState, useEffect } from "react";
import { adminAPI, recordAPI } from "../../services/api";
import Header from "../layout/Header";
import { DataTable, Badge, Loader, Pagination } from "../common/index";
import { FileText, Search } from "lucide-react";

export default function RecordsPage() {
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    adminAPI.getUsers({ role: "patient", limit: 100 })
      .then((res) => setUsers(res.data.data.users))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPatient) { setRecords([]); return; }
    setLoading(true);
    recordAPI.getPatientRecords(selectedPatient, { page, limit: 15 })
      .then((res) => { setRecords(res.data.data.records); setPages(res.data.data.pages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedPatient, page]);

  const typeColors = { LabReport: "info", Prescription: "purple", Imaging: "default", Diagnosis: "warning", Vaccination: "success", Surgery: "danger", Discharge: "default", Other: "default" };
  const statusColors = { Active: "success", Amended: "warning", Archived: "default" };

  const columns = [
    { key: "title", label: "Title", render: (v, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><FileText className="w-4 h-4 text-blue-600" /></div>
        <div><p className="font-medium text-slate-900">{v}</p><p className="text-xs text-slate-400">v{row.version}</p></div>
      </div>
    )},
    { key: "recordType", label: "Type", render: (v) => <Badge variant={typeColors[v] || "default"}>{v}</Badge> },
    { key: "status", label: "Status", render: (v) => <Badge variant={statusColors[v] || "default"}>{v}</Badge> },
    { key: "uploadedBy", label: "Uploaded By", render: (v) => v?.name || "—" },
    { key: "contentHash", label: "Hash", render: (v) => <span className="text-xs font-mono text-slate-400">{v?.substring(0, 16)}...</span> },
    { key: "createdAt", label: "Date", render: (v) => new Date(v).toLocaleDateString() },
  ];

  return (
    <>
      <Header title="Medical Records" subtitle="View patient medical records" />
      <div className="p-6">
        <div className="flex gap-4 mb-4">
          <select value={selectedPatient} onChange={(e) => { setSelectedPatient(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[250px]">
            <option value="">Select a patient...</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name} — {u.email}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          {!selectedPatient ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Search className="w-10 h-10 mb-3 text-slate-300" />
              <p className="text-sm">Select a patient to view their records</p>
            </div>
          ) : loading ? <Loader /> : <DataTable columns={columns} data={records} />}
          {selectedPatient && <Pagination page={page} pages={pages} onPageChange={setPage} />}
        </div>
      </div>
    </>
  );
}
