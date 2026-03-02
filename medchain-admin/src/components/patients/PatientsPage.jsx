import { useState, useEffect } from "react";
import { approvePatientOnChain, rejectPatientOnChain } from "../../services/blockchain";
import { useWallet } from "../../context/WalletContext";
import axios from "axios";
import { adminAPI } from "../../services/api";
import Header from "../layout/Header";
import { DataTable, Badge, Modal, Loader, Pagination } from "../common/index";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import toast from "react-hot-toast";

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const { isConnected } = useWallet();

  const fetchPatients = () => {
    setLoading(true);
    adminAPI.getUsers({ role: "patient", page, limit: 15, search })
      .then((res) => { setPatients(res.data.data.users); setPages(res.data.data.pages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPatients(); }, [page, search]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      let txHash = null;

      if (isConnected && selected?.walletAddress) {
        const txResult = await approvePatientOnChain(selected.walletAddress);
        txHash = txResult.txHash;
      }

      await adminAPI.approvePatient(id);

      if (txHash) {
        await axios.post("/api/transactions/approve-patient", { txHash, patientId: id });
      }

      toast.success("Patient approved!" + (txHash ? " (On-chain ✓)" : ""));
      fetchPatients(); setModal(null);
    } catch (err) {
      toast.error(err.reason || err.response?.data?.message || err.message || "Failed");
    }
    finally { setActionLoading(false); }
  };

  const handleReject = async (id) => {
    if (!reason.trim()) return toast.error("Provide a reason");
    setActionLoading(true);
    try {
      let txHash = null;

      if (isConnected && selected?.walletAddress) {
        const txResult = await rejectPatientOnChain(selected.walletAddress, reason);
        txHash = txResult.txHash;
      }

      await adminAPI.rejectPatient(id, { reason });
      toast.success("Patient rejected" + (txHash ? " (On-chain ✓)" : ""));
      fetchPatients(); setModal(null); setReason("");
    } catch (err) {
      toast.error(err.reason || err.response?.data?.message || err.message || "Failed");
    }
    finally { setActionLoading(false); }
  };

  const statusMap = { 0: ["Registered", "default"], 1: ["Pending", "info"], 2: ["Approved", "success"], 3: ["Rejected", "warning"], 4: ["Active", "success"], 5: ["Deactivated", "danger"] };

  const columns = [
    { key: "name", label: "Patient", render: (_, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{row.name?.charAt(0)}</div>
        <div><p className="font-medium text-slate-900">{row.name}</p><p className="text-xs text-slate-400">{row.email}</p></div>
      </div>
    )},
    { key: "phone", label: "Phone", render: (v) => v || <span className="text-slate-300">—</span> },
    { key: "bloodType", label: "Blood Type", render: (v) => v ? <Badge variant="danger">{v}</Badge> : <span className="text-slate-300">—</span> },
    { key: "totalRecords", label: "Records", render: (v) => v || 0 },
    { key: "onChainStatus", label: "Status", render: (v) => { const [label, variant] = statusMap[v] || ["Unknown", "default"]; return <Badge variant={variant}>{label}</Badge>; }},
    { key: "actions", label: "Actions", render: (_, row) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); setSelected(row); setModal("view"); }} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg"><Eye className="w-4 h-4" /></button>
        {row.onChainStatus === 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); setSelected(row); setModal("approve"); }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><CheckCircle className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); setSelected(row); setModal("reject"); setReason(""); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><XCircle className="w-4 h-4" /></button>
          </>
        )}
      </div>
    )},
  ];

  return (
    <>
      <Header title="Patients Management" subtitle="Manage patient registrations and profiles" />
      <div className="p-6">
        <div className="mb-4">
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search patients by name or email..."
            className="w-full max-w-md px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          {loading ? <Loader /> : <DataTable columns={columns} data={patients} />}
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      </div>

      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Patient Details">
        {selected && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{selected.name?.charAt(0)}</div>
              <div><p className="font-semibold text-slate-900">{selected.name}</p><p className="text-sm text-slate-500">{selected.email}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-500">Phone</p><p className="font-medium">{selected.phone || "—"}</p></div>
              <div><p className="text-slate-500">Blood Type</p><p className="font-medium">{selected.bloodType || "—"}</p></div>
              <div><p className="text-slate-500">Allergies</p><p className="font-medium">{selected.allergies || "None"}</p></div>
              <div><p className="text-slate-500">Records</p><p className="font-medium">{selected.totalRecords || 0}</p></div>
              <div><p className="text-slate-500">Wallet</p><p className="font-medium text-xs break-all">{selected.walletAddress || "Not connected"}</p></div>
              <div><p className="text-slate-500">Joined</p><p className="font-medium">{new Date(selected.createdAt).toLocaleDateString()}</p></div>
            </div>
            {selected.emergencyContact?.name && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-xs font-semibold text-red-700 mb-1">Emergency Contact</p>
                <p className="text-sm text-red-900">{selected.emergencyContact.name} ({selected.emergencyContact.relationship}) — {selected.emergencyContact.phone}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={modal === "approve"} onClose={() => setModal(null)} title="Approve Patient">
        {selected && (
          <div>
            <p className="text-sm text-slate-600 mb-4">Approve <strong>{selected.name}</strong>'s registration?</p>
            <div className="flex gap-3 justify-end">
              {!isConnected && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mb-3">
                  ⚠️ MetaMask not connected. Action will be off-chain only. Connect wallet from header for on-chain verification.
                </p>
              )}
              {isConnected && !selected?.walletAddress && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mb-3">
                  ⚠️ This user has no wallet address. Action will be off-chain only.
                </p>
              )}
              {isConnected && selected?.walletAddress && (
                <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg mb-3">
                  ✅ MetaMask connected. Transaction will be signed and sent to Sepolia blockchain.
                </p>
              )}
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleApprove(selected._id)} disabled={actionLoading}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60">
                {actionLoading ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "reject"} onClose={() => setModal(null)} title="Reject Patient">
        {selected && (
          <div>
            <p className="text-sm text-slate-600 mb-3">Reject <strong>{selected.name}</strong>'s registration:</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for rejection..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleReject(selected._id)} disabled={actionLoading}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60">
                {actionLoading ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
