"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../_trpc/client";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const AuthCallback = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const origin = searchParams.get("origin");

  // TRPC Query for auth callback
  const { isLoading, isSuccess, error } = trpc.authCallback.useQuery(
    undefined,
    {
      retry: true,
      retryDelay: 500,
    }
  );

  // Effect to handle redirection based on the auth status
  useEffect(() => {
    if (error?.data?.code === "UNAUTHORIZED") {
      router.push("/sign-in");
    }

    if (isSuccess) {
      router.push(origin ? `/${origin}` : "/dashboard");
    }
  }, [isSuccess, error, origin, router]);

  // Loading state UI
  return (
    <div className="w-full mt-24 flex justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-800" />
        <h3 className="font-semibold text-xl">Setting up your account...</h3>
        <p>You will be redirected automatically.</p>
        {isLoading && <p className="text-sm text-gray-600">Loading...</p>}
        {error && (
          <p className="text-sm text-red-500">Error: {error.message}</p>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
