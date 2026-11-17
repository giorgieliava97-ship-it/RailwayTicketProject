import { useState, useEffect, useRef } from 'react';
import './SchedulePage.css';

export default function SchedulePage() {
  const [trips, setTrips] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [departureStation, setDepartureStation] = useState('');
  const [arrivalStation, setArrivalStation] = useState('');

  // 🟢 სერჩბარის სტეიტები დროპდაუნში ძებნისთვის
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');

  const [isDepOpen, setIsDepOpen] = useState(false);
  const [isArrOpen, setIsArrOpen] = useState(false);

  const [expandedTripId, setExpandedTripId] = useState(null);
  const wrapperRef = useRef(null);

  // გარედან დაკლიკებისას დროპდაუნების დახურვა
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsDepOpen(false);
        setIsArrOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. სადგურებისა და განრიგის წამოღება ახალი /api/schedule/ ენდპონტიდან
  const fetchSchedule = (dep = '', arr = '') => {
    setLoading(true);
    let url = 'http://127.0.0.1:8000/api/schedule/?';
    const params = new URLSearchParams();

    if (dep) params.append('departure_station', dep);
    if (arr) params.append('arrival_station', arr);

    fetch(url + params.toString())
      .then(res => res.json())
      .then(data => {
        setTrips(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching schedule:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    // სადგურების ჩამოტვირთვა და საწყისი განრიგი
    fetch('http://127.0.0.1:8000/api/stations/')
      .then(res => res.json())
      .then(stationsData => {
        const stationsList = Array.isArray(stationsData) ? stationsData : (stationsData.results || []);
        const sortedStations = stationsList.sort((a, b) => a.name.localeCompare(b.name, 'ka'));
        setStations(sortedStations);
        
        // გამოვიძახოთ განრიგი პარამეტრების გარეშე (ყველა რეისი)
        fetchSchedule('', '');
      })
      .catch(err => {
        console.error("Error fetching stations:", err);
        setLoading(false);
      });
  }, []);

  const handleSearchClick = () => {
    fetchSchedule(departureStation, arrivalStation);
  };

  const handleResetFilter = () => {
    setDepartureStation('');
    setArrivalStation('');
    fetchSchedule('', '');
  };

  // კატეგორიები (ბექენდიდან მოდის category: MAGISTRAL, SUBURBAN, INTERNATIONAL)
  const magistralTrips = trips.filter(t => t.category === 'MAGISTRAL');
  const suburbanTrips = trips.filter(t => t.category === 'SUBURBAN');
  const internationalTrips = trips.filter(t => t.category === 'INTERNATIONAL');

  const toggleStops = (tripId) => {
    setExpandedTripId(expandedTripId === tripId ? null : tripId);
  };

  // ფილტრაცია დროპდაუნის შიგნით (ძებნისთვის)
  const filteredFromStations = stations.filter(st => 
    st.name.toLowerCase().includes(fromSearch.toLowerCase()) || 
    (st.code && st.code.toLowerCase().includes(fromSearch.toLowerCase()))
  );

  const filteredToStations = stations.filter(st => 
    st.name.toLowerCase().includes(toSearch.toLowerCase()) || 
    (st.code && st.code.toLowerCase().includes(toSearch.toLowerCase()))
  );

  const renderTable = (categoryTitle, tripList) => {
    if (tripList.length === 0) return null;

    return (
      <div className="schedule-category-section" style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '20px', color: '#222', fontSize: '20px' }}>{categoryTitle}</h3>
        <div className="schedule-table-wrapper">
          <div className="schedule-table-header">
            <span>მატარებლის N</span>
            <span>რეისი / მარშრუტი</span>
            <span>გაჩერება</span>
            <span>გასვლა</span>
            <span>ჩასვლა</span>
          </div>
          {tripList.map(trip => {
            const isExpanded = expandedTripId === trip.id;
            const fullStopsList = trip.stops || [];
            const totalStopsCount = fullStopsList.length;

            return (
              <div key={trip.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #eaeaea' }}>
                <div className="schedule-table-row">
                  <span style={{ fontWeight: 'bold' }}>{trip.train_number}</span>
                  <span>{trip.route}</span>
                  
                  <span>
                    <button
                      type="button"
                      onClick={() => toggleStops(trip.id)}
                      style={{
                        background: isExpanded ? '#fff5f5' : '#f8f9fa',
                        border: '1px solid #ddd',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: '600',
                        color: isExpanded ? '#e30613' : '#333'
                      }}
                    >
                      {totalStopsCount} სადგური 
                      <span style={{ fontSize: '10px' }}>{isExpanded ? '▲' : '▼'}</span>
                    </button>
                  </span>

                  <span>{trip.departure_time}</span>
                  <span>{trip.arrival_time}</span>
                </div>

                {/* 🟢 გაჩერებების სია, სადაც ზუსტად იჯდება შუალედური სადგურები და დროები */}
                {isExpanded && (
                  <div style={{ background: '#fafbfc', padding: '24px', borderTop: '1px solid #eee' }}>
                    <div style={{ fontWeight: '600', marginBottom: '16px', color: '#444', fontSize: '14px' }}>
                      გაჩერებების ჩამონათვალი
                    </div>
                    <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', gap: '30px', alignItems: 'center', minWidth: 'max-content' }}>
                        {fullStopsList.map((stop, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '14px', fontWeight: '500', color: '#111', whiteSpace: 'nowrap' }}>
                                {stop.station}
                              </span>
                              <span style={{ fontSize: '13px', color: '#666', whiteSpace: 'nowrap' }}>
                                {stop.time || '—'}
                              </span>
                            </div>
                            {idx < fullStopsList.length - 1 && (
                              <span style={{ color: '#aaa', fontSize: '14px', userSelect: 'none' }}>➔</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="schedule-page-container" ref={wrapperRef}>
      <div className="schedule-content-wrapper">
        <h2 className="schedule-main-title">მატარებლის მოძრაობის განრიგი</h2>

        {/* ფილტრაციის პანელი */}
        <div className="schedule-filter-box" style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* გასვლის სადგური */}
            <div className="filter-group" style={{ position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>გასვლის სადგური</label>
              <div 
                className="filter-input-dropdown" 
                onClick={() => { setIsDepOpen(!isDepOpen); setIsArrOpen(false); setFromSearch(''); }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: '#fff' }}
              >
                <span style={{ color: departureStation ? '#111' : '#888' }}>{departureStation || 'ყველა სადგური'}</span>
                <span style={{ color: '#e30613', fontSize: '12px' }}>▼</span>
              </div>

              {isDepOpen && (
                <div className="stations-dropdown-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: '8px', marginTop: '4px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <div style={{ padding: '10px' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      placeholder="სადგურის ძებნა..."
                      value={fromSearch}
                      onChange={(e) => setFromSearch(e.target.value)}
                      autoFocus
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    <div className="station-option" onClick={() => { setDepartureStation(''); setIsDepOpen(false); }} style={{ padding: '10px 16px', cursor: 'pointer', color: '#888' }}>
                      ყველა სადგური
                    </div>
                    {filteredFromStations.map((st) => (
                      <div key={st.id} className="station-option" onClick={() => { setDepartureStation(st.name); setIsDepOpen(false); }} style={{ padding: '10px 16px', cursor: 'pointer', borderTop: '1px solid #f0f0f0' }}>
                        {st.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ჩასვლის სადგური */}
            <div className="filter-group" style={{ position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>ჩასვლის სადგური</label>
              <div 
                className="filter-input-dropdown" 
                onClick={() => { setIsArrOpen(!isArrOpen); setIsDepOpen(false); setToSearch(''); }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: '#fff' }}
              >
                <span style={{ color: arrivalStation ? '#111' : '#888' }}>{arrivalStation || 'ყველა სადგური'}</span>
                <span style={{ color: '#e30613', fontSize: '12px' }}>▼</span>
              </div>

              {isArrOpen && (
                <div className="stations-dropdown-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: '8px', marginTop: '4px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <div style={{ padding: '10px' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      placeholder="სადგურის ძებნა..."
                      value={toSearch}
                      onChange={(e) => setToSearch(e.target.value)}
                      autoFocus
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    <div className="station-option" onClick={() => { setArrivalStation(''); setIsArrOpen(false); }} style={{ padding: '10px 16px', cursor: 'pointer', color: '#888' }}>
                      ყველა სადგური
                    </div>
                    {filteredToStations.map((st) => (
                      <div key={st.id} className="station-option" onClick={() => { setArrivalStation(st.name); setIsArrOpen(false); }} style={{ padding: '10px 16px', cursor: 'pointer', borderTop: '1px solid #f0f0f0' }}>
                        {st.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              type="button" 
              className="schedule-search-btn"
              onClick={handleSearchClick}
              style={{ flex: 1, background: '#e30613', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
            >
              ძებნა
            </button>
            {(departureStation || arrivalStation) && (
              <button 
                type="button" 
                onClick={handleResetFilter}
                style={{ background: '#f0f0f0', color: '#333', border: 'none', padding: '14px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
              >
                ფილტრის გასუფთავება
              </button>
            )}
          </div>
        </div>

        {/* ცხრილები */}
        <div className="schedule-table-section">
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px' }}>იტვირთება რეისები...</p>
          ) : (
            <>
              {renderTable("მაგისტრალური მატარებლები", magistralTrips)}
              {renderTable("საგარეუბნო მატარებლები", suburbanTrips)}
              {renderTable("საერთაშორისო მატარებლები", internationalTrips)}

              {trips.length === 0 && (
                <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>მოცემული სადგურებით რეისები ვერ მოიძებნა.</p>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}