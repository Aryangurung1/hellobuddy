// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import Dashboard from "@/components/Dashboard";
// import { TermsAndConditionsDialog } from "@/components/TermsAndConditionsDialog";
// import { trpc } from "@/app/_trpc/client";
// import { toast } from "react-hot-toast";

// interface DashboardClientProps {
//   subscriptionPlan: any; // Replace 'any' with the actual type of subscriptionPlan
//   hasAcceptedTerms: boolean;
//   userId: string;
// }

// const DashboardClient: React.FC<DashboardClientProps> = ({
//   subscriptionPlan,
//   hasAcceptedTerms,
//   userId,
// }) => {
//   const [showTerms, setShowTerms] = useState(!hasAcceptedTerms);
//   const router = useRouter();

//   const { mutate: acceptTerms } = trpc.acceptTermsAndConditions.useMutation({
//     onSuccess: () => {
//       setShowTerms(false);
//       toast.success("Terms and conditions accepted");
//     },
//     onError: (error) => {
//       toast.error(error.message);
//     },
//   });

//   const { mutate: rejectTerms } = trpc.rejectTermsAndConditions.useMutation({
//     onSuccess: () => {
//       router.push("/api/auth/logout");
//       toast.success("Your account has been logout");
//     },
//     onError: (error) => {
//       toast.error(error.message);
//     },
//   });

//   const handleAcceptTerms = () => {
//     acceptTerms();
//   };

//   const handleRejectTerms = () => {
//     rejectTerms();
//   };

//   if (showTerms) {
//     return (
//       <TermsAndConditionsDialog
//         isOpen={showTerms}
//         onAccept={handleAcceptTerms}
//         onReject={handleRejectTerms}
//       />
//     );
//   }

//   return <Dashboard subscriptionPlan={subscriptionPlan} />;
// };

// export default DashboardClient;

"use client";

import DashboardWrapper from "./DashboardWrapper";

interface DashboardClientProps {
  subscriptionPlan: any; // Replace 'any' with the actual type of subscriptionPlan
  userId: string;
}

const DashboardClient: React.FC<DashboardClientProps> = ({
  subscriptionPlan,
  userId,
}) => {
  return (
    <DashboardWrapper subscriptionPlan={subscriptionPlan} userId={userId} />
  );
};

export default DashboardClient;
