export interface SubscriptionPlan {
  stripeSubscriptionId: string | null;
  stripeCurrentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
  isSubscribed: boolean;
  isCanceled: boolean;
  name: string;
  slug: string;
  quota: number;
  pagesPerPdf: number;
  price: {
    amount: number;
    priceIds: {
      test: string;
      production: string;
    };
  };
} 