"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/app/_trpc/client";
import Skeleton from "react-loading-skeleton";
import type { DateRange } from "react-day-picker";

interface RevenuePieChartProps {
  dateRange?: DateRange;
}

export default function RevenuePieChart({ dateRange }: RevenuePieChartProps) {
  // Fetch invoice statistics with date range
  const { data, isLoading } = trpc.getInvoiceStats.useQuery({
    startDate: dateRange?.from,
    endDate: dateRange?.to,
  });

  // Colors for the pie chart
  const COLORS = ["#2563eb", "#10b981"];

  // Format currency based on payment method
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(currency === "NPR" ? "ne-NP" : "en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  // Prepare data for the pie chart
  const prepareChartData = () => {
    if (!data?.paymentMethodCounts) return [];

    const chartData = [];

    // Add Stripe data (USD)
    if (data.paymentMethodCounts.Stripe) {
      chartData.push({
        name: "Stripe (USD)",
        value: data.paymentMethodCounts.Stripe.amount,
        currency: "USD",
        count: data.paymentMethodCounts.Stripe.count,
      });
    }

    // Add eSewa data (NPR)
    if (data.paymentMethodCounts.eSewa) {
      chartData.push({
        name: "eSewa (NPR)",
        value: data.paymentMethodCounts.eSewa.amount,
        currency: "NPR",
        count: data.paymentMethodCounts.eSewa.count,
      });
    }

    return chartData;
  };

  const chartData = prepareChartData();

  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border rounded shadow">
          <p className="font-semibold">{data.name}</p>
          <p>{formatCurrency(data.value, data.currency)}</p>
          <p className="text-sm text-muted-foreground">
            {data.count} transactions
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton height={300} />
        ) : chartData.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">No revenue data available</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4">
          {chartData.map((item, index) => (
            <div key={index} className="flex flex-col">
              <div className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="font-medium">{item.name}</span>
              </div>
              <span className="text-xl font-bold">
                {formatCurrency(item.value, item.currency)}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.count} transactions
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
