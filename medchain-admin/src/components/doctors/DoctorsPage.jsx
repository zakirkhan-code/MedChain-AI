import { useState, useEffect } from "react";
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Ban,
  Eye,
  Loader2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { adminAPI } from "../../services/api";
import {
  verifyDoctorOnChain,
  rejectDoctorOnChain,
  suspendDoctorOnChain,
  grantDoctorRole,
  getDoctorStatus,
  DOCTOR_STATUS,
} from "../../services/blockchain";
import toast from "react-hot-toast";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [chainStatuses, setChainStatuses] = useState({});

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 50 };
      if (filter === "pending") params.role = "doctor";
      const res = await adminAPI.getUsers({ ...params, role: "doctor" });
      setDoctors(res.data.data.users || []);
    } catch (err) {
      toast.error("Failed to load doctors");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDoctors();
  }, [filter]);

  const fetchChainStatus = async (walletAddress) => {
    if (!walletAddress || !window.ethereum) return;
    try {
      const status = await getDoctorStatus(walletAddress);
      setChainStatuses((prev) => ({ ...prev, [walletAddress]: status }));
    } catch {}
  };

  const filtered = doctors
    .filter((d) => {
      if (filter === "pending") return !d.isVerified && d.specialization;
      if (filter === "verified") return d.isVerified;
      return true;
    })
    .filter(
      (d) =>
        d.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.email?.toLowerCase().includes(search.toLowerCase()) ||
        d.cnic?.includes(search),
    );

  // ========== VERIFY ==========
  const handleVerify = async (id) => {
    setActionLoading(true);
    try {
      const res = await adminAPI.verifyDoctor(id);
      toast.success(res.data.message || "Doctor verified!");
      fetchDoctors();
      setModal(null);
      setSelected(null);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to verify";
      toast.error(msg);
    }
    setActionLoading(false);
  };

  // ========== REJECT ==========
  const handleReject = async (id) => {
    if (!reason.trim()) return toast.error("Provide a reason");
    setActionLoading(true);
    try {
      const res = await adminAPI.rejectDoctor(id, { reason });
      toast.success(res.data.message || "Doctor rejected");
      fetchDoctors();
      setModal(null);
      setReason("");
      setSelected(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setActionLoading(false);
  };

  // ========== SUSPEND ==========
  const handleSuspend = async (id) => {
    if (!reason.trim()) return toast.error("Provide a reason");
    setActionLoading(true);
    try {
      const res = await adminAPI.suspendDoctor(id, { reason });
      toast.success(res.data.message || "Doctor suspended");
      fetchDoctors();
      setModal(null);
      setReason("");
      setSelected(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setActionLoading(false);
  };

  const statusBadge = (d) => {
    if (d.isVerified)
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
          Verified
        </span>
      );
    if (d.specialization)
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
          Pending
        </span>
      );
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
        Registered
      </span>
    );
  };

  const chainBadge = (walletAddress) => {
    const s = chainStatuses[walletAddress];
    if (s === undefined) return null;
    const colors = {
      0: "bg-slate-100 text-slate-600",
      1: "bg-blue-100 text-blue-700",
      2: "bg-emerald-100 text-emerald-700",
      3: "bg-red-100 text-red-700",
      4: "bg-orange-100 text-orange-700",
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[s] || colors[0]}`}
      >
        Chain: {DOCTOR_STATUS[s]}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Doctors Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {filtered.length} doctors found
          </p>
        </div>
        <button
          onClick={fetchDoctors}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search doctors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        {["all", "pending", "verified"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === f ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">No doctors found</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  Doctor
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  Specialization
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  License
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  On-Chain
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <tr key={d._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm text-slate-900">
                      {d.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {d.email || d.cnic}
                    </p>
                    {d.walletAddress && (
                      <p className="text-xs text-blue-500 font-mono mt-0.5">
                        {d.walletAddress.slice(0, 10)}...
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {d.specialization || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {d.licenseNumber || "—"}
                  </td>
                  <td className="px-4 py-3">{statusBadge(d)}</td>
                  <td className="px-4 py-3">
                    {chainBadge(d.walletAddress)}
                    {d.walletAddress &&
                      !chainStatuses[d.walletAddress] &&
                      chainStatuses[d.walletAddress] === undefined && (
                        <button
                          onClick={() => fetchChainStatus(d.walletAddress)}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          Check
                        </button>
                      )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setSelected(d);
                          setModal("view");
                          if (d.walletAddress)
                            fetchChainStatus(d.walletAddress);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {!d.isVerified && d.specialization && (
                        <>
                          <button
                            onClick={() => {
                              setSelected(d);
                              setModal("verify");
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="Verify"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelected(d);
                              setModal("reject");
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {d.isVerified && (
                        <button
                          onClick={() => {
                            setSelected(d);
                            setModal("suspend");
                          }}
                          className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                          title="Suspend"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setModal(null);
            setReason("");
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* VIEW */}
            {modal === "view" && (
              <>
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  Doctor Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-slate-400">Name:</span>{" "}
                    <span className="font-medium">{selected.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Email:</span>{" "}
                    {selected.email || "—"}
                  </div>
                  <div>
                    <span className="text-slate-400">CNIC:</span>{" "}
                    {selected.cnic || "—"}
                  </div>
                  <div>
                    <span className="text-slate-400">Phone:</span>{" "}
                    {selected.phone || "—"}
                  </div>
                  <div>
                    <span className="text-slate-400">Specialization:</span>{" "}
                    {selected.specialization || "—"}
                  </div>
                  <div>
                    <span className="text-slate-400">License:</span>{" "}
                    {selected.licenseNumber || "—"}
                  </div>
                  <div>
                    <span className="text-slate-400">Credentials:</span>{" "}
                    {selected.credentials || "—"}
                  </div>
                  <div>
                    <span className="text-slate-400">Wallet:</span>{" "}
                    <span className="font-mono text-xs">
                      {selected.walletAddress || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">DB Status:</span>{" "}
                    {statusBadge(selected)}
                  </div>
                  <div>
                    <span className="text-slate-400">On-Chain:</span>{" "}
                    {chainBadge(selected.walletAddress) || "Not checked"}
                  </div>
                  {selected.walletAddress && (
                    <a
                      href={`https://sepolia.etherscan.io/address/${selected.walletAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-blue-500 hover:underline text-xs"
                    >
                      <ExternalLink className="w-3 h-3" /> View on Etherscan
                    </a>
                  )}
                  {selected.txHashes?.length > 0 && (
                    <div>
                      <span className="text-slate-400">Tx Hashes:</span>
                      {selected.txHashes.map((tx, i) => (
                        <a
                          key={i}
                          href={`https://sepolia.etherscan.io/tx/${tx}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xs text-blue-500 hover:underline font-mono mt-1"
                        >
                          {tx.slice(0, 20)}...
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setModal(null)}
                  className="mt-4 w-full py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium"
                >
                  Close
                </button>
              </>
            )}

            {/* VERIFY */}
            {modal === "verify" && (
              <>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Verify Doctor
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  Verify <strong>{selected.name}</strong> (
                  {selected.specialization})?
                </p>

                {!window.ethereum && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mb-3">
                    ⚠️ MetaMask not found. Verification will be off-chain only.
                  </p>
                )}
                {window.ethereum && !selected.walletAddress && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mb-3">
                    ⚠️ Doctor has no wallet. Verification will be off-chain
                    only.
                  </p>
                )}
                {window.ethereum && selected.walletAddress && (
                  <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg mb-3">
                    {" "}
                    MetaMask will sign transaction on Sepolia blockchain.
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setModal(null);
                      setSelected(null);
                    }}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleVerify(selected._id)}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}{" "}
                    Verify
                  </button>
                </div>
              </>
            )}

            {/* REJECT */}
            {modal === "reject" && (
              <>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Reject Doctor
                </h3>
                <p className="text-sm text-slate-500 mb-3">
                  Reject <strong>{selected.name}</strong>?
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 mb-3"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setModal(null);
                      setReason("");
                    }}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReject(selected._id)}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}{" "}
                    Reject
                  </button>
                </div>
              </>
            )}

            {/* SUSPEND */}
            {modal === "suspend" && (
              <>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Suspend Doctor
                </h3>
                <p className="text-sm text-slate-500 mb-3">
                  Suspend <strong>{selected.name}</strong>?
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for suspension..."
                  className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 mb-3"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setModal(null);
                      setReason("");
                    }}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSuspend(selected._id)}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Ban className="w-4 h-4" />
                    )}{" "}
                    Suspend
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
