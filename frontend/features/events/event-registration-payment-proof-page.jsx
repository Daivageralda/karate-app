"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { getEventDojoRegistrationDetail } from "@/features/events/service";
import { SiteShell } from "@/shared/components/site-shell";
import { ROUTES } from "@/shared/config/routes";
import { formatDateTime, formatText } from "@/shared/utils/formatters";

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "Rp0";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const isPdfPath = (filePath) => {
  return typeof filePath === "string" && /\.pdf($|\?)/i.test(filePath);
};

const getPaymentStatusMeta = (status) => {
  if (status === "approved") {
    return { label: "Disetujui", className: "bg-green-100 text-green-700" };
  }

  if (status === "pending") {
    return { label: "Menunggu Pembayaran", className: "bg-amber-100 text-amber-700" };
  }

  if (status === "expired") {
    return { label: "Kadaluarsa", className: "bg-red-100 text-red-700" };
  }

  if (status === "failed") {
    return { label: "Gagal", className: "bg-red-100 text-red-700" };
  }

  return { label: "Belum Ada Data", className: "bg-app-surface-muted text-app-text-secondary" };
};

export function EventRegistrationPaymentProofPage({ navigation, event, dojoId, returnTab = "athletes" }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const payload = await getEventDojoRegistrationDetail(event.id, dojoId);
      setDetail(payload);
    } catch (loadError) {
      setError(loadError?.message || "Gagal memuat bukti pembayaran");
    } finally {
      setIsLoading(false);
    }
  }, [dojoId, event.id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const registrationPayment = detail?.registrationPayment || null;
  const effectiveStatus = registrationPayment?.xenditStatus
    ? ["paid", "settled"].includes(String(registrationPayment.xenditStatus).trim().toLowerCase())
      ? "approved"
      : String(registrationPayment.xenditStatus).trim().toLowerCase()
    : detail?.statusSummary?.registrationPaymentStatus;
  const paymentStatusMeta = getPaymentStatusMeta(effectiveStatus);
  const isXenditPayment = registrationPayment?.paymentProvider === "xendit";
  const hasManualPaymentProof = Boolean(registrationPayment?.fileUrl);

  return (
    <SiteShell navigation={navigation}>
      <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-app-text-secondary">Payment Proof</p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-app-text-primary">
              Bukti Pembayaran Pendaftaran Dojo
            </h1>
            <p className="mt-2 text-sm text-app-text-secondary">
              {formatText(event?.name)}
            </p>
          </div>
          <Link
            href={`${ROUTES.eventsRegistrationDojoDetail(event.id, dojoId)}?active_tab=${encodeURIComponent(returnTab || "athletes")}`}
            className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
          >
            Kembali ke Detail Dojo
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-6 rounded-2xl border border-app-border bg-app-surface-muted p-4 text-sm text-app-text-secondary">
            Memuat bukti pembayaran...
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-app-border bg-app-surface-muted p-4">
                <p className="text-xs uppercase tracking-wide text-app-text-secondary">Status</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusMeta.className}`}>
                  {paymentStatusMeta.label}
                </span>
              </div>
              <div className="rounded-2xl border border-app-border bg-app-surface-muted p-4">
                <p className="text-xs uppercase tracking-wide text-app-text-secondary">Provider</p>
                <p className="mt-2 text-sm font-semibold text-app-text-primary">{isXenditPayment ? "Xendit" : "Manual Upload"}</p>
              </div>
              <div className="rounded-2xl border border-app-border bg-app-surface-muted p-4">
                <p className="text-xs uppercase tracking-wide text-app-text-secondary">Total Nominal</p>
                <p className="mt-2 text-sm font-semibold text-app-text-primary">{formatCurrency(detail?.statusSummary?.totalNominal || 0)}</p>
              </div>
              <div className="rounded-2xl border border-app-border bg-app-surface-muted p-4">
                <p className="text-xs uppercase tracking-wide text-app-text-secondary">Dibuat</p>
                <p className="mt-2 text-sm font-semibold text-app-text-primary">{formatDateTime(registrationPayment?.uploadedAt)}</p>
              </div>
            </div>

            {registrationPayment ? (
              <div className="rounded-3xl border border-app-border bg-app-surface p-5 shadow-sm">
                <h2 className="font-display text-lg font-semibold text-app-text-primary">Detail Pembayaran</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-app-border bg-app-surface-muted p-4 text-sm text-app-text-primary">
                    <div className="grid gap-2">
                      <p><span className="font-semibold">Invoice ID:</span> {registrationPayment?.xenditInvoiceId || "-"}</p>
                      <p><span className="font-semibold">External ID:</span> {registrationPayment?.xenditExternalId || "-"}</p>
                      <p><span className="font-semibold">Gateway Status:</span> {registrationPayment?.xenditStatus || "-"}</p>
                      <p><span className="font-semibold">Paid at:</span> {formatDateTime(registrationPayment?.xenditPaidAt)}</p>
                      <p><span className="font-semibold">Expiry:</span> {formatDateTime(registrationPayment?.xenditExpiryDate)}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-app-border bg-app-surface-muted p-4 text-sm text-app-text-primary">
                    <div className="grid gap-2">
                      <p><span className="font-semibold">Event:</span> {formatText(event?.name)}</p>
                      <p><span className="font-semibold">Dojo ID:</span> {dojoId}</p>
                      <p><span className="font-semibold">Payment Provider:</span> {registrationPayment?.paymentProvider || "-"}</p>
                      <p><span className="font-semibold">Proof Type:</span> {hasManualPaymentProof ? "Uploaded File" : isXenditPayment ? "Hosted Invoice" : "-"}</p>
                    </div>
                  </div>
                </div>

                {hasManualPaymentProof ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-app-border bg-app-surface-muted">
                    {isPdfPath(registrationPayment.filePath) ? (
                      <iframe
                        title={`payment-proof-${dojoId}`}
                        src={registrationPayment.fileUrl}
                        className="h-[82vh] w-full bg-white"
                      />
                    ) : (
                      <div className="flex h-[82vh] items-center justify-center p-4">
                        <img
                          src={registrationPayment.fileUrl}
                          alt="Bukti pembayaran"
                          className="max-h-full w-auto rounded-lg border border-app-border bg-white object-contain"
                        />
                      </div>
                    )}
                  </div>
                ) : isXenditPayment ? (
                  <div className="mt-4 rounded-2xl border border-app-border bg-app-surface-muted p-4 text-sm text-app-text-secondary">
                    Pembayaran ini menggunakan hosted invoice Xendit. Bukti yang tersedia di sistem adalah metadata invoice dan status pembayaran, bukan file upload manual.
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-app-border bg-app-surface-muted p-4 text-sm text-app-text-secondary">
                    Belum ada file bukti pembayaran yang tersimpan.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-app-border bg-app-surface-muted p-4 text-sm text-app-text-secondary">
                Belum ada data pembayaran untuk dojo ini.
              </div>
            )}
          </div>
        ) : null}
      </section>
    </SiteShell>
  );
}
