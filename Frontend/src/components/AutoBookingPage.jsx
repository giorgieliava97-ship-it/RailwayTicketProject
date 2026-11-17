import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

function calculateDuration(depTimeStr, arrTimeStr) {
  if (!depTimeStr || !arrTimeStr) return '';
  const dep = new Date(`1970-01-01T${depTimeStr}:00`);
  const arr = new Date(`1970-01-01T${arrTimeStr}:00`);
  let diffMs = arr - dep;
  if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffHrs} სთ ${diffMins} წთ`;
}

export default function AutoBookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tripId = searchParams.get('tripId');
  const seatClass = searchParams.get('class') || 'SECOND';
  const dep = searchParams.get('dep') || '';
  const arr = searchParams.get('arr') || '';

  const [trip, setTrip] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tripLoading, setTripLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    fetch(`http://127.0.0.1:8000/api/trips/${tripId}/?departure_station=${encodeURIComponent(dep)}&arrival_station=${encodeURIComponent(arr)}`)
      .then(res => res.json())
      .then(data => {
        setTrip(data);
        setTripLoading(false);
      })
      .catch(err => {
        console.error("Error fetching trip details:", err);
        setTripLoading(false);
      });
  }, [tripId, dep, arr]);

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrease = () => {
    if (quantity < 9) setQuantity(quantity + 1);
  };

  const handleContinue = () => {
    // 🟢 ვამოწმებთ ყველა შესაძლო ადგილს სადაც ტოკენი შეიძლება ინახებოდეს
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access') || localStorage.getItem('access_token');

    console.log("Found Token:", token); // კონსოლში გამოჩნდება იპოვა თუ არა ტოკენი

    if (!token) {
      alert("თქვენ არ ხართ ავტორიზებული! გთხოვთ თავიდან გაიაროთ ლოგინი.");
      return;
    }

    setLoading(true);

    fetch(`http://127.0.0.1:8000/api/trips/${tripId}/auto-assign/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify({
        seat_class: seatClass,
        quantity: quantity,
        board_station: dep,
        leave_station: arr
      })
    })
    .then(async res => {
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        throw new Error("სერვერიდან დაბრუნდა არასწორი ფორმატის პასუხი.");
      }
      return res.json();
    })
    .then(data => {
      setLoading(false);
      if (data.success && data.assigned_seats) {
        const seatNums = data.assigned_seats.map(s => s.seat_number).join(',');
        const seatPrices = data.assigned_seats.map(s => s.price).join(',');
        navigate(`/passenger-details?tripId=${tripId}&class=${seatClass}&dep=${dep}&arr=${arr}&seats=${seatNums}&prices=${seatPrices}`);
      } else {
        alert(data.error || "შეცდომა მოხდა");
      }
    })
    .catch(err => {
      setLoading(false);
      console.error(err);
      alert(err.message || "სერვერთან კავშირის შეცდომა");
    });
  };

  const classNamesMap = {
    SECOND: 'II კლასი',
    FIRST: 'I კლასი',
    BUSINESS: 'Business class'
  };

  const tripPrices = trip?.prices || { SECOND: 35, FIRST: 75, BUSINESS: 125 };
  const currentPrice = tripPrices[seatClass.toUpperCase()] || 35;

  const depTime = trip?.segment?.board_time || (trip?.departure_time ? trip.departure_time.slice(11, 16) : '');
  const arrTime = trip?.segment?.leave_time || (trip?.arrival_time ? trip.arrival_time.slice(11, 16) : '');
  const durationStr = calculateDuration(depTime, arrTime);

  return (
    <div style={{ background: '#f4f6f8', minHeight: '100vh', paddingBottom: '50px', paddingTop: '110px' }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#222', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#e30613', cursor: 'pointer' }} onClick={() => navigate(-1)}>←</span>
          {dep || trip?.departure_station?.name} - {arr || trip?.arrival_station?.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '30px', background: '#fff', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', alignItems: 'start' }}>
          
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', padding: '20px 25px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: '#e30613', color: '#fff', padding: '10px', borderRadius: '8px' }}>
                  🎫
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#222' }}>{classNamesMap[seatClass] || seatClass}</div>
                  <div style={{ color: '#e30613', fontWeight: 'bold', fontSize: '18px', marginTop: '4px' }}>{currentPrice} ₾</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button onClick={handleDecrease} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e30613', background: '#fff', color: '#e30613', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                <span style={{ fontSize: '18px', fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{quantity}</span>
                <button onClick={handleIncrease} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: '#e30613', color: '#fff', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #eee', position: 'sticky', top: '100px' }}>
            <div style={{ fontWeight: 'bold', color: '#e30613', fontSize: '15px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🚂</span> №{trip?.train?.train_number || ''} {trip?.departure_station?.name} - {trip?.arrival_station?.name}
            </div>

            <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold', color: '#222' }}>
                <span style={{ color: '#e30613' }}>📍</span> {depTime} {trip?.departure_station?.name}
              </div>
              
              <div style={{ background: '#e2e8f0', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', color: '#444', width: 'fit-content', margin: '6px 0 6px 20px' }}>
                ⏱ {durationStr}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#222' }}>
                <span style={{ color: '#e30613' }}>📍</span> {arrTime} {trip?.arrival_station?.name}
              </div>
            </div>

            <button 
              disabled={loading || tripLoading}
              onClick={handleContinue}
              style={{
                width: '100%',
                background: '#e30613',
                color: '#fff',
                border: 'none',
                padding: '14px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(227,6,19,0.3)'
              }}
            >
              {loading ? 'იტვირთება...' : 'შემდეგი'}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}