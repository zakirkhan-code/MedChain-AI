import { useState, useEffect } from "react";
import { Users, Search, CheckCircle, XCircle, Eye, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { adminAPI } from "../../services/api";
import { approvePatientOnChain, rejectPatientOnChain, grantPatientRole, getPatientStatus, PATIENT_STATUS } from "../../services/blockchain";
import toast from "react-hot-toast";

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [chainStatuses, setChainStatuses] = useState({});

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({ role: "patient", page: 1, limit: 50 });
      setPatients(res.data.data.users || []);
    } catch { toast.error("Failed to load patients"); }
    setLoading(false);
  };

  useEffect(() => { fetchPatients(); }, []);

  const fetchChainStatus = async (walletAddress) => {
    if (!walletAddress || !window.ethereum) return;
    try {
      const status = await getPatientStatus(walletAddress);
      setChainStatuses(prev => ({ ...prev, [walletAddress]: status }));
    } catch {}
  };

  const filtered = patients.filter(p => {
    if (filter === "pending") return p.onChainStatus === 1;
    if (filter === "active") return p.onChainStatus === 4;
    return true;
  }).filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.cnic?.includes(search)
  );

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      let onChainSuccess = false;
      let txHash = null;

      if (window.ethereum && selected?.walletAddress) {
        try {
          const chainStatus = await getPatientStatus(selected.walletAddress);
          if (chainStatus === 1) {
            const result = await approvePatientOnChain(selected.walletAddress);
            txHash = result.txHash;
            onChainSuccess = true;

            try { await grantPatientRole(selected.walletAddress); } catch {}
          } else {
            toast.error(`Patient on-chain status is "${PATIENT_STATUS[chainStatus]}" — must be "Pending"`);
          }
        } catch (chainErr) {
          console.warn("On-chain approve failed:", chainErr.reason || chainErr.message);
          toast.error("On-chain: " + (chainErr.reason || chainErr.message));
        }
      }

      await adminAPI.approvePatient(id);
      toast.success(onChainSuccess ? `Patient approved (On-chain ✓)\nTx: ${txHash?.slice(0, 16)}...` : "Patient approved (Off-chain)");
      fetchPatients(); setModal(null); setSelected(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setActionLoading(false);
  };

  const handleReject = async (id) => {
    if (!reason.trim()) return toast.error("Provide a reason");
    setActionLoading(true);
    try {
      let onChainSuccess = false;

      if (window.ethereum && selected?.walletAddress) {
        try {
          const chainStatus = await getPatientStatus(selected.walletAddress);
          if (chainStatus === 1) {
            await rejectPatientOnChain(selected.walletAddress, reason);
            onChainSuccess = true;
          }
        } catch (chainErr) {
          console.warn("On-chain reject failed:", chainErr.reason || chainErr.message);
        }
      }

      await adminAPI.rejectPatient(id, { reason });
      toast.success(onChainSuccess ? "Patient rejected (On-chain ✓)" : "Patient rejected (Off-chain)");
      fetchPatients(); setModal(null); setReason(""); setSelected(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setActionLoading(false);
  };

  const statusBadge = (status) => {
    const map = { 0: "bg-slate-100 text-slate-600", 1: "bg-blue-100 text-blue-700", 2: "bg-emerald-100 text-emerald-700", 3: "bg-red-100 text-red-700", 4: "bg-green-100 text-green-700", 5: "bg-gray-100 text-gray-600" };
    const labels = { 0: "Registered", 1: "Pending", 2: "Approved", 3: "Rejected", 4: "Active", 5: "Deactivated" };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${map[status] || map[0]}`}>{labels[status] || "Unknown"}</span>;
  };

  const chainBadge = (walletAddress) => {
    const s = chainStatuses[walletAddress];
    if (s === undefined) return null;
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700`}>Chain: {PATIENT_STATUS[s]}</span>;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Patients Management</h2>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} patients found</p>
        </div>
        <button onClick={fetchPatients} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw className="w-5 h-5" /></button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        {["all", "pending", "active"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${filter === f ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">No patients found</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">CNIC</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Wallet</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">On-Chain</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.email || p.phone || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.cnic || "—"}</td>
                  <td className="px-4 py-3">
                    {p.walletAddress ? (
                      <span className="text-xs font-mono text-blue-500">{p.walletAddress.slice(0, 10)}...</span>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">{statusBadge(p.onChainStatus || 0)}</td>
                  <td className="px-4 py-3">
                    {chainBadge(p.walletAddress)}
                    {p.walletAddress && chainStatuses[p.walletAddress] === undefined && (
                      <button onClick={() => fetchChainStatus(p.walletAddress)} className="text-xs text-blue-500 hover:underline">Check</button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setSelected(p); setModal("view"); if(p.walletAddress) fetchChainStatus(p.walletAddress); }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      {p.onChainStatus === 1 && (
                        <>
                          <button onClick={() => { setSelected(p); setModal("approve"); }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Approve">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelected(p); setModal("reject"); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
  {/* Modals */}
  {modal && selected && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setModal(null); setReason(""); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>

        {/* VIEW */}
        {modal === "view" && (
          <>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Patient Details</h3>
            <div className="space-y-3 text-sm">
              <div><span className="text-slate-400">Name:</span> <span className="font-medium">{selected.name}</span></div>
              <div><span className="text-slate-400">Email:</span> {selected.email || "—"}</div>
              <div><span className="text-slate-400">CNIC:</span> {selected.cnic || "—"}</div>
              <div><span className="text-slate-400">Phone:</span> {selected.phone || "—"}</div>
              <div><span className="text-slate-400">Blood Type:</span> {selected.bloodType || "—"}</div>
              <div><span className="text-slate-400">Allergies:</span> {selected.allergies || "—"}</div>
              <div><span className="text-slate-400">Wallet:</span> <span className="font-mono text-xs">{selected.walletAddress || "—"}</span></div>
              <div><span className="text-slate-400">DB Status:</span> {statusBadge(selected.onChainStatus || 0)}</div>
              <div><span className="text-slate-400">On-Chain:</span> {chainBadge(selected.walletAddress) || "Not checked"}</div>
              {selected.walletAddress && (
                <a href={`https://sepolia.etherscan.io/address/${selected.walletAddress}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-blue-500 hover:underline text-xs">
                  <ExternalLink className="w-3 h-3" /> View on Etherscan
                </a>
              )}
              {selected.txHashes?.length > 0 && (
                <div>
                  <span className="text-slate-400">Tx Hashes:</span>
                  {selected.txHashes.map((tx, i) => (
                    <a key={i} href={`https://sepolia.etherscan.io/tx/${tx}`} target="_blank" rel="noreferrer"
                      className="block text-xs text-blue-500 hover:underline font-mono mt-1">{tx.slice(0, 20)}...</a>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setModal(null)} className="mt-4 w-full py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium">Close</button>
          </>
        )}

        {/* APPROVE */}
        {modal === "approve" && (
          <>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Approve Patient</h3>
            <p className="text-sm text-slate-500 mb-4">Approve <strong>{selected.name}</strong> registration?</p>

            {!window.ethereum && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mb-3">⚠️ MetaMask not found. Approval will be off-chain only.</p>
            )}
            {window.ethereum && !selected.walletAddress && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mb-3">⚠️ Patient has no wallet. Approval will be off-chain only.</p>
            )}
            {window.ethereum && selected.walletAddress && (
              <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg mb-3">✅ MetaMask will sign transaction on Sepolia blockchain.</p>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setModal(null); setSelected(null); }} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium">Cancel</button>
              <button onClick={() => handleApprove(selected._id)} disabled={actionLoading}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Approve
              </button>
            </div>
          </>
        )}

        {/* REJECT */}
        {modal === "reject" && (
          <>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Reject Patient</h3>
            <p className="text-sm text-slate-500 mb-3">Reject <strong>{selected.name}</strong>?</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for rejection..."
              className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 mb-3" rows={3} />
            <div className="flex gap-2">
              <button onClick={() => { setModal(null); setReason(""); }} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium">Cancel</button>
              <button onClick={() => handleReject(selected._id)} disabled={actionLoading}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )}
</div>
);
}