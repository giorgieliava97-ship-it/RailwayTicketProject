import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './SearchResultsPage.css';

const GEORGIAN_MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
const WEEKDAYS = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი'];

function formatDateShort(dateObj) {
  if (!dateObj) return '';
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yy = String(dateObj.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

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

function getStationTime(trip, stationName) {
  if (!trip || !stationName) return '';
  const sLower = stationName.toLowerCase();
  
  if (trip.departure_station?.name?.toLowerCase().includes(sLower)) {
    return trip.departure_time ? trip.departure_time.slice(11, 16) : '';
  }
  if (trip.arrival_station?.name?.toLowerCase().includes(sLower)) {
    return trip.arrival_time ? trip.arrival_time.slice(11, 16) : '';
  }
  const foundStop = (trip.stops || []).find(s => {
    const sName = s.station || s.station_name || s.name || '';
    return sName.toLowerCase().includes(sLower);
  });
  if (foundStop) {
    const t = foundStop.time || '';
    return t.length > 5 ? t.slice(11, 16) : t;
  }
  return '';
}

function getSegmentTimes(trip, depQuery, arrQuery) {
  const fallbackDep = trip?.departure_time ? trip.departure_time.slice(11, 16) : '';
  const fallbackArr = trip?.arrival_time ? trip.arrival_time.slice(11, 16) : '';
  return {
    dep: trip?.segment?.board_time || getStationTime(trip, depQuery) || fallbackDep,
    arr: trip?.segment?.leave_time || getStationTime(trip, arrQuery) || fallbackArr,
    depStation: trip?.segment?.board_station || depQuery,
    arrStation: trip?.segment?.leave_station || arrQuery,
  };
}

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const depQuery = searchParams.get('departure_station') || '';
  const arrQuery = searchParams.get('arrival_station') || '';
  const dateQuery = searchParams.get('date') || '';
  const returnDateQuery = searchParams.get('return_date') || '';

  const [outboundTrips, setOutboundTrips] = useState([]);
  const [returnTrips, setReturnTrips] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromCity, setFromCity] = useState(depQuery);
  const [toCity, setToCity] = useState(arrQuery);
  
  const [departureDate, setDepartureDate] = useState(() => {
    if (dateQuery) {
      const parts = dateQuery.split('-');
      if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
  });

  const [returnDate, setReturnDate] = useState(() => {
    if (returnDateQuery) {
      const parts = returnDateQuery.split('-');
      if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
  });
  
  const [openDropdown, setOpenDropdown] = useState(null);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');

  // 🟢 ვირჩევთ მხოლოდ ერთ აქტიურ რეისს (წასვლისას ან დაბრუნებისას, რომელზეც ახლა ვყიდულობთ ბილეთს)
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedClass, setSelectedClass] = useState('SECOND');
  const [selectionType, setSelectionType] = useState('manual');

  const [showNoTripModal, setShowNoTripModal] = useState(false);
  const wrapperRef = useRef(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwap = () => {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  };

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/stations/')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.results || []);
        setStations(list.sort((a, b) => a.name.localeCompare(b.name, 'ka')));
      })
      .catch(err => console.error("Error fetching stations:", err));

    fetchTripsAndHandle(depQuery, arrQuery, dateQuery, returnDateQuery);
  }, [searchParams]);

  const fetchTripsAndHandle = (dep, arr, depDate, retDate) => {
    setLoading(true);

    let outboundUrl = `http://127.0.0.1:8000/api/trips/?`;
    const outParams = new URLSearchParams();
    if (dep) outParams.append('departure_station', dep);
    if (arr) outParams.append('arrival_station', arr);
    if (depDate) outParams.append('date', depDate);

    const fetchOutbound = fetch(outboundUrl + outParams.toString()).then(res => res.json());

    let fetchReturn = Promise.resolve([]);
    if (retDate && dep && arr) {
      let returnUrl = `http://127.0.0.1:8000/api/trips/?`;
      const retParams = new URLSearchParams();
      retParams.append('departure_station', arr);
      retParams.append('arrival_station', dep);
      retParams.append('date', retDate);
      fetchReturn = fetch(returnUrl + retParams.toString()).then(res => res.json());
    }

    Promise.all([fetchOutbound, fetchReturn])
      .then(([outData, retData]) => {
        setLoading(false);
        setOutboundTrips(outData);
        setReturnTrips(retData);
        if (outData.length === 0 && retData.length === 0) setShowNoTripModal(true);
      })
      .catch(err => {
        console.error("Error fetching trips:", err);
        setLoading(false);
      });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    let depDateStr = departureDate ? `${departureDate.getFullYear()}-${String(departureDate.getMonth() + 1).padStart(2, '0')}-${String(departureDate.getDate()).padStart(2, '0')}` : '';
    let retDateStr = returnDate ? `${returnDate.getFullYear()}-${String(returnDate.getMonth() + 1).padStart(2, '0')}-${String(returnDate.getDate()).padStart(2, '0')}` : '';

    let url = `/search?departure_station=${encodeURIComponent(fromCity)}&arrival_station=${encodeURIComponent(toCity)}&date=${depDateStr}`;
    if (retDateStr) url += `&return_date=${retDateStr}`;
    navigate(url);
  };

  const classConfig = {
    SECOND: { name: 'II კლასი' },
    FIRST: { name: 'I კლასი' },
    BUSINESS: { name: 'Business class' }
  };

  // 🟢 როდესაც აჭერს გაგრძელებას, გადაჰყავს ზუსტად იმ ერთ არჩეულ რეისზე
  const handleContinue = () => {
    if (!selectedTrip) {
      alert("გთხოვთ აირჩიოთ რეისი!");
      return;
    }

    const isReturnTrip = returnTrips.some(t => t.id === selectedTrip.id);
    const currentDep = isReturnTrip ? arrQuery : depQuery;
    const currentArr = isReturnTrip ? depQuery : arrQuery;

    let url = `/seat-map?tripId=${selectedTrip.id}&class=${selectedClass}&dep=${currentDep}&arr=${currentArr}`;
    if (selectionType === 'auto') {
      url = `/auto-booking?tripId=${selectedTrip.id}&class=${selectedClass}&dep=${currentDep}&arr=${currentArr}`;
    }

    navigate(url);
  };

  const selectedTimes = selectedTrip ? getSegmentTimes(selectedTrip, returnTrips.some(t => t.id === selectedTrip?.id) ? arrQuery : depQuery, returnTrips.some(t => t.id === selectedTrip?.id) ? depQuery : arrQuery) : null;

  const filteredFromStations = stations.filter(st => st.name.toLowerCase().startsWith(fromSearch.toLowerCase()));
  const filteredToStations = stations.filter(st => st.name.toLowerCase().startsWith(toSearch.toLowerCase()));

  const renderCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`empty-${i}`} className="cal-day empty"></div>);
    }

    const minSelectableDate = openDropdown === 'returnDate' && departureDate ? departureDate : today;

    for (let day = 1; day <= daysInMonth; day++) {
      const currentCellDate = new Date(year, month, day);
      currentCellDate.setHours(0, 0, 0, 0);

      const isDisabled = currentCellDate < minSelectableDate;
      const activeSelectedDate = openDropdown === 'returnDate' ? returnDate : departureDate;
      const isSelected = activeSelectedDate && currentCellDate.getTime() === activeSelectedDate.getTime();

      cells.push(
        <div
          key={day}
          className={`cal-day-cell ${isDisabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => {
            if (isDisabled) return;
            if (openDropdown === 'departDate') {
              setDepartureDate(currentCellDate);
              if (returnDate && returnDate < currentCellDate) setReturnDate(null);
            } else if (openDropdown === 'returnDate') {
              setReturnDate(currentCellDate);
            }
            setOpenDropdown(null);
          }}
        >
          {day}
        </div>
      );
    }
    return cells;
  };

  return (
    <div className="search-results-page" ref={wrapperRef}>
      <style>{`
        .search-input-box:hover .hover-clear-btn,
        .search-dropdown-col:hover .hover-clear-btn { display: inline-block !important; }
        .hover-clear-btn { display: none; background: transparent; border: none; cursor: pointer; font-size: 13px; color: #888; padding: 0 4px; }
        .hover-clear-btn:hover { color: #e30613; }
      `}</style>
      
      <Navbar />

      <main className="search-results-content">
        
        {/* სერჩბარი */}
        <div className="search-bar-top-card">
          <form onSubmit={handleSearchSubmit} className="search-bar-top-form">
            <div className="search-dropdown-col" style={{ position: 'relative' }}>
              <div className="search-input-box" onClick={() => { setOpenDropdown(openDropdown === 'from' ? null : 'from'); setFromSearch(''); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📍</span>
                  <span className={fromCity ? '' : 'placeholder-text'}>{fromCity || 'საიდან'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {fromCity && <button type="button" className="hover-clear-btn" onClick={(e) => { e.stopPropagation(); setFromCity(''); }}>✕</button>}
                  <span className="dropdown-arrow">▾</span>
                </div>
              </div>
              {openDropdown === 'from' && (
                <div className="search-dropdown-list">
                  <div className="dropdown-search-input-wrap" onClick={e => e.stopPropagation()}>
                    <input type="text" placeholder="სადგურის ძებნა..." value={fromSearch} onChange={e => setFromSearch(e.target.value)} autoFocus />
                  </div>
                  <div onClick={() => { setFromCity(''); setOpenDropdown(null); }} className="dropdown-option text-muted">ყველა სადგური</div>
                  {filteredFromStations.map(st => (
                    <div key={st.id} onClick={() => { setFromCity(st.name); setOpenDropdown(null); }} className="dropdown-option">{st.name}</div>
                  ))}
                </div>
              )}
            </div>

            <button type="button" className="results-swap-btn" onClick={handleSwap} title="მიმართულების შეცვლა">
              ⟳
            </button>

            <div className="search-dropdown-col" style={{ position: 'relative' }}>
              <div className="search-input-box" onClick={() => { setOpenDropdown(openDropdown === 'to' ? null : 'to'); setToSearch(''); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎯</span>
                  <span className={toCity ? '' : 'placeholder-text'}>{toCity || 'სად'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {toCity && <button type="button" className="hover-clear-btn" onClick={(e) => { e.stopPropagation(); setToCity(''); }}>✕</button>}
                  <span className="dropdown-arrow">▾</span>
                </div>
              </div>
              {openDropdown === 'to' && (
                <div className="search-dropdown-list">
                  <div className="dropdown-search-input-wrap" onClick={e => e.stopPropagation()}>
                    <input type="text" placeholder="სადგურის ძებნა..." value={toSearch} onChange={e => setToSearch(e.target.value)} autoFocus />
                  </div>
                  <div onClick={() => { setToCity(''); setOpenDropdown(null); }} className="dropdown-option text-muted">ყველა სადგური</div>
                  {filteredToStations.map(st => (
                    <div key={st.id} onClick={() => { setToCity(st.name); setOpenDropdown(null); }} className="dropdown-option">{st.name}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="search-dropdown-col" style={{ position: 'relative' }}>
              <div className="search-input-box" onClick={() => { const base = departureDate || today; setViewDate(new Date(base.getFullYear(), base.getMonth(), 1)); setOpenDropdown(openDropdown === 'departDate' ? null : 'departDate'); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span>
                  <span>{departureDate ? formatDateShort(departureDate) : 'გამგზავრება'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {departureDate && <button type="button" className="hover-clear-btn" onClick={(e) => { e.stopPropagation(); setDepartureDate(null); }}>✕</button>}
                  <span className="dropdown-arrow">▾</span>
                </div>
              </div>
              {openDropdown === 'departDate' && (
                <div className="custom-calendar-box">
                  <div className="cal-nav-header">
                    <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>&lt;&lt;</button>
                    <span>{GEORGIAN_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                    <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>&gt;&gt;</button>
                  </div>
                  <div className="cal-weekdays-grid">{WEEKDAYS.map(wd => <span key={wd}>{wd}</span>)}</div>
                  <div className="cal-days-grid-box">{renderCalendarDays()}</div>
                </div>
              )}
            </div>

            <div className="search-dropdown-col" style={{ position: 'relative' }}>
              <div className="search-input-box" onClick={() => { const base = returnDate || departureDate || today; setViewDate(new Date(base.getFullYear(), base.getMonth(), 1)); setOpenDropdown(openDropdown === 'returnDate' ? null : 'returnDate'); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span>
                  <span style={{ color: returnDate ? '#222' : '#666' }}>{returnDate ? formatDateShort(returnDate) : 'დაბრუნება'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {returnDate && <button type="button" className="hover-clear-btn" onClick={(e) => { e.stopPropagation(); setReturnDate(null); }}>✕</button>}
                  <span className="dropdown-arrow">▾</span>
                </div>
              </div>
              {openDropdown === 'returnDate' && (
                <div className="custom-calendar-box">
                  <div className="cal-nav-header">
                    <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>&lt;&lt;</button>
                    <span>{GEORGIAN_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                    <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>&gt;&gt;</button>
                  </div>
                  <div className="cal-weekdays-grid">{WEEKDAYS.map(wd => <span key={wd}>{wd}</span>)}</div>
                  <div className="cal-days-grid-box">{renderCalendarDays()}</div>
                </div>
              )}
            </div>

            <button type="submit" className="search-submit-action-btn">ძებნა</button>
          </form>
        </div>

        <h2 className="results-route-title">
          {depQuery || 'ყველა სადგური'} - {arrQuery || 'ყველა სადგური'} {dateQuery && `(წასვლა: ${dateQuery})`} {returnDateQuery && `| (დაბრუნება: ${returnDateQuery})`}
        </h2>

        {loading ? (
          <p className="loading-text">იტვირთება რეისები...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selectedTrip ? '2.2fr 1fr' : '1fr', gap: '30px', alignItems: 'start' }}>
            
            {/* მარცხენა მხარე: წასვლის და დაბრუნების რეისები */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* წასვლის რეისები */}
              <div className="trip-section-block">
                <h3 className="section-subtitle">🚂 წასვლის რეისები ({depQuery} ➔ {arrQuery})</h3>
                <div className="trips-list-container">
                  {outboundTrips.length > 0 ? (
                    outboundTrips.map(trip => {
                      const { dep: segmentDepTime, arr: segmentArrTime, depStation: segDepName, arrStation: segArrName } = getSegmentTimes(trip, depQuery, arrQuery);
                      const durationStr = calculateDuration(segmentDepTime, segmentArrTime);
                      const prices = trip.prices || { SECOND: 35, FIRST: 75, BUSINESS: 125 };
                      const isSelected = selectedTrip?.id === trip.id;
                      const availableSeatsMap = trip.class_available_seats || { SECOND: 0, FIRST: 0, BUSINESS: 0 };
                      
                      return (
                        <div key={trip.id} style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '15px' }}>
                          {!isSelected ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 'bold', color: '#222', fontSize: '15px', marginBottom: '6px' }}>
                                  <span style={{ color: '#e30613', marginRight: '8px' }}>№{trip.train?.train_number}</span> {trip.route}
                                </div>
                                <div style={{ fontSize: '14px', color: '#555' }}>
                                  გასვლა: <b>{segmentDepTime}</b> | მოსვლა: <b>{segmentArrTime}</b>
                                </div>
                              </div>
                              <button 
                                onClick={() => setSelectedTrip(trip)}
                                style={{ background: '#222', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                არჩევა
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <div style={{ fontWeight: 'bold', color: '#e30613', fontSize: '16px' }}>
                                  №{trip.train?.train_number} {trip.route} (არჩეულია)
                                </div>
                                <button 
                                  onClick={() => setSelectedTrip(null)}
                                  style={{ background: '#e30613', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  შეცვლა
                                </button>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', background: '#f8f9fa', padding: '12px 20px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#222' }}>
                                  <span style={{ color: '#e30613' }}>📍</span> {segmentDepTime} {segDepName}
                                </div>
                                <div style={{ background: '#e2e8f0', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', color: '#444' }}>
                                  ⏱ {durationStr}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#222' }}>
                                  <span style={{ color: '#e30613' }}>📍</span> {segmentArrTime} {segArrName}
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                {Object.entries(prices).map(([classKey, price]) => {
                                  const isClassSelected = selectedClass === classKey;
                                  const label = classConfig[classKey]?.name || classKey;
                                  const seatsCount = availableSeatsMap[classKey] ?? 0;

                                  return (
                                    <div 
                                      key={classKey}
                                      onClick={() => setSelectedClass(classKey)}
                                      style={{
                                        border: isClassSelected ? '2px solid #e30613' : '1px solid #ddd',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        cursor: 'pointer',
                                        background: isClassSelected ? '#fff5f5' : '#fff',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#222' }}>{label}</span>
                                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#e30613' }}>{price} ₾</span>
                                      </div>
                                      <div style={{ fontSize: '12px', color: seatsCount > 0 ? '#666' : '#e30613', fontWeight: seatsCount > 0 ? 'normal' : 'bold' }}>
                                        {seatsCount > 0 ? `დარჩენილია ${seatsCount} ადგილი` : 'ადგილები არ არის'}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="no-trips-text">წასვლის მიმართულებით რეისები არ მოიძებნა არჩეულ თარიღზე.</p>
                  )}
                </div>
              </div>

              {/* დაბრუნების რეისები */}
              {returnDateQuery && (
                <div className="trip-section-block" style={{ marginTop: '20px' }}>
                  <h3 className="section-subtitle">🔄 დაბრუნების რეისები ({arrQuery} ➔ {depQuery})</h3>
                  <div className="trips-list-container">
                    {returnTrips.length > 0 ? (
                      returnTrips.map(trip => {
                        const { dep: segmentDepTime, arr: segmentArrTime, depStation: segDepName, arrStation: segArrName } = getSegmentTimes(trip, arrQuery, depQuery);
                        const durationStr = calculateDuration(segmentDepTime, segmentArrTime);
                        const prices = trip.prices || { SECOND: 35, FIRST: 75, BUSINESS: 125 };
                        const isSelected = selectedTrip?.id === trip.id;
                        const availableSeatsMap = trip.class_available_seats || { SECOND: 0, FIRST: 0, BUSINESS: 0 };
                        
                        return (
                          <div key={trip.id} style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '15px' }}>
                            {!isSelected ? (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontWeight: 'bold', color: '#222', fontSize: '15px', marginBottom: '6px' }}>
                                    <span style={{ color: '#e30613', marginRight: '8px' }}>№{trip.train?.train_number}</span> {trip.route}
                                  </div>
                                  <div style={{ fontSize: '14px', color: '#555' }}>
                                    გასვლა: <b>{segmentDepTime}</b> | მოსვლა: <b>{segmentArrTime}</b>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setSelectedTrip(trip)}
                                  style={{ background: '#222', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  არჩევა
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                  <div style={{ fontWeight: 'bold', color: '#e30613', fontSize: '16px' }}>
                                    №{trip.train?.train_number} {trip.route} (არჩეულია)
                                  </div>
                                  <button 
                                    onClick={() => setSelectedTrip(null)}
                                    style={{ background: '#e30613', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                  >
                                    შეცვლა
                                  </button>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', background: '#f8f9fa', padding: '12px 20px', borderRadius: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#222' }}>
                                    <span style={{ color: '#e30613' }}>📍</span> {segmentDepTime} {segDepName}
                                  </div>
                                  <div style={{ background: '#e2e8f0', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', color: '#444' }}>
                                    ⏱ {durationStr}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#222' }}>
                                    <span style={{ color: '#e30613' }}>📍</span> {segmentArrTime} {segArrName}
                                  </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                  {Object.entries(prices).map(([classKey, price]) => {
                                    const isClassSelected = selectedClass === classKey;
                                    const label = classConfig[classKey]?.name || classKey;
                                    const seatsCount = availableSeatsMap[classKey] ?? 0;

                                    return (
                                      <div 
                                        key={classKey}
                                        onClick={() => setSelectedClass(classKey)}
                                        style={{
                                          border: isClassSelected ? '2px solid #e30613' : '1px solid #ddd',
                                          borderRadius: '8px',
                                          padding: '16px',
                                          cursor: 'pointer',
                                          background: isClassSelected ? '#fff5f5' : '#fff',
                                          transition: 'all 0.2s'
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                          <span style={{ fontWeight: '600', fontSize: '14px', color: '#222' }}>{label}</span>
                                          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#e30613' }}>{price} ₾</span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: seatsCount > 0 ? '#666' : '#e30613', fontWeight: seatsCount > 0 ? 'normal' : 'bold' }}>
                                          {seatsCount > 0 ? `დარჩენილია ${seatsCount} ადგილი` : 'ადგილები არ არის'}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="no-trips-text">დაბრუნების მიმართულებით რეისები არ მოიძებნა არჩეულ თარიღზე.</p>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* მარჯვენა მხარე: შერჩეული ბილეთი (მხოლოდ ერთი აქტიური რეისი) */}
            {selectedTrip && (
              <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #eee', position: 'sticky', top: '20px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', color: '#e30613', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                  შერჩეული ბილეთი
                </h3>

                <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                  <div style={{ fontWeight: 'bold', color: '#222', marginBottom: '8px' }}>
                    №{selectedTrip.train?.train_number} {selectedTrip.route}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: '#e30613' }}>📍</span> <b>{selectedTimes.dep}</b> {selectedTimes.depStation}
                  </div>
                  <div style={{ paddingLeft: '10px', borderLeft: '2px dotted #ccc', margin: '4px 0 4px 6px', color: '#666', fontSize: '12px' }}>
                    ⏱ {calculateDuration(selectedTimes.dep, selectedTimes.arr)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#e30613' }}>📍</span> <b>{selectedTimes.arr}</b> {selectedTimes.arrStation}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                    <input 
                      type="radio" 
                      name="seatSelection" 
                      checked={selectionType === 'auto'} 
                      onChange={() => setSelectionType('auto')} 
                      style={{ accentColor: '#e30613', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontWeight: '500' }}>ავტომატური შერჩევა</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                    <input 
                      type="radio" 
                      name="seatSelection" 
                      checked={selectionType === 'manual'} 
                      onChange={() => setSelectionType('manual')} 
                      style={{ accentColor: '#e30613', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontWeight: '500' }}>ადგილების არჩევა*</span>
                  </label>
                  <div style={{ fontSize: '11px', color: '#888', paddingLeft: '26px', marginTop: '-10px' }}>
                    *ერთი ადგილის არჩევა ღირებულებას ამატებს 1 ლარს.
                  </div>
                </div>

                <button 
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
                    cursor: 'pointer'
                  }}
                >
                  გაგრძელება
                </button>
              </div>
            )}

          </div>
        )}
      </main>

      {showNoTripModal && (
        <div className="modal-backdrop-overlay">
          <div className="modal-content-box">
            <button onClick={() => setShowNoTripModal(false)} className="modal-close-x">✕</button>
            <p className="modal-text-msg">მითითებული რეისი არ არსებობს. გთხოვთ, გადაამოწმოთ არჩეული სადგურები და თარიღი.</p>
            <button onClick={() => setShowNoTripModal(false)} className="modal-action-btn">დახურვა</button>
          </div>
        </div>
      )}
    </div>
  );
}