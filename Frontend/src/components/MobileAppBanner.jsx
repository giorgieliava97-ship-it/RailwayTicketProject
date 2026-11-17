import './MobileAppBanner.css';
import mobileAppImg from '../assets/mobileApp.png'; // 🟢 გასწორებულია .png-ზე

export default function MobileAppBanner() {
  return (
    <section className="mobile-app-banner-section">
      <div className="mobile-app-banner-card">
        <div className="mobile-app-banner-content">
          <h2 className="mobile-app-banner-title">გადმოიწერე აპლიკაცია</h2>
          
          <div className="mobile-app-buttons">
            {/* 1. App Store შავი ღილაკი */}
            <a 
              href="https://apps.apple.com/ge/app/georgian-railway/id6746049057" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: '#000', 
                color: '#fff', 
                borderRadius: '8px', 
                padding: '8px 14px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                textDecoration: 'none'
              }}>
                {/* Apple Icon */}
                <svg width="22" height="22" viewBox="0 0 170 170" fill="white">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.05-2.47-6.87-7.05-11.45-13.74-7.27-10.6-12.91-22.19-16.92-34.78-4.01-12.59-6.02-24.36-6.02-35.31 0-16.14 4.09-29.21 12.27-39.22 8.18-10.01 18.39-15.11 30.64-15.3 5.35 0 11.09 1.37 17.22 4.12 6.13 2.74 10.15 4.12 12.06 4.12 1.57 0 5.66-1.46 12.27-4.39 6.62-2.93 12.35-4.23 17.22-3.9 14.15 1.05 25.04 6.75 32.68 17.11-12.06 7.35-18.02 17.84-17.89 31.47.13 11.22 4.29 20.44 12.48 27.65 4.09 3.69 8.95 6.35 14.59 7.98-2.61 7.62-5.74 15.15-9.39 22.58zM119.22 31.9c0-7.85 2.81-15.15 8.44-21.9 5.63-6.75 12.78-10.39 21.45-10 .13 1.05.2 2.1.2 3.15 0 7.72-2.84 14.95-8.52 21.69-5.69 6.75-12.87 10.36-21.54 9.84-.03-1-.03-1.87-.03-2.78z"/>
                </svg>
                <div style={{ textAlign: 'left', lineHeight: '1.1', textDecoration: 'none' }}>
                  <div style={{ fontSize: '9px', opacity: '0.8', textTransform: 'uppercase' }}>Download on the</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold' }}>App Store</div>
                </div>
              </div>
            </a>

            {/* 2. Google Play შავი ღილაკი */}
            <a 
              href="https://play.google.com/store/apps/details?id=ge.railway.mobile" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: '#000', 
                color: '#fff', 
                borderRadius: '8px', 
                padding: '8px 14px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                textDecoration: 'none'
              }}>
                {/* Google Play Icon */}
                <svg width="20" height="20" viewBox="0 0 512 512" fill="none">
                  <path d="M49.19 12.19c-8.55 4.38-14.19 13.5-14.19 24.31v439.1c0 10.81 5.64 19.93 14.19 24.31l234.3-234.3L49.19 12.19z" fill="#EA4335"/>
                  <path d="M346.06 313.19l-62.57-62.57L49.19 484.81c6.53 3.5 14.12 3.86 21.75-.44l275.12-171.18z" fill="#34A853"/>
                  <path d="M346.06 198.81L70.94 27.63c-7.63-4.3-15.22-3.94-21.75.44l234.3 234.3 62.57-62.56z" fill="#FBBC05"/>
                  <path d="M346.06 313.19L418.5 271c13.75-7.75 13.75-20.5 0-28.25l-72.44-42.12-62.57 62.57 62.57 62.57z" fill="#4285F4"/>
                </svg>
                <div style={{ textAlign: 'left', lineHeight: '1.1', textDecoration: 'none' }}>
                  <div style={{ fontSize: '9px', opacity: '0.8', textTransform: 'uppercase' }}>GET IT ON</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Google Play</div>
                </div>
              </div>
            </a>
          </div>
        </div>

        <div className="mobile-app-image-box">
          <img src={mobileAppImg} alt="Georgian Railway Mobile App" className="mobile-mockup-img" />
        </div>
      </div>
    </section>
  );
}