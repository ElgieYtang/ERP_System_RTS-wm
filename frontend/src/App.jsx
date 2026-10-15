import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErpProvider } from '@/data/erpStore'
import { AccomplishmentReportsPage } from '@/pages/AccomplishmentReports'
import { BillingPage } from '@/pages/Billing'
import { DashboardPage } from '@/pages/Dashboard'
import { DeliveryReceiptsPage } from '@/pages/DeliveryReceipts'
import { DeliveryReceiptDetailPage } from '@/pages/details/DeliveryReceiptDetailPage'
import { OutslipDetailPage } from '@/pages/details/OutslipDetailPage'
import { PurchaseOrderDetailPage } from '@/pages/details/PurchaseOrderDetailPage'
import { QuotationDetailPage } from '@/pages/details/QuotationDetailPage'
import { DocumentPreviewPage } from '@/pages/DocumentPreview'
import { GatePassesPage } from '@/pages/GatePasses'
import { InventoryOverviewPage } from '@/pages/InventoryOverview'
import { InventoryReportsPage } from '@/pages/InventoryReports'
import { LoginPage } from '@/pages/Login'
import { OutslipsPage } from '@/pages/Outslips'
import { PurchaseOrdersPage } from '@/pages/PurchaseOrders'
import { QuotationsPage } from '@/pages/Quotations'
import { ReceivingPage } from '@/pages/Receiving'
import { ReportsPage } from '@/pages/Reports'
import { SettingsPage } from '@/pages/Settings'
import { ProfilePage } from '@/pages/Profile'
import { SOAPage } from '@/pages/SOA'
import { CustomerLedgerPage } from '@/pages/reports/CustomerLedgerPage'
import { SupplierLedgerPage } from '@/pages/reports/SupplierLedgerPage'
import { AccomplishmentPreviewPage } from '@/pages/previews/AccomplishmentPreview'
import { DeliveryReceiptPreviewPage } from '@/pages/previews/DeliveryReceiptPreview'
import { GatePassPreviewPage } from '@/pages/previews/GatePassPreview'
import { PurchaseOrderPreviewPage } from '@/pages/previews/PurchaseOrderPreview'
import { QuotationPreviewPage } from '@/pages/previews/QuotationPreview'
import { SOAPreviewPage } from '@/pages/previews/SOAPreview'
import {
  BranchSetupPage,
  BrandSetupPage,
  CategorySetupPage,
  CompanySetupPage,
  CustomerSetupPage,
  ItemSetupPage,
  ModelSetupPage,
  PositionSetupPage,
  ProjectSetupPage,
  SupplierSetupPage,
  UnitMeasureSetupPage,
  UserSetupPage,
} from '@/pages/setup/SetupPages'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

