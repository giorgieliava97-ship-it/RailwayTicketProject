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

export default function PassengerDetailsPage() {
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
  const [passengers, setPassengers] = useState([]);
  const [savedPassengers, setSavedPassengers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(600);
  const [loading, setLoading] = useState(false);

  // 🟢 კუსტომ მოდალის სტეიტი შეტყობინებებისთვის / გაფრთხილებებისთვის
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 2;
  const totalPages = Math.ceil(passengers.length / pageSize) || 1;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setAlertModal({ isOpen: true, title: 'დრო ამოიწურა', message: 'ბილეთების დაჯავშნის დრო ამოიწურა!' });
          setTimeout(() => navigate('/'), 2000);
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
    
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access');

    fetch(`http://127.0.0.1:8000/api/trips/${tripId}/?departure_station=${encodeURIComponent(dep)}&arrival_station=${encodeURIComponent(arr)}`)
      .then(res => res.json())
      .then(data => setTrip(data))
      .catch(err => console.error("Error fetching trip:", err));

    if (token) {
      fetch('http://127.0.0.1:8000/api/users/saved-passengers/', {
        headers: { 'Authorization': `Token ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const list = Array.isArray(data) ? data : (data.results || []);
          setSavedPassengers(list);
        })
        .catch(err => console.error("Error fetching saved passengers:", err));
    }

    const initialPassengers = selectedSeatNumbers.map((seatNum, idx) => ({
      id: idx + 1,
      seatNumber: seatNum,
      price: seatPricesList[idx] || 35,
      firstName: '',
      lastName: '',
      idNumber: '',
      birthDate: '',
      freeLuggage: true,
      selectedSavedId: '',
      saveToSaved: false
    }));
    setPassengers(initialPassengers);
  }, [tripId, seatsParam, pricesParam]);

  const handleInputChange = (index, field, value) => {
    const updated = [...passengers];
    
    // 🟢 პირადი ნომრის ვალიდაცია: მხოლოდ ციფრები და მკაცრად მაქსიმუმ 11 სიმბოლო
    if (field === 'idNumber') {
      const numericValue = value.replace(/\D/g, '').slice(0, 11);
      updated[index][field] = numericValue;
    } else {
      updated[index][field] = value;
    }
    
    if (updated[index].selectedSavedId && field === 'idNumber') {
      updated[index].selectedSavedId = '';
    }
    
    setPassengers(updated);
  };

  const handleSelectSavedPassenger = (index, savedId) => {
    const updated = [...passengers];

    if (!savedId) {
      updated[index] = {
        ...updated[index],
        selectedSavedId: '',
        firstName: '',
        lastName: '',
        idNumber: '',
        birthDate: '',
        saveToSaved: false
      };
    } else {
      const found = savedPassengers.find(p => p.id.toString() === savedId.toString());
      if (found) {
        updated[index] = {
          ...updated[index],
          selectedSavedId: savedId,
          firstName: found.first_name || '',
          lastName: found.last_name || '',
          idNumber: found.personal_id || '',
          birthDate: found.birth_date || '',
          saveToSaved: false
        };
      }
    }
    setPassengers(updated);
  };

  const startIndex = (currentPage - 1) * pageSize;
  const currentPassengers = passengers.slice(startIndex, startIndex + pageSize);

  const handleNextPage = async () => {
    // 🟢 სავალდებულო ველების და პირადი ნომრის 11-ნიშნა სიგრძის შემოწმება მიმდინარე გვერდზე
    for (let p of currentPassengers) {
      if (!p.firstName || !p.lastName || !p.idNumber) {
        setAlertModal({ isOpen: true, title: 'ყურადღება', message: `გთხოვთ შეავსოთ მგზავრი #${p.seatNumber}-ის სავალდებულო ველები!` });
        return;
      }
      if (p.idNumber.length !== 11) {
        setAlertModal({ isOpen: true, title: 'არასწორი პირადი ნომერი', message: `მგზავრი #${p.seatNumber}-ის პირადი ნომერი უნდა შედგებოდეს ზუსტად 11 ციფრისგან!` });
        return;
      }
    }

    // 🟢 გასწორებული შემოწმება: ვამოწმებთ მხოლოდ რეალურად შევსებულ 11-ნიშნა პირად ნომრებს მთელ სიაში
    const activeIdNumbers = passengers.map(p => p.idNumber).filter(id => id && id.length === 11);
    const duplicateIds = activeIdNumbers.filter((id, index) => activeIdNumbers.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      setAlertModal({ isOpen: true, title: 'დუბლირებული პირადი ნომერი', message: 'სიაში მითითებულია ერთი და იგივე პირადი ნომერი რამდენჯერმე. თითოეული მგზავრი უნდა იყოს უნიკალური!' });
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access');
    if (!token) {
      setAlertModal({ isOpen: true, title: 'ავტორიზაციის შეცდომა', message: 'ავტორიზაცია ვერ მოიძებნა!' });
      navigate('/login');
      return;
    }

    for (let p of currentPassengers) {
      if (p.saveToSaved && !p.selectedSavedId) {
        try {
          await fetch('http://127.0.0.1:8000/api/users/saved-passengers/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Token ${token}`
            },
            body: JSON.stringify({
              first_name: p.firstName,
              last_name: p.lastName,
              personal_id: p.idNumber,
              birth_date: p.birthDate || null
            })
          });
        } catch (err) {
          console.error("Error saving new passenger:", err);
        }
      }
    }

    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setLoading(true);

      fetch(`http://127.0.0.1:8000/api/trips/${tripId}/book-manual/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          seat_class: seatClass,
          passengers: passengers,
          board_station: dep,
          leave_station: arr
        })
      })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.success) {
          navigate(`/checkout?tripId=${tripId}&class=${seatClass}&dep=${dep}&arr=${arr}&seats=${seatsParam}&prices=${pricesParam}`);
        } else {
          setAlertModal({ isOpen: true, title: 'შეცდომა ბილეთის დაჯავშნისას', message: data.error || data.id_number?.[0] || "ბილეთების დაჯავშნა ვერ მოხერხდა" });
        }
      })
      .catch(err => {
        setLoading(false);
        console.error(err);
        setAlertModal({ isOpen: true, title: 'სერვერის შეცდომა', message: 'სერვერთან კავშირის შეცდომა' });
      });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formatShortName = (firstName, lastName) => {
    if (!firstName && !lastName) return '';
    const initial = firstName ? `${firstName.trim().charAt(0)}.` : '';
    const last = lastName ? lastName.trim() : '';
    return `${initial}${last}`;
  };

  const totalPrice = passengers.reduce((sum, p) => sum + p.price, 0);

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

        {/* ნაბიჯების ინდიკატორი */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '25px', background: '#fff', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#444' }}>
            <span style={{ background: '#27ae60', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span>
            გამგზავრება
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e30613', fontWeight: 'bold' }}>
            <span style={{ background: '#e30613', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>2</span>
            გამგზავრება მგზავრი
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#666' }}>
            <span style={{ background: '#ddd', color: '#444', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>3</span>
            გადახდა
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', alignItems: 'start' }}>
          
          {/* მარცხენა მხარე: მგზავრების ფორმები */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {currentPassengers.map((p, idx) => {
              const actualIndex = startIndex + idx;
              const isIdInvalid = p.idNumber.length > 0 && p.idNumber.length < 11;

              return (
                <div key={p.seatNumber} style={{ background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #edf2f7', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#2d3748' }}>
                      მგზავრი {actualIndex + 1}
                    </h3>
                    <span style={{ background: '#fff5f5', color: '#e30613', padding: '4px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', border: '1px solid #feb2b2' }}>
                      ადგილი {p.seatNumber}
                    </span>
                  </div>

                  {/* რჩეული (დამახსოვრებული) მგზავრები და შენახვის ჩექბოქსი */}
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>რჩეული მგზავრები</label>
                      <select 
                        value={p.selectedSavedId || ''} 
                        onChange={(e) => handleSelectSavedPassenger(actualIndex, e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0', background: '#fafafa', boxSizing: 'border-box' }}
                      >
                        <option value="">აირჩიეთ დამახსოვრებული მგზავრი...</option>
                        {savedPassengers.map(sp => (
                          <option key={sp.id} value={sp.id}>
                            {sp.first_name} {sp.last_name} ({sp.personal_id})
                          </option>
                        ))}
                      </select>
                    </div>

                    {!p.selectedSavedId && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px' }}>
                        <input 
                          type="checkbox" 
                          id={`save-${actualIndex}`}
                          checked={p.saveToSaved || false}
                          onChange={(e) => {
                            const updated = [...passengers];
                            updated[actualIndex].saveToSaved = e.target.checked;
                            setPassengers(updated);
                          }}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#e30613' }}
                        />
                        <label htmlFor={`save-${actualIndex}`} style={{ fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: '#4a5568', whiteSpace: 'nowrap' }}>
                          რჩეულ მგზავრებში შენახვა
                        </label>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>* სახელი</label>
                      <input 
                        type="text" 
                        value={p.firstName} 
                        onChange={e => handleInputChange(actualIndex, 'firstName', e.target.value)}
                        placeholder="სახელი"
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0', boxSizing: 'border-box', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>* გვარი</label>
                      <input 
                        type="text" 
                        value={p.lastName} 
                        onChange={e => handleInputChange(actualIndex, 'lastName', e.target.value)}
                        placeholder="გვარი"
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0', boxSizing: 'border-box', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>* პირადი ნომერი (11 ციფრი)</label>
                      <input 
                        type="text" 
                        value={p.idNumber} 
                        onChange={e => handleInputChange(actualIndex, 'idNumber', e.target.value)}
                        placeholder="11 ნიშნა პირადი ნომერი"
                        maxLength={11}
                        style={{ 
                          width: '100%', 
                          padding: '12px', 
                          borderRadius: '8px', 
                          border: `1px solid ${isIdInvalid ? '#e30613' : '#cbd5e0'}`, 
                          boxSizing: 'border-box', 
                          outline: 'none',
                          background: isIdInvalid ? '#fff5f5' : '#fff'
                        }}
                      />
                      {isIdInvalid && (
                        <div style={{ fontSize: '11px', color: '#e30613', marginTop: '4px', fontWeight: 'bold' }}>
                          პირადი ნომერი უნდა შედგებოდეს ზუსტად 11 ციფრისგან ({p.idNumber.length}/11)
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>დაბადების თარიღი</label>
                      <input 
                        type="date" 
                        value={p.birthDate} 
                        onChange={e => handleInputChange(actualIndex, 'birthDate', e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0', boxSizing: 'border-box', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f7fafc', padding: '15px', borderRadius: '8px', border: '1px solid #edf2f7' }}>
                    <input 
                      type="checkbox" 
                      checked={p.freeLuggage} 
                      onChange={e => handleInputChange(actualIndex, 'freeLuggage', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#e30613' }}
                    />
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#2d3748' }}>უფასო ხელბარგი 🧳</div>
                      <div style={{ fontSize: '12px', color: '#718096' }}>უფასო ხელბარგი (&lt;36 კგ, განზომილების ჯამი &lt;180 სმ-მდე)</div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* პაგინაცია */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e0',
                    background: currentPage === 1 ? '#f7fafc' : '#fff',
                    color: currentPage === 1 ? '#a0aec0' : '#2d3748',
                    fontWeight: 'bold',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ← წინა
                </button>

                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a5568' }}>
                  გვერდი {currentPage} / {totalPages}
                </span>

                <button
                  onClick={handleNextPage}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#e30613',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'იტვირთება...' : (currentPage === totalPages ? 'შემდეგი (გადახდა)' : 'შემდეგი →')}
                </button>
              </div>
            )}
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
              {passengers.map(p => {
                const shortName = formatShortName(p.firstName, p.lastName);
                return (
                  <div key={p.seatNumber} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '6px' }}>
                    <span>{p.seatNumber} ({seatClass}) {shortName && <b style={{ color: '#2d3748', marginLeft: '4px' }}>{shortName}</b>}</span>
                    <b>{p.price} ₾</b>
                  </div>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', color: '#2d3748', marginTop: '12px', borderTop: '1px dashed #cbd5e0', paddingTop: '10px' }}>
                <span>სულ თანხა:</span>
                <span style={{ color: '#e30613' }}>{totalPrice} ₾</span>
              </div>
            </div>

            {totalPages === 1 && (
              <button 
                disabled={loading}
                onClick={handleNextPage}
                style={{
                  width: '100%',
                  background: '#e30613',
                  color: '#fff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(227,6,19,0.3)'
                }}
              >
                {loading ? 'იტვირთება...' : 'შემდეგი'}
              </button>
            )}

            <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '13px', color: '#718096' }}>
              ბილეთების შესაძენად დარჩა: <b style={{ color: '#e30613' }}>{formatTime(timeLeft)}</b>
            </div>
          </div>

        </div>
      </main>

      {/* 🟢 კუსტომ მოდალი შეტყობინებებისთვის / გაფრთხილებებისთვის */}
      {alertModal.isOpen && (
        <div className="auth-modal-overlay" onClick={() => setAlertModal({ isOpen: false, title: '', message: '' })}>
          <div className="auth-modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '420px', background: '#fff', padding: '30px', borderRadius: '16px', position: 'relative', border: '2px solid rgba(227, 6, 19, 0.4)', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}}>
            <div style={{fontSize: '36px', marginBottom: '10px'}}>⚠️</div>
            <h3 style={{marginTop: 0, marginBottom: '15px', color: '#2d3748', fontSize: '18px'}}>
              {alertModal.title}
            </h3>
            <p style={{fontSize: '14px', color: '#4a5568', marginBottom: '25px', lineHeight: '1.5'}}>
              {alertModal.message}
            </p>
            <button 
              onClick={() => setAlertModal({ isOpen: false, title: '', message: '' })}
              style={{width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#e30613', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px'}}
            >
              კარგი
            </button>
          </div>
        </div>
      )}
    </div>
  );
}