import { useState, useEffect, useRef } from 'react';
import './SearchBar.css';
import { useNavigate } from 'react-router-dom';

const GEORGIAN_MONTHS = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
];
const WEEKDAYS = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი'];

function formatDateShort(dateObj) {
  if (!dateObj) return '';
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yy = String(dateObj.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

export default function SearchBar({ stations, fromCity, setFromCity, toCity, setToCity, departureDate, setDepartureDate, returnDate, setReturnDate }) {
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
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
          className={`cal-day ${isDisabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => {
            if (isDisabled) return;
            if (openDropdown === 'departDate') {
              setDepartureDate(currentCellDate);
              if (returnDate && returnDate < currentCellDate) {
                setReturnDate(null);
              }
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

  const canGoPrevMonth = viewDate.getFullYear() > today.getFullYear() || viewDate.getMonth() > today.getMonth();

  const filteredFromStations = stations.filter(st => 
    st.name.toLowerCase().startsWith(fromSearch.toLowerCase()) || 
    st.code.toLowerCase().startsWith(fromSearch.toLowerCase())
  );

  const filteredToStations = stations.filter(st => 
    st.name.toLowerCase().startsWith(toSearch.toLowerCase()) || 
    st.code.toLowerCase().startsWith(toSearch.toLowerCase())
  );
  
  const handleSearch = (e) => {
    e.preventDefault();
    
    let dateStr = '';
    if (departureDate) {
      const year = departureDate.getFullYear();
      const month = String(departureDate.getMonth() + 1).padStart(2, '0');
      const day = String(departureDate.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }

    let returnDateStr = '';
    if (returnDate) {
      const year = returnDate.getFullYear();
      const month = String(returnDate.getMonth() + 1).padStart(2, '0');
      const day = String(returnDate.getDate()).padStart(2, '0');
      returnDateStr = `${year}-${month}-${day}`;
    }

    let url = `/search?departure_station=${encodeURIComponent(fromCity)}&arrival_station=${encodeURIComponent(toCity)}&date=${dateStr}`;
    if (returnDateStr) {
      url += `&return_date=${returnDateStr}`;
    }

    navigate(url);
  };

  return (
    <div className="search-bar-wrapper" ref={wrapperRef}>
      <style>{`
        .input-box:hover .hover-clear-btn,
        .date-half:hover .hover-clear-btn {
          display: inline-block !important;
        }
      `}</style>

      <div className="search-bar-card">
        
        {/* 1. საიდან და სად */}
        <div className="station-group">
          {/* საიდან */}
          <div className="station-col">
            <div
              className={`input-box ${openDropdown === 'from' ? 'active' : ''}`}
              onClick={() => { setOpenDropdown(openDropdown === 'from' ? null : 'from'); setFromSearch(''); }}
            >
              <div className="input-box-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 8 16 12 12 16"></polyline>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <span style={{ color: '#ccc', margin: '0 2px' }}>|</span>
                <span className={fromCity ? '' : 'input-box-placeholder'}>
                  {fromCity || 'საიდან'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {fromCity && (
                  <button
                    type="button"
                    className="hover-clear-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFromCity('');
                    }}
                    style={{
                      display: 'none',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#888',
                      padding: '0 2px'
                    }}
                    title="გასუფთავება"
                  >
                    ✕
                  </button>
                )}
                <span style={{ color: '#e30613', fontSize: '12px' }}>▾</span>
              </div>
            </div>

            <div className="quick-cities">
              {['თბილისი', 'ბათუმი', 'ზუგდიდი'].map((city) => (
                <button key={city} type="button" className="quick-city-btn" onClick={() => setFromCity(city)}>
                  {city}
                </button>
              ))}
            </div>

            {openDropdown === 'from' && (
              <div className="station-dropdown">
                <div className="station-search-box" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="სადგურის ძებნა..."
                    value={fromSearch}
                    onChange={(e) => setFromSearch(e.target.value)}
                    className="station-search-input"
                    autoFocus
                    style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
                <div className="station-option" onClick={() => { setFromCity(''); setOpenDropdown(null); }}>
                  <span style={{ color: '#888' }}>ყველა სადგური</span>
                </div>
                {filteredFromStations.map((st) => (
                  <div
                    key={st.id}
                    className="station-option"
                    onClick={() => { setFromCity(st.name); setOpenDropdown(null); }}
                  >
                    <span>{st.name}</span>
                    <small style={{ color: '#888' }}>{st.code}</small>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* შეტრიალების ღილაკი */}
          <button type="button" className="swap-btn" onClick={handleSwap} title="მიმართულების შეცვლა">
            ⟳
          </button>

          {/* სად */}
          <div className="station-col">
            <div
              className={`input-box ${openDropdown === 'to' ? 'active' : ''}`}
              onClick={() => { setOpenDropdown(openDropdown === 'to' ? null : 'to'); setToSearch(''); }}
            >
              <div className="input-box-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span className={toCity ? '' : 'input-box-placeholder'}>
                  {toCity || 'სად'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {toCity && (
                  <button
                    type="button"
                    className="hover-clear-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setToCity('');
                    }}
                    style={{
                      display: 'none',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#888',
                      padding: '0 2px'
                    }}
                    title="გასუფთავება"
                  >
                    ✕
                  </button>
                )}
                <span style={{ color: '#e30613', fontSize: '12px' }}>▾</span>
              </div>
            </div>
            
            <div className="quick-cities">
              {['ბათუმი', 'თბილისი', 'ზუგდიდი'].map((city) => (
                <button key={city} type="button" className="quick-city-btn" onClick={() => setToCity(city)}>
                  {city}
                </button>
              ))}
            </div>

            {openDropdown === 'to' && (
              <div className="station-dropdown">
                <div className="station-search-box" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="სადგურის ძებნა..."
                    value={toSearch}
                    onChange={(e) => setToSearch(e.target.value)}
                    className="station-search-input"
                    autoFocus
                    style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
                <div className="station-option" onClick={() => { setToCity(''); setOpenDropdown(null); }}>
                  <span style={{ color: '#888' }}>ყველა სადგური</span>
                </div>
                {filteredToStations.map((st) => (
                  <div
                    key={st.id}
                    className="station-option"
                    onClick={() => { setToCity(st.name); setOpenDropdown(null); }}
                  >
                    <span>{st.name}</span>
                    <small style={{ color: '#888' }}>{st.code}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. თარიღები */}
        <div className="dates-group">
          <div className="dates-box">
            {/* გამგზავრების თარიღი */}
            <div
              className="date-half"
              onClick={() => {
                const base = departureDate || today;
                setViewDate(new Date(base.getFullYear(), base.getMonth(), 1));
                setOpenDropdown(openDropdown === 'departDate' ? null : 'departDate');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📅</span>
                <span>{departureDate ? formatDateShort(departureDate) : 'გამგზავრება'}</span>
              </div>
              {departureDate && (
                <button
                  type="button"
                  className="hover-clear-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDepartureDate(null);
                  }}
                  style={{
                    display: 'none',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#888',
                    padding: '0 2px'
                  }}
                  title="გასუფთავება"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="date-divider"></div>

            {/* დაბრუნების თარიღი */}
            <div
              className="date-half"
              onClick={() => {
                const base = returnDate || departureDate || today;
                setViewDate(new Date(base.getFullYear(), base.getMonth(), 1));
                setOpenDropdown(openDropdown === 'returnDate' ? null : 'returnDate');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📅</span>
                <span style={{ color: returnDate ? '#222' : '#666', fontWeight: returnDate ? '600' : '500' }}>
                  {returnDate ? formatDateShort(returnDate) : 'დაბრუნება'}
                </span>
              </div>
              {returnDate && (
                <button
                  type="button"
                  className="hover-clear-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReturnDate(null);
                  }}
                  style={{
                    display: 'none',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#888',
                    padding: '0 2px'
                  }}
                  title="გასუფთავება"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {(openDropdown === 'departDate' || openDropdown === 'returnDate') && (
            <div className="calendar-popup">
              <div className="calendar-header">
                <button
                  type="button"
                  className="cal-nav-btn"
                  disabled={!canGoPrevMonth}
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                >
                  &#10094;
                </button>
                <span>
                  {GEORGIAN_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                </span>
                <button
                  type="button"
                  className="cal-nav-btn"
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                >
                  &#10095;
                </button>
              </div>

              <div className="calendar-weekdays">
                {WEEKDAYS.map((wd) => (
                  <div key={wd}>{wd}</div>
                ))}
              </div>

              <div className="calendar-days">{renderCalendarDays()}</div>
            </div>
          )}
        </div>

        {/* 3. ძებნის ღილაკი */}
        <button 
          type="button" 
          className="search-submit-btn"
          onClick={handleSearch}
        >
          ძებნა
        </button>

      </div>
    </div>
  );
}