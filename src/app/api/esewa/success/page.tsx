"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/app/_trpc/client";

const Page = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dataQuery = searchParams.get("data");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePayment = trpc.updatePayment.useMutation();
  const navigateToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  useEffect(() => {
    if (dataQuery) {
      try {
        // Decode and parse the `data` parameter
        const decodedData = atob(dataQuery); // Decode Base64
        const parsedData = JSON.parse(decodedData); // Parse JSON

        const { transaction_code: transactionCode } = parsedData;

        if (transactionCode) {
          setLoading(true);
          updatePayment
            .mutateAsync({ transactionCode })
            .then(() => {
              navigateToDashboard();
              // Navigate to dashboard on success
            })
            .catch((mutationError) => {
              console.error("Error updating payment:", mutationError);
              setError("Failed to update payment. Please try again.");
            })
            .finally(() => setLoading(false));
        } else {
          setError("Invalid transaction code.");
        }
      } catch (error) {
        console.error("Error processing query data:", error);
        setError("Invalid payment data.");
      }
    }
  }, [dataQuery, router]);

  if (loading) {
    return <div className="text-center py-8">Processing your payment...</div>;
  }

  return (
    <div className="payment-container text-center py-8">
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          <p className="text-2xl font-semibold">Payment Successful</p>
          <p className="text-lg text-green-600 mt-2">
            Redirecting to your dashboard...
          </p>
        </>
      )}
    </div>
  );
};

export default Page;
