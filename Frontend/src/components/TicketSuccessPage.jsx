import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function TicketSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const tripId = searchParams.get('tripId');
  const seatsParam = searchParams.get('seats') || '';
  const selectedSeatNumbers = seatsParam ? seatsParam.split(',').map(Number).filter(Boolean) : [];

  const handleDownloadPDF = () => {
    window.print();
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access');
    if (!token) return;

    fetch('http://127.0.0.1:8000/api/tickets/', {
      headers: {
        'Authorization': `Token ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        const ticketList = Array.isArray(data) ? data : (data.results || []);
        
        // 🟢 1. ვფილტრავთ მხოლოდ აქტიურ ან პენდინგში მყოფ ბილეთებს (CANCELLED-ებს ვრიცხავთ სრულად)
        let filtered = ticketList.filter(t => t.status !== 'CANCELLED');
        
        // 🟢 2. რეისის მიხედვით ფილტრაცია
        if (tripId) {
          filtered = filtered.filter(t => String(t.trip?.id || t.trip) === String(tripId));
        }

        // 🟢 3. ადგილების ნომრების მიხედვით ფილტრაცია
        if (selectedSeatNumbers.length > 0) {
          filtered = filtered.filter(t => selectedSeatNumbers.includes(Number(t.seat_number)));
        }

        // 🟢 4. გამოვრიცხოთ ისეთები, რომლებსაც პირადობის ნომერი ან სახელი არ აქვთ (ძველი ცარიელი ჩანაწერები)
        filtered = filtered.filter(t => t.id_number && t.first_name);

        // 🟢 5. ვალაგებთ ID-ს კლებადობით (ყველაზე ახალი ბილეთები პირველ ადგილზე) 
        // და ვიღებთ ზუსტად იმდენს, რამდენი ადგილიც იყო არჩეული!
        filtered.sort((a, b) => b.id - a.id);

        const count = selectedSeatNumbers.length > 0 ? selectedSeatNumbers.length : 1;
        filtered = filtered.slice(0, count);

        setTickets(filtered);
        setLoading(false);

        localStorage.removeItem('ticket_expires_at');

        if (filtered.length > 0) {
          const firstId = filtered[0].id;
          document.title = `ბილეთი TKT-${firstId} (${filtered.length})`;
        }
      })
      .catch(err => {
        console.error("Error fetching tickets:", err);
        setLoading(false);
      });
  }, [tripId, seatsParam]);

  return (
    <div style={{ background: '#f4f6f8', minHeight: '100vh', paddingBottom: '50px', paddingTop: '110px' }}>
      <div className="no-print">
        <Navbar />
      </div>

      <main style={{ maxWidth: '850px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* წარმატების შეტყობინება */}
        <div className="no-print" style={{ background: '#d4edda', color: '#155724', padding: '20px', borderRadius: '12px', textAlign: 'center', marginBottom: '30px', fontWeight: 'bold', border: '1px solid #c3e6cb' }}>
          🎉 გადახდა წარმატებით დასრულდა! თქვენი ბილეთები გააქტიურებულია.
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }} className="no-print">
          <h2 style={{ margin: 0, color: '#2d3748' }}>შეძენილი ბილეთები ({tickets.length})</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleDownloadPDF}
              style={{ background: '#e30613', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              📥 PDF-ის გადმოწერა / პრევიუ
            </button>
            <button 
              onClick={() => navigate('/profile')}
              style={{ background: '#4a5568', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              პროფილზე დაბრუნება ➔
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px' }}>იტვირთება ბილეთები...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {tickets.map((t, idx) => (
              <div 
                key={t.id || idx} 
                className="ticket-card"
                style={{ 
                  background: '#fff', 
                  borderRadius: '16px', 
                  padding: '30px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: '1px solid #cbd5e0',
                  position: 'relative',
                  overflow: 'hidden',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {/* ბილეთის ზედა ზოლი */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed #cbd5e0', paddingBottom: '12px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#e30613', color: '#fff', fontWeight: 'bold', padding: '5px 10px', borderRadius: '6px', fontSize: '13px' }}>
                      GR
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#e30613', fontWeight: 'bold', textTransform: 'uppercase' }}>საქართველოს რკინიგზა</div>
                      <div style={{ fontSize: '10px', color: '#718096' }}>Georgian Railway • ოფიციალური ელექტრონული ბილეთი</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', color: '#718096' }}>ბილეთის №: </span>
                    <b style={{ color: '#2d3748', fontSize: '14px' }}>TKT-{t.id}</b>
                  </div>
                </div>

                {/* მთავარი ინფორმაცია */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#f8fafc', padding: '12px 18px', borderRadius: '10px', border: '1px solid #edf2f7' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#718096' }}>რეისი / მატარებელი</span>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a202c' }}>
                      №{t.trip?.train?.train_number || '804'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#718096' }}>მომსახურების კლასი</span>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#e30613' }}>
                      {t.seat_class === 'SECOND' ? 'II კლასი' : t.seat_class === 'FIRST' ? 'I კლასი' : 'Business class'}
                    </div>
                  </div>
                </div>

                {/* მარშრუტი */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#e30613', fontWeight: 'bold', marginBottom: '4px' }}>🟢 ჩასხდომა</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2d3748' }}>{t.board_station}</div>
                    <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '4px' }}>
                      📅 {t.board_time ? t.board_time.replace('T', ' ').slice(0, 16) : ''}
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#e30613', fontWeight: 'bold', marginBottom: '4px' }}>🔴 ჩამოსვლა</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2d3748' }}>{t.leave_station}</div>
                    <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '4px' }}>
                      📅 {t.leave_time ? t.leave_time.replace('T', ' ').slice(0, 16) : ''}
                    </div>
                  </div>
                </div>

                {/* მგზავრის სრული ინფორმაცია */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #edf2f7', paddingTop: '15px' }}>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#718096' }}>ვაგონი</div>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#2d3748' }}>1</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#718096' }}>ადგილი</div>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#e30613' }}>№{t.seat_number}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#718096' }}>მგზავრი</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2d3748' }}>
                        {t.first_name} {t.last_name}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#718096' }}>პირადი ნომერი</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2d3748' }}>
                        {t.id_number || 'არ არის'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#718096' }}>დაბ. თარიღი</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2d3748' }}>
                        {t.birth_date || 'არ არის'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#718096' }}>თანხა</div>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#27ae60' }}>{t.price} ₾</div>
                    </div>
                  </div>

                  <div style={{ border: '2px solid #2d3748', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                    <div style={{ width: '45px', height: '45px', background: '#2d3748', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 'bold', textAlign: 'center' }}>
                      QR CODE
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm;
          }

          body, html {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
          }

          .no-print, nav, header, footer {
            display: none !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          main {
            display: block !important;
            position: static !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }

          main > div {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .ticket-card {
            box-shadow: none !important;
            border: 1.5px solid #2d3748 !important;
            margin: 0 auto 15px auto !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 16px !important;
            background: #ffffff !important;
            
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}