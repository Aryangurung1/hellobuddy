// import BillingForm from "@/components/BillingForm";
// import { getUserSubscriptionPlan } from "@/lib/stripe";
// import { redirect } from "next/navigation";

// const Page = async () => {
//   try {
//     const subscriptionPlan = await getUserSubscriptionPlan();

//     // Check if subscriptionPlan or its id is null/undefined
//     if (!subscriptionPlan) {
//       console.error("Invalid subscription plan data:", subscriptionPlan);
//       throw new Error("Subscription plan not found or invalid data returned.");
//     }

//     return <BillingForm subscriptionPlan={subscriptionPlan} />;
//   } catch (error) {
//     redirect("/sign-in");
//   }
// };

// export default Page;

import BillingForm from "@/components/BillingForm";
import { getUserSubscriptionPlan } from "@/lib/stripe";
import { redirect } from "next/navigation"; // To redirect user

const Page = async () => {
  const subscriptionPlan = await getUserSubscriptionPlan();

  // If subscriptionPlan is null or undefined, handle it
  if (!subscriptionPlan) {
    console.error("No subscription plan found for the user.");
    return redirect("/sign-in"); // Redirect to the sign-in page or an error page
  }

  return <BillingForm subscriptionPlan={subscriptionPlan} />;
};

export default Page;
