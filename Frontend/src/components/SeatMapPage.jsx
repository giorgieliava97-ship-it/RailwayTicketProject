import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function SeatMapPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tripId = searchParams.get('tripId');
  const seatClass = (searchParams.get('class') || 'SECOND').toUpperCase();
  const depStation = searchParams.get('dep') || '';
  const arrStation = searchParams.get('arr') || '';

  const [wagonLayout, setWagonLayout] = useState(null);
  const [tripPrices, setTripPrices] = useState({ SECOND: 35, FIRST: 75, BUSINESS: 125 });
  const [selectedWagon, setSelectedWagon] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState([]); 
  const [loading, setLoading] = useState(true);

  const [timeLeft, setTimeLeft] = useState(() => {
    const savedExpire = localStorage.getItem('ticket_expires_at');
    const now = Date.now();
    if (savedExpire && Number(savedExpire) > now) {
      return Math.floor((Number(savedExpire) - now) / 1000);
    } else {
      const newExpire = now + 10 * 60 * 1000; // ზუსტად 10 წუთი მილიწამებში
      localStorage.setItem('ticket_expires_at', newExpire);
      return 600;
    }
  });

  // 🟢 ერთადერთი სწორი useEffect ტაიმერისთვის (დუბლიკატი ამოშლილია)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          localStorage.removeItem('ticket_expires_at');
          alert("დრო ამოიწურა! გთხოვთ თავიდან სცადოთ ძებნა.");
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!tripId) return;
    setLoading(true);

    fetch(`http://127.0.0.1:8000/api/trips/${tripId}/?departure_station=${encodeURIComponent(depStation)}&arrival_station=${encodeURIComponent(arrStation)}`)
      .then(res => res.json())
      .then(data => {
        if (data.prices) {
          setTripPrices(data.prices);
        }
      })
      .catch(err => console.error("Error fetching trip prices:", err));

    fetch(`http://127.0.0.1:8000/api/trips/${tripId}/seat-map/?wagon=${selectedWagon}&board_station=${encodeURIComponent(depStation)}&leave_station=${encodeURIComponent(arrStation)}`)
      .then(res => res.json())
      .then(data => {
        setWagonLayout(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching seat map:", err);
        setLoading(false);
      });
  }, [tripId, selectedWagon, depStation, arrStation]);

  const getSeatPrice = (cls) => {
    const key = (cls || seatClass).toUpperCase();
    return tripPrices[key] || tripPrices[seatClass] || 35;
  };

  const handleSeatClick = (seat) => {
    if (seat.status === 'booked' || (seat.class && seat.class.toUpperCase() !== seatClass)) return;

    const exists = selectedSeats.find(s => s.number === seat.number);
    if (exists) {
      setSelectedSeats(selectedSeats.filter(s => s.number !== seat.number));
    } else {
      if (selectedSeats.length >= 9) {
        alert("მაქსიმუმ 9 ადგილის არჩევაა შესაძლებელი!");
        return;
      }
      const basePrice = getSeatPrice(seat.class);
      setSelectedSeats([...selectedSeats, { number: seat.number, class: seat.class, price: basePrice + 1 }]);
    }
  };

  const removeSeat = (seatNumber) => {
    setSelectedSeats(selectedSeats.filter(s => s.number !== seatNumber));
  };

  const handleProceedToPassengers = () => {
    if (selectedSeats.length === 0) return;
    const seatNums = selectedSeats.map(s => s.number).join(',');
    const seatPrices = selectedSeats.map(s => s.price).join(',');
    navigate(`/passenger-details?tripId=${tripId}&class=${seatClass}&dep=${depStation}&arr=${arrStation}&seats=${seatNums}&prices=${seatPrices}`);
  };

  const elementLabels = {
    stairs: "კიბე",
    wc: "ტუალეტი",
    luggage: "ბარგი",
    food: "საკვები",
    exit: "გასასვლელი"
  };

  const renderElementIcon = (name) => {
    switch (name) {
      case 'stairs':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18" /><path d="M7 21v-3h3v-3h3v-3h3v-3h3V6" /><circle cx="8" cy="5" r="1.2" fill="currentColor" stroke="none" /><path d="M5 12l3-2 2 1 1-2" /><path d="M8 10l1 3 2-1" />
          </svg>
        );
      case 'exit':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12H1" /><path d="M3 10l-2 2 2 2" /><path d="M19 12h4" /><path d="M21 10l2 2-2 2" /><rect x="7" y="4" width="4.5" height="16" rx="1" strokeWidth="1.8" /><rect x="8.25" y="7" width="2" height="7" rx="0.5" strokeWidth="1.2" /><rect x="12.5" y="4" width="4.5" height="16" rx="1" strokeWidth="1.8" /><rect x="13.75" y="7" width="2" height="7" rx="0.5" strokeWidth="1.2" />
          </svg>
        );
      case 'wc':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><text x="12" y="8.5" fontSize="5.5" fontWeight="900" fontFamily="Arial, sans-serif" textAnchor="middle" fill="currentColor">WC</text><line x1="12" y1="10" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" /><circle cx="7" cy="12" r="1.2" fill="currentColor" /><path d="M5 14.5h4l-1.2 4.5h-1.6z" fill="currentColor" /><circle cx="17" cy="12" r="1.2" fill="currentColor" /><path d="M15.5 14.5h3v4.5h-3z" fill="currentColor" />
          </svg>
        );
      case 'luggage':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="8" width="16" height="12" rx="2" /><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          </svg>
        );
      case 'food':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /></svg>
        );
    }
  };

  return (
    <div style={{ background: '#f4f6f8', minHeight: '100vh', paddingBottom: '50px', paddingTop: '110px' }}>
      <Navbar />
      <main style={{ maxWidth: '1450px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#222', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#e30613', cursor: 'pointer' }} onClick={() => navigate(-1)}>←</span>
          {depStation || 'თბილისი'} - {arrStation || 'ბათუმი'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '25px', background: '#fff', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e30613', fontWeight: 'bold' }}>
            <span style={{ background: '#e30613', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>1</span>
            გამგზავრება
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#666' }}>
            <span style={{ background: '#ddd', color: '#444', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>2</span>
            გამგზავრება მგზავრი
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#666' }}>
            <span style={{ background: '#ddd', color: '#444', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>3</span>
            გადახდა
          </div>
        </div>

        <div style={{ display: 'flex', gap: '30px', marginBottom: '25px', fontSize: '14px', alignItems: 'center', background: '#fff', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '14px', height: '14px', background: '#fff', border: '2px solid #e30613', borderRadius: '3px' }}></span> არჩეული</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '14px', height: '14px', background: '#27ae60', borderRadius: '3px' }}></span> ხელმისაწვდომი ({seatClass})</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '14px', height: '14px', background: '#e30613', borderRadius: '3px' }}></span> გაყიდული</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '14px', height: '14px', background: '#cbd5e0', borderRadius: '3px' }}></span> დაბლოკილი / სხვა კლასი</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '30px', alignItems: 'start' }}>
          <div style={{ background: '#fff', padding: '35px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '30px' }}>
              {[1, 2, 3, 4].map(wNum => (
                <button
                  key={wNum}
                  onClick={() => setSelectedWagon(wNum)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: selectedWagon === wNum ? '2px solid #e30613' : '1px solid #e2e8f0',
                    background: selectedWagon === wNum ? '#fff5f5' : '#fff',
                    color: selectedWagon === wNum ? '#e30613' : '#4a5568',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ვაგონი {wNum}
                </button>
              ))}
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>იტვირთება ვაგონის რუკა...</p>
            ) : wagonLayout && wagonLayout.layout ? (
              <div>
                <h3 style={{ marginBottom: '25px', color: '#2d3748', fontSize: '20px' }}>ვაგონი {wagonLayout.wagon_number}</h3>
                {wagonLayout.layout.floors.map((floor, fIdx) => {
                  const romanNum = fIdx === 0 ? 'I' : 'II';
                  return (
                    <div key={fIdx} style={{ marginBottom: '35px', border: '3px solid #cbd5e0', padding: '30px 25px', borderRadius: '40px', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '30px', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#718096', minWidth: '35px', textAlign: 'center', borderRight: '2px solid #e2e8f0', paddingRight: '20px' }}>
                        {romanNum}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '14px', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        {floor.rows.map((row, rIdx) => (
                          <div key={rIdx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                            {row.map((cell, cIdx) => {
                              if (!cell || cell.type === 'empty') return <div key={cIdx} style={{ width: '36px', height: '36px' }}></div>;
                              if (cell.type === 'element') {
                                const labelText = elementLabels[cell.name] || cell.label;
                                return (
                                  <div key={cIdx} title={labelText} style={{ width: '40px', height: '40px', background: '#e30613', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(227,6,19,0.3)' }}>
                                    {renderElementIcon(cell.name)}
                                  </div>
                                );
                              }
                              if (cell.type === 'seat') {
                                const isSelected = selectedSeats.some(s => s.number === cell.number);
                                const isBooked = cell.status === 'booked';
                                const isWrongClass = cell.class && cell.class.toUpperCase() !== seatClass;
                                const isLimitReached = selectedSeats.length >= 9 && !isSelected;
                                const isDisabled = isBooked || isWrongClass || isLimitReached;

                                let bg = '#27ae60'; 
                                if (isBooked || isWrongClass) bg = isWrongClass ? '#cbd5e0' : '#e30613'; 
                                if (isSelected) bg = '#fff'; 

                                return (
                                  <div key={cIdx} onClick={() => !isDisabled && handleSeatClick(cell)} style={{ width: '34px', height: '44px', backgroundColor: bg, border: isSelected ? '2px solid #e30613' : 'none', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', cursor: isDisabled ? 'not-allowed' : 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', opacity: isWrongClass ? 0.5 : 1 }} title={`ადგილი N${cell.number} (${cell.class || seatClass})`}>
                                    <div style={{ width: '20px', height: '5px', backgroundColor: '#cbd5e0', borderRadius: '3px' }}></div>
                                    <div style={{ width: '20px', height: '5px', backgroundColor: '#cbd5e0', borderRadius: '3px' }}></div>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p>ინფორმაცია ვერ მოიძებნა.</p>}
          </div>

          <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', position: 'sticky', top: '20px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', color: '#e30613', borderBottom: '1px solid #edf2f7', paddingBottom: '12px' }}>
              შერჩეული ბილეთები
            </h3>
            <div style={{ minHeight: '140px', maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
              {selectedSeats.length > 0 ? (
                selectedSeats.map(s => (
                  <div key={s.number} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f7fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '10px', fontSize: '13px', border: '1px solid #edf2f7' }}>
                    <span style={{ fontWeight: '600', color: '#2d3748' }}>N{s.number} - {s.price} ₾</span>
                    <button onClick={() => removeSeat(s.number)} style={{ background: 'transparent', border: 'none', color: '#e30613', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>✕</button>
                  </div>
                ))
              ) : <p style={{ color: '#a0aec0', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>ადგილები არ არის არჩეული</p>}
            </div>

            <button disabled={selectedSeats.length === 0} onClick={handleProceedToPassengers} style={{ width: '100%', background: selectedSeats.length === 0 ? '#cbd5e0' : '#e30613', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: selectedSeats.length === 0 ? 'not-allowed' : 'pointer' }}>
              შემდეგი
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#718096' }}>
              ბილეთების შესაძენად დარჩა: <b style={{ color: '#e30613' }}>{formatTime(timeLeft)}</b>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}