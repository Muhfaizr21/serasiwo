export function PartnerVenueBand() {
  const PARTNER_VENUES = [
    { name: 'The Dharmawangsa', city: 'Jakarta Selatan', type: 'Luxury Heritage Hotel' },
    { name: 'Plataran Venues', city: 'Jakarta & Bali', type: 'Private Dining & Estate' },
    { name: 'AYANA Resort', city: 'Jimbaran & Komodo', type: 'Oceanfront Ballroom' },
    { name: 'Sampoerna Strategic', city: 'Sudirman Jakarta', type: 'Glasshouse & Atrium' },
    { name: 'The Ritz-Carlton', city: 'Mega Kuningan', type: 'Grand Ballroom' },
    { name: 'Grand Hyatt', city: 'Thamrin Jakarta', type: 'City Center Ballroom' },
  ]

  return (
    <section className="partner-band-section fog-band" aria-labelledby="partner-band-title">
      <div className="container">
        <div className="section-header-centered">
          <span className="feature-card-eyebrow">
            Mitra Venue &amp; Lokasi Resepsi
          </span>
          <h2 id="partner-band-title" className="section-heading">
            Terpercaya di Berbagai Ballroom dan Venue Terkemuka
          </h2>
          <p className="section-subcopy-centered">
            Tim operasional SerasiWO berpengalaman mengawal alur loading, protokol gedung, dan koordinasi jamuan di puluhan hotel serta ballroom terkemuka.
          </p>
        </div>

        <div className="partner-logo-grid" role="list" aria-label="Daftar mitra venue pernikahan">
          {PARTNER_VENUES.map((venue) => (
            <div key={venue.name} className="partner-logo-item" role="listitem">
              <span className="partner-venue-name">{venue.name}</span>
              <span className="partner-venue-meta">{venue.city} · {venue.type}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
