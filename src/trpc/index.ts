import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { privateProcedure, publicProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { z } from "zod";
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";
import { absoluteUrl } from "@/lib/utils";
import { getUserSubscriptionPlan, stripe } from "@/lib/stripe";
import nodemailer from "nodemailer";
import { PLANS } from "@/config/stripe";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

const DEFAULT_TERMS = `Terms and Conditions

Welcome to our interactive chatbot platform (the "HelloBuddy"). By using the Service, you agree to the following terms and conditions. Please read them carefully.

1. Acceptance of Terms

By accessing or using the Service, you confirm that you have read, understood, and agree to be bound by these Terms and Conditions, as well as our Privacy Policy. If you do not agree, you must not use the Service.

2. User Responsibilities

2.1 Account Creation and Authentication

You must create an account using our authentication system powered by Kinde.

You are responsible for maintaining the confidentiality of your account credentials.

2.2 Usage Limits

Free-tier users have limited access to upload and interact with PDFs, including restrictions on file size and page count.

Subscription users gain access to higher file size and page limits.

2.3 Prohibited ActionsYou agree not to:

Violate any laws or regulations.

Upload PDFs containing illegal, harmful, or offensive content.

Attempt to bypass usage limits or security measures.

2.4 Violations

Accounts found violating these terms may be suspended or permanently deleted at the sole discretion of the Service.

3. User Data and Privacy

3.1 Data Collection

Your interactions with the chatbot, including uploaded PDFs, are stored securely in an encrypted format.

3.2 Data Usage

Administrators can view details such as which PDFs you have uploaded and delete them if necessary.

Administrators cannot access your chat interactions unless required by law.

3.3 Data Security

All user data is stored in a secure environment, akin to platforms like S3 buckets, to ensure the highest level of security and encryption.

4. Administrator Rights

4.1 Access to Information

Administrators can only access user information or take action on accounts in compliance with applicable laws.

4.2 PDF Management

Administrators may delete uploaded PDFs if deemed necessary for policy enforcement or legal compliance.

5. Subscription and Cancellation

5.1 Subscription Benefits

Paid subscription users enjoy increased file size limits, additional page access, and other premium features.

5.2 Cancellation

You may cancel your subscription at any time. Upon cancellation, your access will revert to the free-tier limitations at the end of the billing cycle.

6. Limitation of Liability

The Service is provided "as is" and "as available." We do not guarantee uninterrupted access or functionality.

We are not responsible for any loss or damages resulting from your use of the Service, including but not limited to data breaches caused by factors beyond our control.

7. Modifications to Terms

We reserve the right to modify these Terms and Conditions at any time. Any changes will be communicated through the Service. Continued use after changes constitutes acceptance of the revised terms.

8. Governing Law

These Terms and Conditions are governed by and construed in accordance with the laws of Nepal.`;

const fetchAccessToken = async () => {
  const response = await fetch("https://hellobu.kinde.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      audience: "https://hellobu.kinde.com/api",
      grant_type: "client_credentials", // You can use other grant types depending on your flow
      client_id: "a115a3af6750419893fae537a390d711",
      client_secret: `k5vYA6qYQAO1IIiAwqjBCruohjPw9jSdUTkWHWyBMlNp09fsO`,
    }),
  });

  const data = await response.json();
  console.log(data);
  return data.access_token; // The token is typically in 'access_token'
};

// Function to fetch user info from Kinde by email
const fetchUserFromKindeByEmail = async (userId: string) => {
  try {
    const accessToken = await fetchAccessToken(); // Fetch the token

    if (!accessToken) {
      throw new Error("Failed to fetch access token.");
    }

    const apiUrl = `https://hellobu.kinde.com/api/v1/user?id=${userId}`; // Adjust the query parameter as needed

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text(); // Get detailed error response
      throw new Error(
        `Error fetching user info from Kinde. Status: ${response.status}, Message: ${errorText}`
      );
    }

    const kindeUser = await response.json();
    console.log("Fetched Kinde user:", kindeUser);
    return kindeUser;
  } catch (error) {
    console.error(
      `Error fetching user info for userId: ${userId}. Details:`,
      error
    );
    return null;
  }
};

