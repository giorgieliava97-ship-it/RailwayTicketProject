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

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tripId = searchParams.get('tripId');
  const seatClass = searchParams.get('class') || 'SECOND';
  const dep = searchParams.get('dep') || '';
  const arr = searchParams.get('arr') || '';
  const seatsParam = searchParams.get('seats') || '';
  const selectedSeatNumbers = seatsParam ? seatsParam.split(',').map(Number) : [];
  const pricesParam = searchParams.get('prices') || '';
  const seatPricesList = pricesParam ? pricesParam.split(',').map(Number) : [];

  const [trip, setTrip] = useState(null);
  const [timeLeft, setTimeLeft] = useState(600);
  const [loading, setLoading] = useState(false);

  // ფიქტიური ბარათის მონაცემები
  const [cardNumber, setCardNumber] = useState('4000 1234 5678 9010');
  const [expiryDate, setExpiryDate] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [cardHolder, setCardHolder] = useState('GIORGI ELIAVA');

  // ტაიმერი
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          alert("დრო ამოიწურა!");
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
    fetch(`http://127.0.0.1:8000/api/trips/${tripId}/?departure_station=${encodeURIComponent(dep)}&arrival_station=${encodeURIComponent(arr)}`)
      .then(res => res.json())
      .then(data => setTrip(data))
      .catch(err => console.error("Error fetching trip:", err));
  }, [tripId, dep, arr]);

  const totalPrice = seatPricesList.reduce((sum, p) => sum + p, 0) || selectedSeatNumbers.length * 35;

  // გადახდის პროცესი
  const handlePayment = async () => {
    // 🟢 ვიღებთ ტოკენს ზუსტად 'authToken'-დან (ან სხვა ალტერნატივებიდან)
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access');
    
    console.log("Checkout Token found:", token);

    if (!token) {
      alert("ავტორიზაცია ვერ მოიძებნა! გთხოვთ თავიდან გაიაროთ ლოგინი.");
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      // 1. ვქაჩავთ მომხმარებლის ფენდინგ გადახდებს ბექენდიდან
      const res = await fetch('http://127.0.0.1:8000/api/payments/', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}` // 🟢 გამოყენებულია სწორი 'Token' პრეფიქსი DRF-ისთვის
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Payments fetch error response:", errText);
        throw new Error(`სერვერის შეცდომა: ${res.status}`);
      }

      const payments = await res.json();
      const paymentList = Array.isArray(payments) ? payments : (payments.results || []);

      // ვფილტრავთ იმ გადახდებს, რომლებიც ჯერ PENDING-ია
      const pendingPayments = paymentList.filter(p => p.status === 'PENDING');

      if (pendingPayments.length === 0) {
        alert("აქტიური გადასახდელი ბილეთები ვერ მოიძებნა.");
        setLoading(false);
        return;
      }

      // 2. თითოეული ფენდინგ გადახდისთვის ვუძახებთ .pay() ენდპოინტს
      for (let payObj of pendingPayments) {
        const payRes = await fetch(`http://127.0.0.1:8000/api/payments/${payObj.id}/pay/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`
          }
        });

        if (!payRes.ok) {
          const payErr = await payRes.text();
          console.error(`Pay action failed for payment ${payObj.id}:`, payErr);
        }
      }

      setLoading(false);
      navigate(`/ticket-success?tripId=${tripId}&class=${seatClass}&dep=${dep}&arr=${arr}&seats=${seatsParam}`); 

    } catch (err) {
      setLoading(false);
      console.error("Payment process exception:", err);
      alert("გადახდისას მოხდა შეცდომა. იხილეთ კონსოლი.");
    }
  };

  const depTime = trip?.segment?.board_time || (trip?.departure_time ? trip.departure_time.slice(11, 16) : '');
  const arrTime = trip?.segment?.leave_time || (trip?.arrival_time ? trip.arrival_time.slice(11, 16) : '');
  const durationStr = calculateDuration(depTime, arrTime);

  return (
    <div style={{ background: '#f4f6f8', minHeight: '100vh', paddingBottom: '50px', paddingTop: '110px' }}>
      <Navbar />

      <main style={{ maxWidth: '1250px', margin: '0 auto', padding: '0 20px' }}>
        
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#222', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#e30613', cursor: 'pointer' }} onClick={() => navigate(-1)}>←</span>
          {dep || trip?.departure_station?.name} - {arr || trip?.arrival_station?.name}
        </div>

        {/* 3-საფეხურიანი ნაბიჯების ინდიკატორი (მე-3 აქტიურია) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '25px', background: '#fff', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#444' }}>
            <span style={{ background: '#27ae60', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span>
            გამგზავრება
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#444' }}>
            <span style={{ background: '#27ae60', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span>
            გამგზავრება მგზავრი
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e30613', fontWeight: 'bold' }}>
            <span style={{ background: '#e30613', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>3</span>
            გადახდა
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', alignItems: 'start' }}>
          
          {/* მარცხენა მხარე: ფიქტიური ბარათის ფორმა */}
          <div style={{ background: '#fff', padding: '35px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <h3 style={{ marginTop: 0, fontSize: '18px', color: '#2d3748', marginBottom: '20px', borderBottom: '1px solid #edf2f7', paddingBottom: '12px' }}>
              💳 საბანკო ბარათის მონაცემები (სატესტო გადახდა)
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>ბარათის ნომერი</label>
              <input 
                type="text" 
                value={cardNumber} 
                onChange={e => setCardNumber(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e0', boxSizing: 'border-box', fontSize: '16px', fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>მოქმედების ვადა (MM/YY)</label>
                <input 
                  type="text" 
                  value={expiryDate} 
                  onChange={e => setExpiryDate(e.target.value)}
                  style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e0', boxSizing: 'border-box', fontSize: '16px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>CVV / CVC</label>
                <input 
                  type="password" 
                  maxLength="4"
                  value={cvv} 
                  onChange={e => setCvv(e.target.value)}
                  style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e0', boxSizing: 'border-box', fontSize: '16px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>ბარათის მფლობელი</label>
              <input 
                type="text" 
                value={cardHolder} 
                onChange={e => setCardHolder(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e0', boxSizing: 'border-box', fontSize: '16px' }}
              />
            </div>

            <button 
              disabled={loading}
              onClick={handlePayment}
              style={{
                width: '100%',
                background: '#27ae60',
                color: '#fff',
                border: 'none',
                padding: '16px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(39,174,96,0.3)'
              }}
            >
              {loading ? 'მიმდინარეობს დამუშავება...' : `სულ გადახდა: ${totalPrice} ₾`}
            </button>
          </div>

          {/* მარჯვენა მხარე: შემაჯამებელი ბარათი */}
          <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', position: 'sticky', top: '100px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px', color: '#e30613', borderBottom: '1px solid #edf2f7', paddingBottom: '12px' }}>
              შერჩეული ბილეთები
            </h3>

            <div style={{ marginBottom: '20px', fontSize: '13px', color: '#4a5568' }}>
              <div style={{ fontWeight: 'bold', color: '#2d3748', marginBottom: '8px' }}>
                №{trip?.train?.train_number} {trip?.departure_station?.name} - {trip?.arrival_station?.name}
              </div>
              <div style={{ marginBottom: '4px' }}>📍 {depTime} {trip?.departure_station?.name}</div>
              <div style={{ margin: '4px 0', color: '#718096' }}>⏱ {durationStr}</div>
              <div>📍 {arrTime} {trip?.arrival_station?.name}</div>
            </div>

            <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '15px', marginBottom: '20px', maxHeight: '200px', overflowY: 'auto' }}>
              {selectedSeatNumbers.map((num, idx) => (
                <div key={num} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span>ადგილი {num} ({seatClass})</span>
                  <b>{seatPricesList[idx] || 35} ₾</b>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', color: '#2d3748', marginTop: '12px', borderTop: '1px dashed #cbd5e0', paddingTop: '10px' }}>
                <span>სულ თანხა:</span>
                <span style={{ color: '#e30613' }}>{totalPrice} ₾</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '13px', color: '#718096' }}>
              ბილეთების შესაძენად დარჩა: <b style={{ color: '#e30613' }}>{formatTime(timeLeft)}</b>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}