import logo from '../assets/logo.svg';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer-wrapper">
      <div className="footer-container">
        
        {/* მარცხენა ნაწილი: ლოგო და საავტორო უფლებები */}
        <div className="footer-left">
          <img src={logo} alt="საქართველოს რკინიგზა" className="footer-logo" />
          <div className="footer-copyright">
            <strong>ყველა უფლება დაცულია</strong>
            <span>© საქართველოს რკინიგზა</span>
          </div>
        </div>

        {/* შუა ნაწილი: ცხელი ხაზი 1331 */}
        <div className="footer-hotline">
          <div className="hotline-icon-circle">
            📞
          </div>
          <div className="hotline-info">
            <span className="hotline-title">ცხელი ხაზი Hot Line</span>
            <span className="hotline-number">1331</span>
          </div>
        </div>

        {/* მარჯვენა ნაწილი: სოციალური ქსელები */}
        <div className="footer-right">
          <span className="social-label">გამოგყევით:</span>
          <div className="social-icons">
            <a href="https://www.facebook.com/GeoRailway/" target="_blank" rel="noopener noreferrer" className="social-btn facebook" title="Facebook">
              f
            </a>
            <a href="https://www.instagram.com/georgianrailway/?igsh=MTUwNm40OTg5ZGF1aw%3D%3D" target="_blank" rel="noopener noreferrer" className="social-btn instagram" title="Instagram">
              ig
            </a>
            <a href="https://www.linkedin.com/company/georgianrailway/" target="_blank" rel="noopener noreferrer" className="social-btn linkedin" title="LinkedIn">
              in
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}