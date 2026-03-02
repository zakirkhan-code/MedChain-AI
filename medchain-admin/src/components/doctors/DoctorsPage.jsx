import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import axios from "axios";
import Header from "../layout/Header";
import { verifyDoctorOnChain, rejectDoctorOnChain, suspendDoctorOnChain } from "../../services/blockchain";
import { useWallet } from "../../context/WalletContext";
import { DataTable, Badge, Modal, Loader, Pagination } from "../common/index";
import { CheckCircle, XCircle, Ban, Eye } from "lucide-react";
import toast from "react-hot-toast";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const { isConnected } = useWallet();

  const fetchDoctors = () => {
    setLoading(true);
    const params = { role: "doctor", page, limit: 15 };
    if (filter === "pending") params.isActive = "true";
    adminAPI.getUsers(params)
      .then((res) => { setDoctors(res.data.data.users); setPages(res.data.data.pages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDoctors(); }, [page, filter]);

  const handleVerify = async (id) => {
    setActionLoading(true);
    try {
      let txHash = null;

      // If MetaMask connected, do on-chain first
      if (isConnected && selected?.walletAddress) {
        const txResult = await verifyDoctorOnChain(selected.walletAddress);
        txHash = txResult.txHash;
      }

      // Then update backend
      await adminAPI.verifyDoctor(id);

      // If we have txHash, save it
      if (txHash) {
        await axios.post("/api/transactions/verify-doctor", { txHash, doctorId: id });
      }

      toast.success("Doctor verified successfully!" + (txHash ? " (On-chain ✓)" : ""));
      fetchDoctors();
      setModal(null);
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
        const txResult = await rejectDoctorOnChain(selected.walletAddress, reason);
        txHash = txResult.txHash;
      }

      await adminAPI.rejectDoctor(id, { reason });
      toast.success("Doctor rejected" + (txHash ? " (On-chain ✓)" : ""));
      fetchDoctors(); setModal(null); setReason("");
    } catch (err) {
      toast.error(err.reason || err.response?.data?.message || err.message || "Failed");
    }
    finally { setActionLoading(false); }
  };

  const handleSuspend = async (id) => {
    if (!reason.trim()) return toast.error("Provide a reason");
    setActionLoading(true);
    try {
      let txHash = null;

      if (isConnected && selected?.walletAddress) {
        const txResult = await suspendDoctorOnChain(selected.walletAddress, reason);
        txHash = txResult.txHash;
      }

      await adminAPI.suspendDoctor(id, { reason });
      toast.success("Doctor suspended" + (txHash ? " (On-chain ✓)" : ""));
      fetchDoctors(); setModal(null); setReason("");
    } catch (err) {
      toast.error(err.reason || err.response?.data?.message || err.message || "Failed");
    }
    finally { setActionLoading(false); }
  };

  const statusBadge = (doc) => {
    if (doc.isVerified) return <Badge variant="success">Verified</Badge>;
    if (doc.onChainStatus === 4) return <Badge variant="danger">Suspended</Badge>;
    if (doc.onChainStatus === 3) return <Badge variant="warning">Rejected</Badge>;
    if (doc.onChainStatus === 1) return <Badge variant="info">Pending</Badge>;
    return <Badge variant="default">Registered</Badge>;
  };

  const columns = [
    { key: "name", label: "Doctor", render: (_, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 text-xs font-bold">{row.name?.charAt(0)}</div>
        <div><p className="font-medium text-slate-900">{row.name}</p><p className="text-xs text-slate-400">{row.email}</p></div>
      </div>
    )},
    { key: "specialization", label: "Specialization", render: (v) => v || <span className="text-slate-300">—</span> },
    { key: "licenseNumber", label: "License", render: (v) => v || <span className="text-slate-300">—</span> },
    { key: "status", label: "Status", render: (_, row) => statusBadge(row) },
    { key: "actions", label: "Actions", render: (_, row) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); setSelected(row); setModal("view"); }} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg"><Eye className="w-4 h-4" /></button>
        {!row.isVerified && row.onChainStatus !== 4 && (
          <button onClick={(e) => { e.stopPropagation(); setSelected(row); setModal("verify"); }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><CheckCircle className="w-4 h-4" /></button>
        )}
        {!row.isVerified && (
          <button onClick={(e) => { e.stopPropagation(); setSelected(row); setModal("reject"); setReason(""); }} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"><XCircle className="w-4 h-4" /></button>
        )}
        {row.isVerified && (
          <button onClick={(e) => { e.stopPropagation(); setSelected(row); setModal("suspend"); setReason(""); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Ban className="w-4 h-4" /></button>
        )}
      </div>
    )},
  ];

  return (
    <>
      <Header title="Doctors Management" subtitle="Verify, reject and manage doctor accounts" />
      <div className="p-6">
        <div className="flex gap-2 mb-4">
          {["all", "pending"].map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${filter === f ? "bg-primary text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
              {f === "all" ? "All Doctors" : "Pending"}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          {loading ? <Loader /> : <DataTable columns={columns} data={doctors} />}
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      </div>

      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Doctor Details">
        {selected && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold">{selected.name?.charAt(0)}</div>
              <div><p className="font-semibold text-slate-900">{selected.name}</p><p className="text-sm text-slate-500">{selected.email}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-500">Phone</p><p className="font-medium">{selected.phone || "—"}</p></div>
              <div><p className="text-slate-500">Specialization</p><p className="font-medium">{selected.specialization || "—"}</p></div>
              <div><p className="text-slate-500">License</p><p className="font-medium">{selected.licenseNumber || "—"}</p></div>
              <div><p className="text-slate-500">Status</p>{statusBadge(selected)}</div>
              <div><p className="text-slate-500">Rating</p><p className="font-medium">{selected.rating ? `${selected.rating.toFixed(1)}/5 (${selected.ratingCount})` : "No ratings"}</p></div>
              <div><p className="text-slate-500">Patients</p><p className="font-medium">{selected.totalPatients || 0}</p></div>
              <div><p className="text-slate-500">Wallet</p><p className="font-medium text-xs break-all">{selected.walletAddress || "Not connected"}</p></div>
              <div><p className="text-slate-500">Joined</p><p className="font-medium">{new Date(selected.createdAt).toLocaleDateString()}</p></div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "verify"} onClose={() => setModal(null)} title="Verify Doctor">
        {selected && (
          <div>
            <p className="text-sm text-slate-600 mb-4">Verify <strong>{selected.name}</strong> ({selected.specialization})? This will grant them DOCTOR_ROLE on-chain.</p>
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
              <button onClick={() => handleVerify(selected._id)} disabled={actionLoading}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60">
                {actionLoading ? "Verifying..." : "Verify Doctor"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "reject"} onClose={() => setModal(null)} title="Reject Doctor">
        {selected && (
          <div>
            <p className="text-sm text-slate-600 mb-3">Reject <strong>{selected.name}</strong>'s application:</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for rejection..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleReject(selected._id)} disabled={actionLoading}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
                {actionLoading ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "suspend"} onClose={() => setModal(null)} title="Suspend Doctor">
        {selected && (
          <div>
            <p className="text-sm text-slate-600 mb-3">Suspend <strong>{selected.name}</strong>? This will revoke DOCTOR_ROLE on-chain.</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for suspension..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleSuspend(selected._id)} disabled={actionLoading}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60">
                {actionLoading ? "Suspending..." : "Suspend Doctor"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
