import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroSlider from './components/HeroSlider';
import SearchBar from './components/SearchBar';
import InfoCards from './components/InfoCards';
import MobileAppBanner from './components/MobileAppBanner'; // 🟢 მობილური აპლიკაციის ბანერი
import Footer from './components/Footer';
import './App.css';
import InfoContentPage from './components/InfoContentPage';
import VerifyPage from './components/VerifyPage';
import ProfilePage from './components/ProfilePage';
import SchedulePage from './components/SchedulePage';
import ResetPasswordPage from './components/ResetPasswordPage';
import SearchResultsPage from './components/SearchResultsPage';
import SeatMapPage from './components/SeatMapPage';
import AutoBookingPage from './components/AutoBookingPage';
import PassengerDetailsPage from './components/PassengerDetailsPage';
import CheckoutPage from './components/CheckoutPage';
import TicketSuccessPage from './components/TicketSuccessPage';


function HomePage({ 
  stations, 
  fromCity, 
  setFromCity, 
  toCity, 
  setToCity, 
  departureDate, 
  setDepartureDate, 
  returnDate, 
  setReturnDate, 
  onSearch 
}) {
  return (
    <div>
      <HeroSlider>
        <SearchBar
          stations={stations}
          fromCity={fromCity}
          setFromCity={setFromCity}
          toCity={toCity}
          setToCity={setToCity}
          departureDate={departureDate}
          setDepartureDate={setDepartureDate}
          returnDate={returnDate}
          setReturnDate={setReturnDate}
          onSearch={onSearch}
        />
      </HeroSlider>

      {/* საინფორმაციო ბარათები */}
      <InfoCards />

      {/* 🟢 ხელმისაწვდომი რეისების ნაცვლად ახლა არის მობილური აპლიკაციის ბანერი */}
      <MobileAppBanner />
    </div>
  );
}

function App() {
  const [trips, setTrips] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [departureDate, setDepartureDate] = useState(today);
  const [returnDate, setReturnDate] = useState(null);

  // სერვერული ძებნის ფუნქცია - მთელ ფილტრაციის მოთხოვნას უგზავნის ბექენდს
  const fetchFilteredTrips = (dep = '', arr = '', dateObj = null) => {
    setLoading(true);
    const params = new URLSearchParams();

    if (dep) params.append('departure_station', dep);
    if (arr) params.append('arrival_station', arr);
    
    if (dateObj) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      params.append('date', `${year}-${month}-${day}`);
    }

    fetch(`http://127.0.0.1:8000/api/trips/?${params.toString()}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('რეისების ჩატვირთვის შეცდომა');
        }
        return res.json();
      })
      .then(data => {
        setTrips(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching trips:", err);
        setTrips([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    // სადგურების სიის წამოღება
    fetch('http://127.0.0.1:8000/api/stations/')
      .then(res => {
        if (!res.ok) throw new Error('No stations endpoint');
        return res.json();
      })
      .then(data => {
        const stationsList = Array.isArray(data) ? data : (data.results || []);
        if (stationsList.length > 0) {
          setStations(stationsList);
        }
      })
      .catch(err => console.error("Error fetching stations:", err));

    // საწყისი რეისების ჩატვირთვა დღევანდელი თარიღით
    fetchFilteredTrips('', '', today);
  }, []);

  return (
    <Router>
      <div className="app-page-wrapper">
        <svg className="gr-watermark-bg" viewBox="0 0 520 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M240 0H120C53.7258 0 0 53.7258 0 120C0 186.274 53.7258 240 120 240H240V100H120C108.954 100 100 108.954 100 120C100 131.046 108.954 140 120 140H185V185H120C84.1015 185 55 155.899 55 120C55 84.1015 84.1015 55 120 55H240V0Z"
            fill="#ffffff"
          />
          <path
            d="M260 0H425C471.944 0 510 38.0558 510 85C510 119.566 489.365 149.313 459.73 162.607L515 240H448L401 170H315V240H260V115H425C441.569 115 455 101.569 455 85C455 68.4315 441.569 55 425 55H260V0Z"
            fill="#ffffff"
          />
        </svg>

        <Navbar />

        <div className="app-content-layer">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  stations={stations}
                  fromCity={fromCity}
                  setFromCity={setFromCity}
                  toCity={toCity}
                  setToCity={setToCity}
                  departureDate={departureDate}
                  setDepartureDate={setDepartureDate}
                  returnDate={returnDate}
                  setReturnDate={setReturnDate}
                  onSearch={fetchFilteredTrips}
                />
              }
            />
            <Route path="/schedule" element={<SchedulePage trips={trips} />} />
            <Route path="/verify/:uid/:token" element={<VerifyPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/seat-map" element={<SeatMapPage />} />
            <Route path="/auto-booking" element={<AutoBookingPage />} />
            <Route path="/passenger-details" element={<PassengerDetailsPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/ticket-success" element={<TicketSuccessPage />} />
            
            {/* დინამიური მარშრუტი საინფორმაციო გვერდებისთვის ID-ის მიხედვით */}
            <Route path="/info/:id" element={<InfoContentPage />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </Router>
  );
}

export default App;