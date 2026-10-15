import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
function MobileCardList({
  items,
  emptyMessage = "No records found.",
  className,
  variant = "default"
}) {
  if (!items?.length) {
    return /* @__PURE__ */ jsx("div", { className: cn("rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-secondary md:hidden", className), children: emptyMessage });
  }
  return /* @__PURE__ */ jsx("div", { className: cn("space-y-3 md:hidden", className), children: items.map((item) => /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      onClick: item.onClick,
      className: cn(
        "w-full rounded-xl border border-border bg-surface p-4 text-left transition-colors",
        item.onClick && "active:bg-maroon-light"
      ),
      children: variant === "transaction" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsx("p", { className: "font-semibold text-maroon", children: item.title }),
          item.badge && /* @__PURE__ */ jsx(Badge, { variant: item.badge.variant, className: "max-w-[45%] truncate", children: item.badge.label })
        ] }),
        item.subtitle && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-text-secondary", children: item.subtitle }),
        (item.meta || item.amount) && /* @__PURE__ */ jsxs("div", { className: "mt-2 flex items-end justify-between gap-3", children: [
          item.meta && /* @__PURE__ */ jsx("p", { className: "text-xs text-text-secondary", children: item.meta }),
          item.amount && /* @__PURE__ */ jsx("p", { className: "shrink-0 text-sm font-semibold text-text-primary", children: item.amount })
        ] })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
              /* @__PURE__ */ jsx("p", { className: "font-semibold text-maroon", children: item.title }),
              item.badge && /* @__PURE__ */ jsx(Badge, { variant: item.badge.variant, children: item.badge.label })
            ] }),
            item.subtitle && /* @__PURE__ */ jsx("p", { className: "mt-1 truncate text-sm text-text-secondary", children: item.subtitle })
          ] }),
          item.onClick && /* @__PURE__ */ jsx(ChevronRight, { className: "mt-0.5 h-5 w-5 shrink-0 text-text-secondary" })
        ] }),
        item.fields && item.fields.length > 0 && /* @__PURE__ */ jsx("dl", { className: "mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3", children: item.fields.map((field) => /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { className: "text-[11px] font-medium uppercase tracking-wide text-text-secondary", children: field.label }),
          /* @__PURE__ */ jsx("dd", { className: "mt-0.5 text-sm text-text-primary", children: field.value })
        ] }, field.label)) })
      ] })
    },
    item.id
  )) });
}
export {
  MobileCardList
};
