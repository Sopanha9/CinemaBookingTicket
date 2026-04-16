import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import {
  createPayment,
  getPayment,
  getPayments,
} from "../features/payments/api";
import { toastError, toastSuccess } from "../lib/toast";

const TERMINAL_STATUSES = new Set(["paid", "failed", "refunded"]);

const formatRemaining = (ms) => {
  const safe = Math.max(0, Math.floor(ms / 1000));
  const min = String(Math.floor(safe / 60)).padStart(2, "0");
  const sec = String(safe % 60).padStart(2, "0");
  return `${min}:${sec}`;
};

export default function PaymentPage() {
  const { id } = useParams();
  const bookingId = Number(id);
  const navigate = useNavigate();

  const [activePayment, setActivePayment] = useState(null);
  const [provider, setProvider] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const [manualCheckEnabled, setManualCheckEnabled] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  const paidNavigatedRef = useRef(false);

  const existingPaymentsQuery = useQuery({
    queryKey: ["booking-payments", bookingId],
    queryFn: () => getPayments(bookingId),
    enabled: Number.isInteger(bookingId) && bookingId > 0,
  });

  useEffect(() => {
    if (!Array.isArray(existingPaymentsQuery.data) || activePayment) {
      return;
    }

    const existing = existingPaymentsQuery.data.find(
      (payment) => payment.status === "pending" || payment.status === "paid",
    );

    if (existing) {
      setActivePayment(existing);
    }
  }, [activePayment, existingPaymentsQuery.data]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const expiryRemainingMs = useMemo(() => {
    if (!provider?.expiresAt) {
      return null;
    }

    return Math.max(0, new Date(provider.expiresAt).getTime() - nowMs);
  }, [nowMs, provider?.expiresAt]);

  const isQrExpired = provider?.expiresAt
    ? Number(expiryRemainingMs) <= 0
    : false;

  const shouldPoll =
    Boolean(activePayment?.id) &&
    !TERMINAL_STATUSES.has(activePayment?.status) &&
    !isQrExpired &&
    pollCount < 20;

  const paymentStatusQuery = useQuery({
    queryKey: ["payment", activePayment?.id],
    queryFn: () => getPayment(activePayment.id),
    enabled: Boolean(activePayment?.id),
    refetchInterval: shouldPoll ? 3000 : false,
  });

  useEffect(() => {
    if (paymentStatusQuery.data) {
      setActivePayment(paymentStatusQuery.data);
      if (!TERMINAL_STATUSES.has(paymentStatusQuery.data.status)) {
        setPollCount((count) => Math.min(20, count + 1));
      }
    }
  }, [paymentStatusQuery.data]);

  useEffect(() => {
    if (
      pollCount >= 20 &&
      !TERMINAL_STATUSES.has(activePayment?.status || "")
    ) {
      setManualCheckEnabled(true);
    }
  }, [activePayment?.status, pollCount]);

  useEffect(() => {
    if (activePayment?.status === "paid" && !paidNavigatedRef.current) {
      paidNavigatedRef.current = true;
      toastSuccess("Payment confirmed!");
      navigate(`/bookings/${bookingId}`);
    }
  }, [activePayment?.status, bookingId, navigate]);

  const createPaymentMutation = useMutation({
    mutationFn: () =>
      createPayment({
        bookingId,
        paymentMethod: "upi",
      }),
  });

  const handleCreatePayment = async () => {
    try {
      const result = await createPaymentMutation.mutateAsync();
      setActivePayment(result.payment || null);
      setProvider(result.provider || null);
      setPollCount(0);
      setManualCheckEnabled(false);
    } catch (err) {
      toastError(err?.message || "Failed to create payment", err?.requestId);
    }
  };

  const handleManualCheck = async () => {
    if (!activePayment?.id) {
      return;
    }

    try {
      const latest = await paymentStatusQuery.refetch();
      if (latest?.data) {
        setActivePayment(latest.data);
      }
    } catch (err) {
      toastError(
        err?.message || "Failed to refresh payment status",
        err?.requestId,
      );
    }
  };

  const handleCopyPayload = async () => {
    if (!provider?.qrPayload) {
      return;
    }

    try {
      await navigator.clipboard.writeText(provider.qrPayload);
      toastSuccess("Copied payment code");
    } catch {
      toastError("Failed to copy payment code");
    }
  };

  const handleRetryPayment = () => {
    setActivePayment(null);
    setProvider(null);
    setPollCount(0);
    setManualCheckEnabled(false);
    paidNavigatedRef.current = false;
  };

  const isPaymentForbidden = existingPaymentsQuery.error?.status === 403;

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return (
      <Card className="border-error/50">
        <CardContent className="pt-6">
          <p className="text-sm text-error">Invalid booking id.</p>
        </CardContent>
      </Card>
    );
  }

  if (existingPaymentsQuery.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" variant="shimmer" />
        <Skeleton className="h-72 w-full" variant="shimmer" />
      </div>
    );
  }

  if (existingPaymentsQuery.isError) {
    return (
      <Card className="border-error/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-error">
              {isPaymentForbidden
                ? "You don't have permission to view this."
                : "Failed to load payment details."}
            </p>
            <Button
              type="button"
              onClick={() => existingPaymentsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = activePayment?.status;

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-base-content">
          Complete Payment
        </h1>
        <p className="text-sm text-base-content/70">Booking #{bookingId}</p>
      </header>

      {!activePayment ? (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>
              UPI is currently supported for customer checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-secondary/50 bg-secondary/15 p-4">
              <p className="font-semibold text-secondary">UPI</p>
              <p className="text-sm text-base-content/70">
                Scan and pay from any UPI app.
              </p>
            </div>

            <Button
              type="button"
              disabled={createPaymentMutation.isPending}
              onClick={handleCreatePayment}
            >
              {createPaymentMutation.isPending
                ? "Creating payment..."
                : "Pay Now"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {activePayment ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Payment Status</CardTitle>
            <Badge
              variant={
                status === "paid"
                  ? "default"
                  : status === "pending"
                    ? "secondary"
                    : status === "failed"
                      ? "destructive"
                      : "outline"
              }
            >
              {status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "pending" ? (
              <>
                {provider?.qrImageUrl ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Scan to pay</p>
                    <img
                      src={provider.qrImageUrl}
                      alt="Scan to pay"
                      className="h-64 w-64 rounded-lg border border-base-300 bg-white object-contain p-3"
                    />
                  </div>
                ) : null}

                {!provider?.qrImageUrl && provider?.qrPayload ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Scan to pay</p>
                    <pre className="overflow-x-auto rounded-lg border border-base-300 bg-base-200 p-3 text-xs">
                      {provider.qrPayload}
                    </pre>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopyPayload}
                    >
                      Copy Code
                    </Button>
                  </div>
                ) : null}

                {!provider?.qrImageUrl && !provider?.qrPayload ? (
                  <p className="text-sm text-base-content/70">
                    Waiting for payment confirmation. QR details are unavailable
                    for this payment intent.
                  </p>
                ) : null}

                {provider?.expiresAt ? (
                  <p className="text-sm text-base-content/80">
                    Expires in:{" "}
                    <span className="font-semibold">
                      {formatRemaining(expiryRemainingMs || 0)}
                    </span>
                  </p>
                ) : null}

                {isQrExpired ? (
                  <p className="text-sm font-medium text-error">
                    QR expired — please retry
                  </p>
                ) : (
                  <p className="text-sm text-base-content/70">
                    Waiting for payment...
                  </p>
                )}
              </>
            ) : null}

            {status === "failed" ? (
              <div className="space-y-3 rounded-lg border border-error/40 bg-error/10 p-4">
                <p className="text-sm text-error">
                  Payment failed. Please try again.
                </p>
                <Button type="button" onClick={handleRetryPayment}>
                  Retry Payment
                </Button>
              </div>
            ) : null}

            {status === "refunded" ? (
              <div className="rounded-lg border border-base-300 bg-base-200 p-4 text-sm">
                This payment was refunded.
              </div>
            ) : null}

            {manualCheckEnabled ? (
              <div className="rounded-lg border border-warning/40 bg-warning/15 p-4">
                <p className="mb-3 text-sm font-medium text-warning">
                  Payment is taking longer than expected.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleManualCheck}
                >
                  Check Status
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
