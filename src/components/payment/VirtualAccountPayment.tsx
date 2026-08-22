"use client";

import { useState, useEffect } from "react";
import { generateVirtualAccount } from "@/actions/midtransPayment";
import { MidtransBank } from "@/lib/midtrans";
import {
  CreditCard, Copy, Check, Clock, AlertTriangle, ShieldCheck,
  Building2, ChevronDown, ChevronUp, RefreshCw, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  itemId: string;
  itemType: string;
  amount: number;
  virtualAccountNumber: string | null;
  bank: string | null;
  status: string;
  expiryTime: string | null;
  dueDate: string;
  paidAt: string | null;
  student?: {
    name: string;
    studentIdStr: string | null;
  };
}

interface Props {
  invoice: InvoiceData;
  studentName?: string;
  onRefresh?: () => void;
}

const SUPPORTED_BANKS: { id: MidtransBank; name: string; logoText: string; color: string; bg: string }[] = [
  { id: "bca", name: "BCA", logoText: "BCA", color: "text-blue-400", bg: "bg-blue-600/10 border-blue-500/20" },
  { id: "bni", name: "BNI", logoText: "BNI", color: "text-orange-400", bg: "bg-orange-600/10 border-orange-500/20" },
  { id: "bri", name: "BRI", logoText: "BRI", color: "text-blue-500", bg: "bg-blue-700/10 border-blue-600/20" },
  { id: "mandiri", name: "Mandiri", logoText: "MANDIRI", color: "text-amber-400", bg: "bg-amber-600/10 border-amber-500/20" },
  { id: "permata", name: "Permata", logoText: "PERMATA", color: "text-emerald-400", bg: "bg-emerald-600/10 border-emerald-500/20" },
];

const BANK_INSTRUCTIONS: Record<string, { atm: string[]; mobile: string[]; internet: string[] }> = {
  bca: {
    atm: [
      "Masukkan kartu ATM BCA & PIN Anda.",
      "Pilih menu Transaksi Lainnya > Transfer > Ke Rek BCA Virtual Account.",
      "Masukkan nomor BCA Virtual Account yang tertera di atas.",
      "Periksa rincian pembayaran, lalu pilih YA.",
      "Simpan resi sebagai bukti transaksi.",
    ],
    mobile: [
      "Buka aplikasi m-BCA dan masukkan Kode Akses Anda.",
      "Pilih menu m-Transfer > BCA Virtual Account.",
      "Masukkan nomor Virtual Account yang tertera di atas.",
      "Masukkan PIN m-BCA Anda untuk mengonfirmasi transaksi.",
      "Transaksi selesai dan status pembayaran akan diperbarui secara otomatis.",
    ],
    internet: [
      "Login ke KlikBCA Individu.",
      "Pilih menu Transfer Dana > Transfer ke BCA Virtual Account.",
      "Masukkan nomor Virtual Account yang tertera di atas.",
      "Masukkan Respon KeyBCA APPLI 1 dan klik Kirim.",
    ],
  },
  bni: {
    atm: [
      "Masukkan Kartu ATM BNI & PIN Anda.",
      "Pilih Menu Lain > Transfer > Ke Rekening BNI Virtual Account.",
      "Masukkan nomor BNI Virtual Account.",
      "Periksa jumlah tagihan dan tekan YA.",
    ],
    mobile: [
      "Buka aplikasi BNI Mobile Banking dan login.",
      "Pilih menu Transfer > Virtual Account Billing.",
      "Pilih Rekening Debet dan Masukkan Nomor Virtual Account.",
      "Konfirmasi transaksi dengan masukkan Password Transaksi.",
    ],
    internet: [
      "Kunjungi website BNI Internet Banking.",
      "Pilih Transfer > Tambah Rekening Favorit > Virtual Account.",
      "Masukkan nomor VA dan konfirmasi dengan Token BNI.",
    ],
  },
  bri: {
    atm: [
      "Masukkan kartu ATM BRI & PIN.",
      "Pilih Transaksi Lain > Pembayaran > Lainnya > BRIVA.",
      "Masukkan nomor BRIVA Virtual Account.",
      "Konfirmasi detail pembayaran dan tekan YA.",
    ],
    mobile: [
      "Buka aplikasi BRImo dan login.",
      "Pilih menu BRIVA.",
      "Masukkan nomor BRIVA Virtual Account.",
      "Konfirmasi pembayaran dengan masukkan PIN BRImo.",
    ],
    internet: [
      "Login ke Internet Banking BRI.",
      "Pilih menu Pembayaran & Pembelian > BRIVA.",
      "Masukkan nomor BRIVA dan otorisasi transaksi dengan Token.",
    ],
  },
  mandiri: {
    atm: [
      "Masukkan Kartu ATM Mandiri & PIN.",
      "Pilih menu Bayar/Beli > Multipayment.",
      "Masukkan Kode Perusahaan / Biller (misal: 70012).",
      "Masukkan Kode Bayar / Bill Key Virtual Account.",
      "Konfirmasi tagihan dan tekan Ya.",
    ],
    mobile: [
      "Buka aplikasi Livin' by Mandiri dan login.",
      "Pilih menu Bayar > Multipayment.",
      "Cari penyedia jasa Kaputra / Midtrans.",
      "Masukkan Kode Bayar / VA Number lalu konfirmasi dengan PIN.",
    ],
    internet: [
      "Login ke Mandiri Online.",
      "Pilih Bayar > Multipayment.",
      "Masukkan kode biller dan nomor VA, lalu otorisasi transaksi.",
    ],
  },
  permata: {
    atm: [
      "Masukkan Kartu ATM Permata & PIN.",
      "Pilih Transaksi Lainnya > Pembayaran > Pembayaran Lainnya > Virtual Account.",
      "Masukkan nomor Permata Virtual Account.",
      "Tekan Benar untuk menyelesaikan transaksi.",
    ],
    mobile: [
      "Buka aplikasi PermataMobile X dan login.",
      "Pilih Pembayaran Tagihan > Virtual Account.",
      "Masukkan nomor VA dan konfirmasi transaksi.",
    ],
    internet: [
      "Login ke PermataNet.",
      "Pilih Pembayaran > Virtual Account.",
      "Masukkan nomor VA dan konfirmasi dengan SMS Token.",
    ],
  },
};