// Create a transporter for sending emails using Nodemailer
const transporter = nodemailer.createTransport({
  service: "Gmail", // You can use any email service you prefer
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // Your email password or an app password
  },
});

async function sendEmail(userEmail: string, isSuspended: boolean) {
  const subject = isSuspended ? "Account Suspension" : "Account Reactivation";

  const message = isSuspended
    ? `Dear Valued User,\n\nWe regret to inform you that your account has been suspended due to a violation of our terms and conditions. If you believe this suspension is an error or you would like to appeal, please contact our support team at supporthellobuddy@gmail.com.\n\nThank you for your understanding.\n\nBest regards,\nThe Support Team`
    : `Dear Valued User,\n\nWe are pleased to inform you that your account has been successfully reactivated. You can now access all the features of your account as usual.\n\nIf you have any questions or require assistance, please do not hesitate to contact us at supporthellobuddy@gmail.com.\n\nBest regards,\nThe Support Team`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject,
      text: message,
    });
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

type InvoiceUser = {
  id: string;
  email: string;
};

type InvoiceWithUser = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  paymentId: string | null;
  subscriptionPeriodStart: Date;
  subscriptionPeriodEnd: Date;
  description: string | null;
  createdAt: Date;
  paidAt: Date | null;
  user: InvoiceUser;
  userId: string;
};

type InvoicesResponse = {
  invoices: InvoiceWithUser[];
  nextCursor?: string;
};

async function sendAccountDeletionEmail(userEmail: string) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Your Account Has Been Deleted",
      text: `Dear user,\n\nYour account has been permanently deleted. If you have any questions, please contact support.\n\nThank you.`,
    });
  } catch (error) {
    console.error("Error sending deletion email:", error);
  }
}