function App() {
  return (
    <ErpProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="quotations" element={<QuotationsPage />} />
              <Route path="quotations/create" element={<QuotationsPage />} />
              <Route path="quotations/:id" element={<QuotationDetailPage />} />
              <Route path="quotations/:id/preview" element={<QuotationPreviewPage />} />
              <Route path="purchase-order" element={<PurchaseOrdersPage />} />
              <Route path="purchase-order/:id" element={<PurchaseOrderDetailPage />} />
              <Route path="purchase-order/:id/preview" element={<PurchaseOrderPreviewPage />} />
              <Route path="outslip" element={<OutslipsPage />} />
              <Route path="outslip/:id" element={<OutslipDetailPage />} />
              <Route path="outslip/:id/gate-pass/preview" element={<GatePassPreviewPage />} />
              <Route path="gate-pass" element={<GatePassesPage />} />
              <Route path="gate-passes" element={<Navigate to="/gate-pass" replace />} />
              <Route path="delivery-receipt" element={<DeliveryReceiptsPage />} />
              <Route path="delivery-receipt/:id" element={<DeliveryReceiptDetailPage />} />
              <Route path="delivery-receipt/:id/preview" element={<DeliveryReceiptPreviewPage />} />
              <Route path="setup/user-type" element={<Navigate to="/setup/user-setup" replace />} />
              <Route path="setup/user-setup" element={<UserSetupPage />} />
              <Route path="setup/company-setup" element={<CompanySetupPage />} />
              <Route path="setup/branch-setup" element={<BranchSetupPage />} />
              <Route path="setup/project-setup" element={<ProjectSetupPage />} />
              <Route path="setup/position-setup" element={<PositionSetupPage />} />
              <Route path="setup/category" element={<CategorySetupPage />} />
              <Route path="setup/brand" element={<BrandSetupPage />} />
              <Route path="setup/model" element={<ModelSetupPage />} />
              <Route path="setup/unit-measure" element={<UnitMeasureSetupPage />} />
              <Route path="setup/item" element={<ItemSetupPage />} />
              <Route path="setup/supplier" element={<SupplierSetupPage />} />
              <Route path="setup/customer" element={<CustomerSetupPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="document-preview" element={<DocumentPreviewPage />} />
              <Route path="reports/accomplishment" element={<AccomplishmentReportsPage />} />
              <Route path="reports/accomplishment/:id/preview" element={<AccomplishmentPreviewPage />} />
              <Route
                path="reports/accomplishment/preview"
                element={<Navigate to="/reports/accomplishment" replace />}
              />
              <Route path="reports/inventory" element={<InventoryReportsPage />} />
              <Route path="reports/customer-ledger" element={<CustomerLedgerPage />} />
              <Route
                path="reports/customer-ledger/soa/preview"
                element={<Navigate to="/soa/preview" replace />}
              />
              <Route path="reports/supplier-ledger" element={<SupplierLedgerPage />} />
              <Route path="inventory/reports" element={<ReportsPage />} />
              <Route path="purchase-orders" element={<Navigate to="/purchase-order" replace />} />
              <Route path="purchase-orders/:id/preview" element={<Navigate to="/purchase-order" replace />} />
              <Route path="outslips" element={<Navigate to="/outslip" replace />} />
              <Route path="delivery-receipts" element={<Navigate to="/delivery-receipt" replace />} />
              <Route path="delivery-receipts/:id/preview" element={<Navigate to="/delivery-receipt" replace />} />
              <Route path="accomplishments" element={<Navigate to="/reports/accomplishment" replace />} />
              <Route path="inventory/outslips" element={<Navigate to="/outslip" replace />} />
              <Route path="inventory" element={<InventoryOverviewPage />} />
              <Route path="receiving" element={<Navigate to="/inventory/receiving" replace />} />
              <Route path="inventory/receiving" element={<ReceivingPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="soa" element={<SOAPage />} />
              <Route path="soa/preview" element={<SOAPreviewPage />} />
              <Route path="customers" element={<Navigate to="/setup/customer" replace />} />
              <Route path="suppliers" element={<Navigate to="/setup/supplier" replace />} />
              <Route path="products" element={<Navigate to="/setup/item" replace />} />
              <Route path="setup/users" element={<Navigate to="/setup/user-setup" replace />} />
              <Route path="setup/user-types" element={<Navigate to="/setup/user-setup" replace />} />
              <Route path="setup/company" element={<Navigate to="/setup/company-setup" replace />} />
              <Route path="setup/branch" element={<Navigate to="/setup/branch-setup" replace />} />
              <Route path="setup/project" element={<Navigate to="/setup/project-setup" replace />} />
              <Route path="setup/position" element={<Navigate to="/setup/position-setup" replace />} />
              <Route path="setup/uom" element={<Navigate to="/setup/unit-measure" replace />} />
              <Route path="setup/items" element={<Navigate to="/setup/item" replace />} />
              <Route path="setup/suppliers" element={<Navigate to="/setup/supplier" replace />} />
              <Route path="setup/customers" element={<Navigate to="/setup/customer" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ErpProvider>
  )
}

export default App