export default function VirtualAccountPayment({ invoice, studentName, onRefresh }: Props) {
  const [selectedBank, setSelectedBank] = useState<MidtransBank>(
    (invoice.bank as MidtransBank) || "bca"
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeInstructionTab, setActiveInstructionTab] = useState<"mobile" | "atm" | "internet">("mobile");
  const [showInstructions, setShowInstructions] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Time remaining countdown logic
  const [timeRemaining, setTimeRemaining] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  const targetExpiry = invoice.expiryTime || invoice.dueDate;

  useEffect(() => {
    if (!targetExpiry || invoice.status === "PAID") return;

    const updateCountdown = () => {
      const expiryDate = new Date(targetExpiry).getTime();
      const now = new Date().getTime();
      const diff = expiryDate - now;

      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining({ hours, minutes, seconds, isExpired: false });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetExpiry, invoice.status]);

  const handleGenerateVa = async (bankToGen: MidtransBank) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await generateVirtualAccount(invoice.id, bankToGen);
      if (res.success) {
        if (onRefresh) onRefresh();
      } else {
        setErrorMsg(res.error || "Failed to generate Virtual Account.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyVa = () => {
    if (!invoice.virtualAccountNumber) return;
    navigator.clipboard.writeText(invoice.virtualAccountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isPaid = invoice.status === "PAID";
  const isExpired = invoice.status === "EXPIRED" || timeRemaining.isExpired;
  const currentBankObj = SUPPORTED_BANKS.find((b) => b.id === (invoice.bank || selectedBank)) || SUPPORTED_BANKS[0];
  const instructions = BANK_INSTRUCTIONS[invoice.bank || selectedBank] || BANK_INSTRUCTIONS.bca;

  return (
    <div className="space-y-6">
      {/* Invoice Overview Header */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider">Official Invoice</span>
            <h2 className="text-xl font-mono font-black text-white">{invoice.invoiceNumber}</h2>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
              isPaid
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : isExpired
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : invoice.status === "WAITING_VERIFICATION"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
            }`}>
              {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : isExpired ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              {isPaid ? "Payment Successful" : isExpired ? "Virtual Account Expired" : "Pending Payment"}
            </span>
          </div>
        </div>

        {/* Invoice Key Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-sm">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Student Name</p>
            <p className="font-bold text-white mt-0.5">{studentName || invoice.student?.name || "Student"}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Item Program</p>
            <p className="font-bold text-white mt-0.5">{invoice.itemId}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Payment Type</p>
            <p className="font-bold text-slate-300 mt-0.5">{invoice.itemType}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total Amount</p>
            <p className="text-lg font-black text-[#CA8E25] mt-0.5">Rp {invoice.amount.toLocaleString("id-ID")}</p>
          </div>
        </div>
      </div>

      {/* Paid Status Banner */}
      {isPaid ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-2"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-black text-emerald-400">Payment Completed Successfully</h3>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Your Virtual Account payment of <strong className="text-white">Rp {invoice.amount.toLocaleString("id-ID")}</strong> has been confirmed by Midtrans.
          </p>
          {invoice.paidAt && (
            <p className="text-xs font-mono text-slate-400 pt-1">
              Paid at: {new Date(invoice.paidAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </motion.div>
      ) : (
        <>
          {/* Bank Selection UI (if VA not yet generated or user wants to generate for another bank) */}
          {!invoice.virtualAccountNumber || isExpired ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#CA8E25]" />
                  Select Your Bank for Virtual Account
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Choose your bank to generate a Midtrans Virtual Account number for instant automated payment verification.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {SUPPORTED_BANKS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBank(b.id)}
                    className={`p-4 rounded-xl border text-left transition flex items-center justify-between ${
                      selectedBank === b.id
                        ? "border-[#CA8E25] bg-[#CA8E25]/10 text-white shadow-lg"
                        : "border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-300"
                    }`}
                  >
                    <div>
                      <span className={`inline-block text-xs font-black px-2 py-0.5 rounded border mb-1.5 ${b.bg} ${b.color}`}>
                        {b.logoText}
                      </span>
                      <p className="text-xs font-bold">{b.name}</p>
                    </div>
                    {selectedBank === b.id && <Check className="h-4 w-4 text-[#CA8E25]" />}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => handleGenerateVa(selectedBank)}
                disabled={loading}
                className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-extrabold rounded-xl py-3 text-sm shadow-md"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Generating Virtual Account...
                  </span>
                ) : (
                  `Generate ${selectedBank.toUpperCase()} Virtual Account`
                )}
              </Button>
            </div>
          ) : (
            /* Virtual Account Display & Countdown Panel */
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
              {/* Countdown Timer */}
              {!isExpired && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-[#CA8E25]/10 border border-[#CA8E25]/20 rounded-xl gap-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-[#CA8E25] shrink-0 animate-pulse" />
                    <div>
                      <p className="text-xs font-bold text-[#CA8E25] uppercase tracking-wide">Expiration Countdown</p>
                      <p className="text-xs text-slate-300">Complete payment before the Virtual Account expires:</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono font-black text-white text-lg bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                    <span className="text-[#CA8E25]">{String(timeRemaining.hours).padStart(2, "0")}h</span>
                    <span>:</span>
                    <span className="text-[#CA8E25]">{String(timeRemaining.minutes).padStart(2, "0")}m</span>
                    <span>:</span>
                    <span className="text-[#CA8E25]">{String(timeRemaining.seconds).padStart(2, "0")}s</span>
                  </div>
                </div>
              )}

              {/* VA Number Card */}
              <div className="p-6 bg-slate-900/80 border border-slate-850 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black px-2.5 py-1 rounded-lg border uppercase ${currentBankObj.bg} ${currentBankObj.color}`}>
                    {currentBankObj.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Midtrans Core API</span>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1">Bank Account Number (a.n. ANDI JULIO KAPUTRA):</p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 flex items-center justify-between">
                      <span className="font-mono text-xl sm:text-2xl font-black text-white tracking-widest">
                        {invoice.virtualAccountNumber}
                      </span>
                    </div>
                    <Button
                      onClick={handleCopyVa}
                      className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                        copied
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-[#CA8E25] hover:bg-[#D89A2B] text-black"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Copy Number
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                  <span>Amount to Transfer:</span>
                  <span className="font-mono font-bold text-white text-base">Rp {invoice.amount.toLocaleString("id-ID")}</span>
                </div>
              </div>

              {/* Re-generate another bank option */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-400">Need to pay via a different bank?</span>
                <button
                  type="button"
                  onClick={() => handleGenerateVa(selectedBank === "bca" ? "bni" : "bca")}
                  className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Change Bank
                </button>
              </div>

              {/* Step-by-Step Payment Instructions Accordion */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                <button
                  type="button"
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-900/50 transition"
                >
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <ShieldCheck className="h-4 w-4 text-[#CA8E25]" />
                    Payment Instructions ({currentBankObj.logoText})
                  </div>
                  {showInstructions ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>

                <AnimatePresence>
                  {showInstructions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-800 p-5 space-y-4"
                    >
                      {/* Instruction Tabs */}
                      <div className="flex border-b border-slate-800 gap-4 text-xs font-bold">
                        {(["mobile", "atm", "internet"] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveInstructionTab(tab)}
                            className={`pb-2 capitalize transition border-b-2 ${
                              activeInstructionTab === tab
                                ? "border-[#CA8E25] text-white"
                                : "border-transparent text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {tab === "mobile" ? "m-Banking / App" : tab === "atm" ? "ATM Transfer" : "Internet Banking"}
                          </button>
                        ))}
                      </div>

                      {/* Instruction Steps */}
                      <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside pl-1">
                        {instructions[activeInstructionTab].map((step, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <span className="text-slate-200">{step}</span>
                          </li>
                        ))}
                      </ol>

                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                        ⚡ <strong>Automated Verification:</strong> Once transferred, Midtrans automatically confirms your payment in real-time. No manual receipt upload required.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
