import {
  Archive,
  BarChart3,
  Box,
  Building2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Home,
  Layers,
  Package,
  Receipt,
  Ruler,
  ShoppingCart,
  Tag,
  Ticket,
  Truck,
  User,
  Users,
  Warehouse
} from "lucide-react";
const navigation = [
  {
    items: [{ label: "Dashboard", path: "/", icon: Home }]
  },
  {
    heading: "TRANSACTIONS",
    items: [
      { label: "Quotations", path: "/quotations", icon: FileText },
      { label: "Purchase Orders", path: "/purchase-order", icon: ShoppingCart },
      { label: "Receiving", path: "/inventory/receiving", icon: ClipboardList },
      { label: "Outslip", path: "/outslip", icon: Package },
      { label: "Gate Passes", path: "/gate-pass", icon: Ticket },
      { label: "Delivery Receipts", path: "/delivery-receipt", icon: Truck },
      { label: "Billing", path: "/billing", icon: Receipt },
      { label: "Statement of Account", path: "/soa", icon: FileSpreadsheet },
      { label: "Accomplishments", path: "/reports/accomplishment", icon: BarChart3 }
    ]
  },
  {
    heading: "SETUP",
    items: [
      { label: "Company", path: "/setup/company-setup", icon: Building2 },
      { label: "Branch", path: "/setup/branch-setup", icon: Building2 },
      { label: "User", path: "/setup/user-setup", icon: User },
      { label: "Position", path: "/setup/position-setup", icon: Users },
      { label: "Project", path: "/setup/project-setup", icon: FolderKanban },
      { label: "Category", path: "/setup/category", icon: Layers },
      { label: "Brand", path: "/setup/brand", icon: Tag },
      { label: "Model", path: "/setup/model", icon: Box },
      { label: "Unit of Measure", path: "/setup/unit-measure", icon: Ruler },
      { label: "Items", path: "/setup/item", icon: Archive },
      { label: "Item barcodes", path: "/setup/item/barcodes", icon: Archive },
      { label: "Suppliers", path: "/setup/supplier", icon: Warehouse },
      { label: "Customers", path: "/setup/customer", icon: Users }
    ]
  },
  {
    heading: "REPORTS",
    items: [
      { label: "Inventory", path: "/reports/inventory", icon: Package },
      { label: "Customer Ledger", path: "/reports/customer-ledger", icon: Users },
      { label: "Supplier Ledger", path: "/reports/supplier-ledger", icon: Warehouse }
    ]
  }
];
export {
  navigation
};
