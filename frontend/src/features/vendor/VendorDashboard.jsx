import { VendorProvider } from './context/VendorContext'
import { useVendor } from './context/useVendor'
import './styles/vendor.css'
import { VendorSidebar } from './components/VendorSidebar'
import { VendorHeader } from './components/VendorHeader'
import { VendorOverviewTab } from './components/VendorOverviewTab'
import { VendorCalendarTab } from './components/VendorCalendarTab'
import { VendorJobsTab } from './components/VendorJobsTab'
import { VendorReadinessTab } from './components/VendorReadinessTab'
import { VendorPayoutTab } from './components/VendorPayoutTab'
import {
  KitchenLoadingPage,
  MenuManifestPage,
  FieldPicPage,
  SopStandardsPage,
  VendorProfilePage,
  BankAccountPage,
} from './components/VendorOperationalPages'
import { VendorModals } from './components/VendorModals'

const TAB_COMPONENTS = {
  overview: VendorOverviewTab,
  calendar: VendorCalendarTab,
  jobs: VendorJobsTab,
  readiness: VendorReadinessTab,
  payout: VendorPayoutTab,
  loading_schedule: KitchenLoadingPage,
  menu_manifest: MenuManifestPage,
  field_pic: FieldPicPage,
  sop: SopStandardsPage,
  profile: VendorProfilePage,
  bank_account: BankAccountPage,
}

function VendorDashboardInner({ theme, onToggleTheme }) {
  const { activeTab, activeModal, modalPayload, loading, toast } = useVendor()
  const ActiveTabView = TAB_COMPONENTS[activeTab] || VendorOverviewTab

  return (
    <div className="vendor-dashboard-app">
      {toast && (
        <div
          className={`vendor-toast-floating vendor-toast-${toast.type}`}
          role="status"
          aria-live="polite"
        >
          <div className="vendor-toast-icon">
            {toast.type === 'success' ? '✓' : '!'}
          </div>
          <span className="vendor-toast-message">{toast.message}</span>
        </div>
      )}

      <VendorSidebar />

      <div className="vendor-main-stage">
        <VendorHeader theme={theme} onToggleTheme={onToggleTheme} />

        <main className="vendor-content-container">
          {loading ? (
            <div className="vendor-loading-state">
              <div className="vendor-loading-spinner" />
              <p>Memuat data portal mitra SerasiWO...</p>
            </div>
          ) : (
            <ActiveTabView />
          )}
        </main>
      </div>

      {activeModal && (
        <VendorModals key={`${activeModal}-${modalPayload?.date || modalPayload?.job?.id || 'default'}`} />
      )}
    </div>
  )
}

export function VendorDashboard({ theme, onToggleTheme }) {
  return (
    <VendorProvider>
      <VendorDashboardInner theme={theme} onToggleTheme={onToggleTheme} />
    </VendorProvider>
  )
}
