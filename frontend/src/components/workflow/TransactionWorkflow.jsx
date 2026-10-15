import { jsx, jsxs } from "react/jsx-runtime";
import { useDemo } from "@/context/DemoContext";
import { SHOW_TRANSACTION_WORKFLOW } from "@/config/featureFlags";
import { getStatusDisplay } from "@/lib/status";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
function TransactionWorkflow({ quotationId }) {
  const { state } = useDemo();
  if (!SHOW_TRANSACTION_WORKFLOW) return null;
  const qtn = quotationId ? state.quotations.find((q) => q.id === quotationId) : state.quotations.find((q) => q.id === "QTN-00001");
  if (!qtn) return null;
  const po = state.purchaseOrders.find((p) => p.referenceQuotationId === qtn.id);
  const rec = po ? state.receivings.find((r) => r.purchaseOrderId === po.id) : void 0;
  const dr = state.deliveryReceipts.find((d) => d.customerId === qtn.customerId);
  const bill = dr ? state.billingStatements.find((b) => b.referenceDrId === dr.id) : void 0;
  const steps = [
    {
      label: "Quotation",
      id: qtn.id,
      statusLabel: getStatusDisplay(qtn.status).label,
      done: qtn.status === "approved",
      current: qtn.status === "approved" && !po
    },
    {
      label: "Purchase Order",
      id: po?.id,
      statusLabel: po ? getStatusDisplay(po.status).label : "Pending",
      done: !!po,
      current: !!po && !rec
    },
    {
      label: "Receiving",
      id: rec?.id,
      statusLabel: rec ? getStatusDisplay(rec.status).label : "Pending",
      done: rec?.status === "completed",
      current: !!rec && rec.status !== "completed"
    },
    {
      label: "Delivery Receipt",
      id: dr?.id,
      statusLabel: dr ? getStatusDisplay(dr.status).label : "Pending",
      done: dr?.status === "delivered",
      current: !!dr && dr.status !== "delivered"
    },
    {
      label: "Billing",
      id: bill?.id,
      statusLabel: bill ? getStatusDisplay(bill.paymentStatus).label : "Pending",
      done: bill?.paymentStatus === "paid",
      current: !!bill && bill.paymentStatus !== "paid"
    }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border bg-surface p-4", children: [
    /* @__PURE__ */ jsx("h3", { className: "mb-4 text-sm font-semibold text-text-primary", children: "TRANSACTION WORKFLOW" }),
    /* @__PURE__ */ jsx("p", { className: "mb-4 text-xs text-text-secondary", children: "Quotation (customer) \u2192 PO (supplier) \u2192 Receiving \u2192 Delivery \u2192 Billing" }),
    /* @__PURE__ */ jsx("div", { className: "space-y-4", children: steps.map((step, i) => /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center", children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: cn(
              "flex h-6 w-6 items-center justify-center rounded-full",
              step.done && "bg-[#DCFCE7] text-[#15803D]",
              step.current && !step.done && "bg-maroon text-white",
              !step.done && !step.current && "border-2 border-border bg-surface"
            ),
            children: step.done ? /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5" }) : step.current ? /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-white" }) : null
          }
        ),
        i < steps.length - 1 && /* @__PURE__ */ jsx("div", { className: cn("my-1 h-6 w-0.5", step.done ? "bg-[#15803D]" : "bg-border") })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "pb-2", children: [
        /* @__PURE__ */ jsx("p", { className: cn("text-sm font-medium", step.current && "text-maroon"), children: step.label }),
        step.id && /* @__PURE__ */ jsxs("p", { className: "text-xs text-text-secondary", children: [
          step.id,
          step.statusLabel && ` \u2014 ${step.statusLabel}`
        ] })
      ] })
    ] }, step.label)) })
  ] });
}
export {
  TransactionWorkflow
};