export const appRouter = router({
  authCallback: publicProcedure.query(async () => {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user.id || !user.email) throw new TRPCError({ code: "UNAUTHORIZED" });

    let dbUser = await db.user.findFirst({
      where: { id: user.id },
    });

    // If user does not exist, create them and set admin if email matches
    if (!dbUser) {
      dbUser = await db.user.create({
        data: {
          id: user.id,
          email: user.email,
          isAdmin: user.email === "aryan.gurung683@gmail.com",
          esewaCurrentPeriodEnd: null,
        },
      });
    } else if (user.email === "aryan.gurung683@gmail.com" && !dbUser.isAdmin) {
      // Update the existing user to set `isAdmin` if it wasn't already set
      dbUser = await db.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
    }

    // Always return the correct admin status
    return {
      success: true,
      isAdmin: dbUser.isAdmin,
      isNewUser: !dbUser.hasAcceptedTerms,
    };
  }),

  // Example tRPC router query
  getCurrentUser: privateProcedure.query(({ ctx }) => {
    return db.user.findUnique({
      where: { id: ctx.userId },
    });
  }),

  getUserTermsStatus: privateProcedure.query(async ({ ctx }) => {
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { hasAcceptedTerms: true },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user;
  }),

  getTermsAndConditions: publicProcedure.query(async () => {
    let terms = await db.termsAndConditions.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!terms) {
      await db.termsAndConditions.create({
        data: {
          version: "1.0",
          content: DEFAULT_TERMS,
          isActive: true,
        },
      });
      console.log("Default Terms and Conditions added.");
    }

    return terms;
  }),
  acceptTermsAndConditions: privateProcedure.mutation(async ({ ctx }) => {
    const { userId } = ctx;

    await db.user.update({
      where: { id: userId },
      data: { hasAcceptedTerms: true },
    });

    return { success: true };
  }),

  rejectTermsAndConditions: privateProcedure.mutation(async ({ ctx }) => {
    // const { userId } = ctx;

    // Delete the user's data
    // await db.user.delete({
    //   where: { id: userId },
    // });

    return { success: true };
  }),

  getLatestTermsAndConditions: privateProcedure.query(async ({ ctx }) => {
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
    }

    let latestTerms = await db.termsAndConditions.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!latestTerms) {
      // If no terms exist, create the default terms
      latestTerms = await db.termsAndConditions.create({
        data: {
          content: DEFAULT_TERMS,
          version: "1.0",
          isActive: true,
        },
      });
    }

    if (!latestTerms) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Terms and conditions not found",
      });
    }

    return latestTerms;
  }),

  updateTermsAndConditions: privateProcedure
    .input(
      z.object({
        content: z.string(),
        version: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.user.findUnique({
        where: { id: ctx.userId },
        select: { isAdmin: true },
      });

      if (!user?.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      // Deactivate the current active terms
      await db.termsAndConditions.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      // Create new terms and conditions
      const newTerms = await db.termsAndConditions.create({
        data: {
          content: input.content,
          version: input.version,
          isActive: true,
        },
      });

      // Set hasAcceptedTerms to false for all users
      await db.user.updateMany({
        where: {}, // No condition means it updates all users
        data: { hasAcceptedTerms: false },
      });

      return newTerms;
    }),

  getFileMessages: privateProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.string().nullish(),
        fileId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId } = ctx;
      const { fileId, cursor } = input;
      const limit = input.limit ?? INFINITE_QUERY_LIMIT;

      const file = await db.file.findFirst({
        where: {
          id: fileId,
          userId,
        },
      });

      if (!file) throw new TRPCError({ code: "NOT_FOUND" });

      const messages = await db.message.findMany({
        take: limit + 1,
        where: {
          fileId,
        },
        orderBy: {
          createdAt: "desc",
        },
        cursor: cursor ? { id: cursor } : undefined,
        select: {
          id: true,
          isUserMessage: true,
          createdAt: true,
          text: true,
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages,
        nextCursor,
      };
    }),

  getUserFiles: privateProcedure.query(async ({ ctx }) => {
    const { userId } = ctx;

    return await db.file.findMany({
      where: {
        userId,
      },
    });
  }),
  getFileUploadStatus: privateProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ input, ctx }) => {
      const file = await db.file.findFirst({
        where: {
          id: input.fileId,
          userId: ctx.userId,
        },
      });

      if (!file) return { status: "PENDING" as const };

      return { status: file.uploadStatus };
    }),

  getFile: privateProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      const file = await db.file.findFirst({
        where: {
          key: input.key,
          userId,
        },
      });

      if (!file) throw new TRPCError({ code: "NOT_FOUND" });

      return file;
    }),

  deleteFile: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      const file = await db.file.findFirst({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!file) throw new TRPCError({ code: "NOT_FOUND" });

      await db.file.delete({
        where: {
          id: input.id,
        },
      });

      return file;
    }),

  createStripeSession: privateProcedure.mutation(async ({ ctx }) => {
    const { userId } = ctx;

    const billingUrl = absoluteUrl("/dashboard/billing");

    if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });

    const dbUser = await db.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (!dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

    const subscriptionPlan = await getUserSubscriptionPlan();

    if (subscriptionPlan.isSubscribed && dbUser.stripeCustomerId) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: dbUser.stripeCustomerId,
        return_url: billingUrl,
      });

      return { url: stripeSession.url };
    }

    const stripeSession = await stripe.checkout.sessions.create({
      success_url: billingUrl,
      cancel_url: billingUrl,
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      line_items: [
        {
          price: PLANS.find((plan) => plan.name === "Pro")?.price.priceIds.test,
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId,
      },
    });

    return { url: stripeSession.url };
  }),

  updatePayment: privateProcedure
    .input(
      z.object({
        transactionCode: z.string(), // Only transaction_code is required
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId; // Retrieve the current user ID from the session

      if (!userId) {
        throw new Error("Unauthorized. User not found.");
      }

      console.log("userID", userId);

      try {
        // Calculate subscription period
        const startDate = new Date();
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days validity

        // Update the user payment details
        const updatedUser = await db.user.update({
          where: { id: userId },
          data: {
            esewaPaymentId: input.transactionCode,
            esewaCurrentPeriodEnd: endDate,
            paymentMethod: "eSewa",
          },
        });

        // Create an invoice record
        await db.invoice.create({
          data: {
            amount: 29.99, // Set your standard price here
            currency: "NPR", // Nepalese Rupee for eSewa
            status: "PAID", // eSewa payments are considered paid immediately
            paymentMethod: "eSewa",
            paymentId: input.transactionCode,
            subscriptionPeriodStart: startDate,
            subscriptionPeriodEnd: endDate,
            description: "Monthly Subscription - eSewa Payment",
            userId,
            paidAt: new Date(), // Mark as paid immediately
          },
        });

        return { success: true, user: updatedUser };
      } catch (error) {
        console.error("Error updating payment:", error);
        throw new Error("Failed to update payment.");
      }
    }),
  // In your tRPC router file (app/trpc/index.ts)

  // In your tRPC router file (app/trpc/index.ts)

  // Update the getInvoiceStats procedure
  getInvoiceStats: privateProcedure
    .input(
      z.object({
        // Remove period parameter and only keep date range
        startDate: z.union([z.date(), z.string()]).optional(),
        endDate: z.union([z.date(), z.string()]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get the user ID from the context
      const { userId } = ctx;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to access this resource",
        });
      }

      // Fetch the user from the database to check admin status
      const dbUser = await db.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true },
      });

      // Check if user is admin
      if (!dbUser?.isAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only admins can access invoice statistics",
        });
      }

      // Convert string dates to Date objects if needed
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;

      // Build where clause for queries
      const paidWhereClause: any = {
        status: "PAID",
      };

      const createdWhereClause: any = {};

      // Add date filters if provided
      if (startDate || endDate) {
        if (startDate) {
          paidWhereClause.paidAt = paidWhereClause.paidAt || {};
          paidWhereClause.paidAt.gte = startDate;

          createdWhereClause.createdAt = createdWhereClause.createdAt || {};
          createdWhereClause.createdAt.gte = startDate;
        }

        if (endDate) {
          // Make sure end date is inclusive by setting it to the end of the day
          const inclusiveEnd = new Date(endDate);
          inclusiveEnd.setHours(23, 59, 59, 999);

          paidWhereClause.paidAt = paidWhereClause.paidAt || {};
          paidWhereClause.paidAt.lte = inclusiveEnd;

          createdWhereClause.createdAt = createdWhereClause.createdAt || {};
          createdWhereClause.createdAt.lte = inclusiveEnd;
        }
      }

      // Get total revenue
      const totalRevenue = await db.invoice.aggregate({
        _sum: {
          amount: true,
        },
        where: paidWhereClause,
      });

      // Get count by status
      const statusCounts = await db.invoice.groupBy({
        by: ["status"],
        _count: {
          id: true,
        },
        where: createdWhereClause,
      });

      // Get count by payment method
      const paymentMethodCounts = await db.invoice.groupBy({
        by: ["paymentMethod"],
        _count: {
          id: true,
        },
        _sum: {
          amount: true,
        },
        where: {
          ...paidWhereClause,
          status: "PAID",
        },
      });

      return {
        totalRevenue: totalRevenue._sum.amount || 0,
        statusCounts: statusCounts.reduce((acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        }, {} as Record<string, number>),
        paymentMethodCounts: paymentMethodCounts.reduce((acc, curr) => {
          acc[curr.paymentMethod] = {
            count: curr._count.id,
            amount: curr._sum.amount || 0,
          };
          return acc;
        }, {} as Record<string, { count: number; amount: number }>),
      };
    }),

  // Update the getInvoices procedure
  getInvoices: privateProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
        status: z
          .enum(["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELED"])
          .optional(),
        userId: z.string().optional(),
        // Remove period parameter and only keep date range
        startDate: z.union([z.date(), z.string()]).optional(),
        endDate: z.union([z.date(), z.string()]).optional(),
      })
    )
    .query(async ({ ctx, input }): Promise<InvoicesResponse> => {
      // Get the user ID from the context
      const { userId } = ctx;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to access this resource",
        });
      }

      // Fetch the user from the database to check admin status
      const dbUser = await db.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true },
      });

      // Check if user is admin
      if (!dbUser?.isAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only admins can access invoice data",
        });
      }

      const { limit, cursor, status, userId: queryUserId } = input;

      // Convert string dates to Date objects if needed
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;

      // Build where clause based on filters
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (queryUserId) {
        where.userId = queryUserId;
      }

      // Add date range filter only if dates are provided
      if (startDate || endDate) {
        where.createdAt = {};

        if (startDate) {
          where.createdAt.gte = startDate;
        }

        if (endDate) {
          // Make end date inclusive by setting it to the end of the day
          const inclusiveEndDate = new Date(endDate);
          inclusiveEndDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = inclusiveEndDate;
        }
      }

      // Get invoices with pagination
      const invoices = await db.invoice.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      let nextCursor: typeof cursor = undefined;
      if (invoices.length > limit) {
        const nextItem = invoices.pop();
        nextCursor = nextItem!.id;
      }

      // Use type assertion to avoid deep type instantiation
      return {
        invoices: invoices as InvoiceWithUser[],
        nextCursor,
      };
    }),

  // Create a new invoice (for testing or manual creation)
  createInvoice: privateProcedure
    .input(
      z.object({
        userId: z.string(),
        amount: z.number().positive(),
        currency: z.string().default("USD"),
        paymentMethod: z.string(),
        paymentId: z.string().optional(),
        subscriptionPeriodStart: z.date(),
        subscriptionPeriodEnd: z.date(),
        description: z.string().optional(),
        status: z
          .enum(["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELED"])
          .default("PENDING"),
        paidAt: z.date().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the user ID from the context
      const { userId } = ctx;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to access this resource",
        });
      }

      // Fetch the user from the database to check admin status
      const dbUser = await db.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true },
      });

      // Check if user is admin
      if (!dbUser?.isAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only admins can create invoices",
        });
      }

      // Create the invoice
      const invoice = await db.invoice.create({
        data: input,
      });

      return invoice;
    }),

  getCounts: publicProcedure.query(async () => {
    const totalUsers = await db.user.count({
      where: {
        isAdmin: false,
      },
    });
    console.log("heelo", totalUsers);
    const activeUsers = await db.user.count({
      where: { isSuspend: false, isAdmin: false },
    });

    const suspendedUsers = await db.user.count({
      where: { isSuspend: true, isAdmin: false },
    });

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
    };
  }),

  getAllUsers: privateProcedure.query(async ({ ctx }) => {
    // Fetch all non-admin users from Prisma (your database)
    const users = await db.user.findMany({
      where: { isAdmin: false },
    });

    // Fetch user details from Kinde for each user
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        // Fetch user data from Kinde by email
        const kindeUser = await fetchUserFromKindeByEmail(user.id);

        // If we successfully fetch user details, return the user with the name
        return {
          ...user,
          name: kindeUser
            ? `${kindeUser.first_name} ${kindeUser.last_name}`
            : "No Name", // Handle cases where no user info is found
        };
      })
    );

    return usersWithDetails;
  }),

  editUser: privateProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const accessToken = await fetchAccessToken();

      if (!accessToken) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch Kinde access token",
        });
      }

      const { id, name } = input;

      // Update in Kinde
      const response = await fetch(
        `https://hellobu.kinde.com/api/v1/user?id=${id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            given_name: name.split(" ")[0],
            family_name: name.split(" ").slice(1).join(" "),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update user in Kinde: ${error}`,
        });
      }
      return { id, name };
    }),

  suspendUser: privateProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // User ID
      const { id } = input;
      const user = await db.user.findUnique({
        where: { id: id },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const accessToken = await fetchAccessToken();

      if (!accessToken) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch Kinde access token",
        });
      }

      // Update in Kinde
      const response = await fetch(
        `https://hellobu.kinde.com/api/v1/user?id=${id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_suspended: true,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update user in Kinde: ${error}`,
        });
      }

      // Suspend the user in Prisma database
      const updatedUser = await db.user.update({
        where: { id: id },
        data: { isSuspend: true },
      });

      await sendEmail(updatedUser.email, true);

      return updatedUser;
    }),

  unSuspendUser: privateProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // User ID
      const { id } = input;
      const user = await db.user.findUnique({
        where: { id: id },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const accessToken = await fetchAccessToken();

      if (!accessToken) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch Kinde access token",
        });
      }

      // Update in Kinde
      const response = await fetch(
        `https://hellobu.kinde.com/api/v1/user?id=${id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_suspended: false,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update user in Kinde: ${error}`,
        });
      }

      // Suspend the user in Prisma database
      const updatedUser = await db.user.update({
        where: { id: id },
        data: { isSuspend: false },
      });

      await sendEmail(updatedUser.email, false);

      return updatedUser;
    }),

  deleteUser: privateProcedure
    .input(
      z.object({
        id: z.string(), // The ID of the user to delete
      })
    )
    .mutation(async ({ input }) => {
      const { id } = input;

      // Fetch user from Prisma to validate existence
      const user = await db.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Fetch Kinde Access Token
      const accessToken = await fetchAccessToken();

      if (!accessToken) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch Kinde access token",
        });
      }

      // Delete the user from Kinde
      const kindeResponse = await fetch(
        `https://hellobu.kinde.com/api/v1/user?id=${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!kindeResponse.ok) {
        const errorText = await kindeResponse.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete user in Kinde: ${errorText}`,
        });
      }

      // Delete the user from Prisma
      await db.user.delete({
        where: { id },
      });

      await sendAccountDeletionEmail(user.email);

      return { success: true, message: "User deleted successfully" };
    }),

  getUserGrowth: publicProcedure.query(async () => {
    // Define the date range (e.g., past 6 months)
    const now = new Date();
    const start = subMonths(now, 5); // Go back 5 months
    const end = endOfMonth(now);

    // Query grouped user data from Prisma
    const data = await db.user.groupBy({
      by: ["createdAt"],
      _count: {
        id: true,
      },
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    // Process data into month-wise buckets
    const months = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const count = data
        .filter(
          (entry) =>
            entry.createdAt >= monthStart && entry.createdAt <= monthEnd
        )
        .reduce((sum, entry) => sum + entry._count.id, 0);

      months.unshift({
        month: monthStart.toLocaleString("default", { month: "short" }),
        users: count,
      });
    }

    return months;
  }),

  grantReward: privateProcedure
    .input(
      z.object({
        userId: z.string(),
        title: z.string(),
        description: z.string(),
        // Accept string here and parse to Date
        endDate: z.string().transform((str) => new Date(str)),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, title, description, endDate } = input;

      // Verify the user exists
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          esewaCurrentPeriodEnd: endDate,
          paymentMethod: "eSewa", // Set to Stripe for reward subscriptions
        },
      });

      // Send email notification
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: title,
          html: `
           ${description}
          `,
        });
      } catch (error) {
        console.error("Failed to send revocation email:", error);
      }

      return updatedUser;
    }),

  revokeReward: privateProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;

      // Verify the user exists
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Remove subscription details
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          esewaCurrentPeriodEnd: null,
        },
      });

      // Send email notification
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,

          subject: "Subscription Revoked",
          html: `
            <h1>Subscription Update</h1>
            <p>Your reward subscription has been revoked.</p>
            <p>If you have any questions, please contact support.</p>
          `,
        });
      } catch (error) {
        console.error("Failed to send revocation email:", error);
      }

      return updatedUser;
    }),

  // getPaginatedUsers: publicProcedure
  //   .input(
  //     z.object({
  //       page: z.number().int().positive(),
  //       limit: z.number().int().positive(),
  //       searchTerm: z.string().optional(),
  //     })
  //   )
  //   .query(async ({ input }) => {
  //     const { page, limit, searchTerm } = input;
  //     const skip = (page - 1) * limit;

  //     let where: Prisma.UserWhereInput = {
  //       isAdmin: false, // Exclude admin users
  //     };

  //     // if (searchTerm) {
  //     //   where = {
  //     //     ...where,
  //     //     OR: [
  //     //       { email: { contains: searchTerm, mode: "insensitive" } },
  //     //       {
  //     //         isSuspend:
  //     //           searchTerm.toLowerCase() === "suspended"
  //     //             ? true
  //     //             : searchTerm.toLowerCase() === "active"
  //     //             ? false
  //     //             : undefined,
  //     //       },
  //     //     ],
  //     //   };
  //     // }

  //     const allUsers = await db.user.findMany({
  //       where,
  //       orderBy: { createdAt: "desc" },
  //       skip,
  //       take: limit,
  //       select: {
  //         id: true,
  //         email: true,
  //         stripeCustomerId: true,
  //         stripeSubscriptionId: true,
  //         stripePriceId: true,
  //         stripeCurrentPeriodEnd: true,
  //         isSuspend: true,
  //       },
  //     });

  //     const usersWithDetails = await Promise.all(
  //       allUsers.map(async (user) => {
  //         const kindeUser = await fetchUserFromKindeByEmail(user.id);
  //         const fullName = kindeUser
  //           ? `${kindeUser.first_name} ${kindeUser.last_name}`
  //           : "No Name";

  //         return {
  //           ...user,
  //           name: fullName,
  //         };
  //       })
  //     );

  //     let filteredUsers = usersWithDetails;

  //     if (searchTerm) {
  //       const lowerSearchTerm = searchTerm.toLowerCase();
  //       filteredUsers = usersWithDetails.filter(
  //         (user) =>
  //           user.name.toLowerCase().includes(lowerSearchTerm) ||
  //           user.email.toLowerCase().includes(lowerSearchTerm) ||
  //           (user.isSuspend ? "suspended" : "active").includes(lowerSearchTerm)
  //       );
  //     }

  //     const paginatedUsers = filteredUsers.slice(skip, skip + limit);

  //     return {
  //       users: paginatedUsers,
  //       total: filteredUsers.length,
  //     };
  //   }),
  getPaginatedUsers: publicProcedure
    .input(
      z.object({
        page: z.number().int().positive(),
        limit: z.number().int().positive(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, searchTerm } = input;
      const skip = (page - 1) * limit;

      let where: Prisma.UserWhereInput = {
        isAdmin: false, // Exclude admin users
      };

      // Fetch all non-admin users
      const allUsers = await db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          stripePriceId: true,
          stripeCurrentPeriodEnd: true,
          isSuspend: true,
          esewaCurrentPeriodEnd: true,
        },
      });

      // Fetch Kinde details for all users
      const usersWithDetails = await Promise.all(
        allUsers.map(async (user) => {
          const kindeUser = await fetchUserFromKindeByEmail(user.id);
          const fullName = kindeUser
            ? `${kindeUser.first_name} ${kindeUser.last_name}`
            : "No Name";

          return {
            ...user,
            name: fullName,
          };
        })
      );

      // Apply search filter
      let filteredUsers = usersWithDetails;
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        filteredUsers = usersWithDetails.filter(
          (user) =>
            user.name.toLowerCase().includes(lowerSearchTerm) ||
            user.email.toLowerCase().includes(lowerSearchTerm) ||
            (user.isSuspend ? "suspended" : "active").includes(lowerSearchTerm)
        );
      }

      // Apply pagination to filtered results
      const paginatedUsers = filteredUsers.slice(skip, skip + limit);

      return {
        users: paginatedUsers,
        total: filteredUsers.length,
      };
    }),

  getUserPDFs: privateProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const files = await db.file.findMany({
        where: {
          userId: input.userId,
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          url: true,
        },
      });
      return files;
    }),

  deletePDF: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const file = await db.file.delete({
        where: {
          id: input.id,
        },
      });
      return file;
    }),
});

export type AppRouter = typeof appRouter;
