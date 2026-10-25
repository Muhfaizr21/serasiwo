import { useState } from 'react'
import '../styles/landing.css'
import { AuditLogModal } from '../components/AuditLogModal'
import { Footer } from '../components/Footer'
import { HeroSection } from '../components/HeroSection'
import { Navbar } from '../components/Navbar'
import { PartnerVenueBand } from '../components/PartnerVenueBand'
import { RoleMatrixSection } from '../components/RoleMatrixSection'
import { WorkflowChainSection } from '../components/WorkflowChainSection'
import { WorkspaceSimulatorSection } from '../components/WorkspaceSimulatorSection'

export function LandingPage({ theme, onToggleTheme }) {
  const [activeGuide, setActiveGuide] = useState(null)

  return (
    <div className="landing-page-shell">
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>

      <Navbar theme={theme} onToggleTheme={onToggleTheme} />

      <main id="main-content">
        <HeroSection />

        <PartnerVenueBand />

        <RoleMatrixSection />

        <WorkflowChainSection />

        <WorkspaceSimulatorSection
          onOpenGuide={(guide) => setActiveGuide(guide)}
        />
      </main>

      <Footer onOpenGuide={(guide) => setActiveGuide(guide)} />

      <AuditLogModal
        guide={activeGuide}
        onClose={() => setActiveGuide(null)}
      />
    </div>
  )
}
