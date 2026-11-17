"""
რეისის მარშრუტის, სეგმენტისა და ფასის გამოთვლის ერთიანი ლოგიკა.

ერთი წყარო models / serializers / views-ისთვის, რომ ძებნა, ფასი, ადგილების რუკა და
ბილეთის ვალიდაცია ყოველთვის ერთსა და იმავე სეგმენტს ითვლიდეს.
"""
import math
import re
import unicodedata
from datetime import datetime, time, timedelta
from fractions import Fraction

from django.utils import timezone

# II კლასზე დამატება I კლასისთვის და I კლასზე დამატება Business-ისთვის (₾)
FIRST_CLASS_SURCHARGE = 40
BUSINESS_CLASS_SURCHARGE = 50

_HHMM_RE = re.compile(r'(\d{1,2}):(\d{2})')


def normalize_display(val):
    """NFC + strip (სახელის ჩვენებისთვის, რეგისტრი უცვლელი)."""
    if not val:
        return ""
    return unicodedata.normalize('NFC', str(val)).strip()


def normalize_station_name(name):
    """შესადარებელი ფორმა: NFC + strip + lower."""
    return normalize_display(name).lower()


def parse_hhmm(value):
    """'11:28', '11:28:00' ან ISO datetime სტრიქონიდან აბრუნებს (საათი, წუთი) ან None."""
    if not value:
        return None
    m = _HHMM_RE.search(str(value))
    if not m:
        return None
    hour, minute = int(m.group(1)), int(m.group(2))
    if hour > 23 or minute > 59:
        return None
    return hour, minute


def build_full_route(departure_time, arrival_time, dep_name, arr_name, stops):
    """
    აბრუნებს [{'station': str, 'time': aware datetime}, ...] — საწყისი, შუალედური, ბოლო სადგური.

    მთავარი წესი: stops-ში "HH:MM" არის ადგილობრივი (settings.TIME_ZONE) დრო, ხოლო
    departure_time/arrival_time ბაზიდან UTC-ში მოდის. ამიტომ თარიღი და დრო ვაწყობთ
    ადგილობრივ ზონაში და მხოლოდ შემდეგ ვაქცევთ aware datetime-ად.
    დროები გარანტირებულად არაკლებადია (შუაღამის გადაცდენა სწორად მუშაობს).
    """
    aware_mode = timezone.is_aware(departure_time)
    tz = timezone.get_current_timezone() if aware_mode else None

    def make(naive):
        return timezone.make_aware(naive, tz) if aware_mode else naive

    local_dep = timezone.localtime(departure_time, tz) if aware_mode else departure_time
    base_date = local_dep.date()

    route = [{'station': normalize_display(dep_name), 'time': departure_time}]
    prev = departure_time

    for s in (stops or []):
        if not isinstance(s, dict):
            continue
        name = normalize_display(s.get('station') or s.get('station_name') or s.get('name') or '')
        parsed = parse_hhmm(s.get('time'))
        if not name or parsed is None:
            continue

        naive = datetime.combine(base_date, time(parsed[0], parsed[1]))
        stop_dt = make(naive)
        while stop_dt < prev:                      # შუაღამის გადაცდენა
            naive += timedelta(days=1)
            stop_dt = make(naive)

        route.append({'station': name, 'time': stop_dt})
        prev = stop_dt

    arr_dt = arrival_time
    if arr_dt <= departure_time:
        arr_dt += timedelta(days=1)
    while arr_dt < prev:
        arr_dt += timedelta(days=1)
    route.append({'station': normalize_display(arr_name), 'time': arr_dt})
    return route


def _match_indices(names, query):
    """ჯერ ზუსტი დამთხვევა; თუ არ არის — შემცველობით (ორივე მიმართულებით)."""
    exact = [i for i, n in enumerate(names) if n == query]
    if exact:
        return exact
    return [i for i, n in enumerate(names) if n and (query in n or n in query)]


def find_segment_indices(route, dep_query, arr_query):
    """
    აბრუნებს (board_idx, leave_idx) ან None.
    ორივე მითითებულია  -> პირველი წყვილი, სადაც ჩასხდომა მკაცრად ადრეა ჩამოსხდომაზე
    მხოლოდ dep         -> dep-იდან მარშრუტის ბოლომდე
    მხოლოდ arr         -> მარშრუტის დასაწყისიდან arr-მდე
    არცერთი            -> მთლიანი რეისი
    """
    names = [normalize_station_name(r['station']) for r in route]
    last = len(names) - 1
    d = normalize_station_name(dep_query)
    a = normalize_station_name(arr_query)

    if d and a:
        for i in _match_indices(names, d):
            for j in _match_indices(names, a):
                if j > i:
                    return i, j
        return None
    if d:
        idx = _match_indices(names, d)
        return (idx[0], last) if idx else None
    if a:
        idx = _match_indices(names, a)
        return (0, idx[-1]) if idx else None
    return 0, last


def segment_seconds(route, board_idx, leave_idx):
    """(სეგმენტის წამები, მთლიანი რეისის წამები). არასწორი სეგმენტი -> მთლიანი რეისი."""
    total = int((route[-1]['time'] - route[0]['time']).total_seconds())
    seg = int((route[leave_idx]['time'] - route[board_idx]['time']).total_seconds())
    if total <= 0:
        return 1, 1
    if seg <= 0 or seg > total:
        seg = total
    return seg, total


def prorated_price(full_price, seg_seconds, total_seconds):
    """ზუსტი (float-ის შეცდომების გარეშე) პროპორცია, დამრგვალება ზევით ლარამდე."""
    return int(math.ceil(Fraction(str(full_price)) * seg_seconds / total_seconds))


def full_class_prices(base_price):
    base = Fraction(str(base_price))
    return {
        'SECOND': base,
        'FIRST': base + FIRST_CLASS_SURCHARGE,
        'BUSINESS': base + FIRST_CLASS_SURCHARGE + BUSINESS_CLASS_SURCHARGE,
    }


def class_prices(base_price, seg_seconds, total_seconds):
    return {
        k: int(math.ceil(v * seg_seconds / total_seconds))
        for k, v in full_class_prices(base_price).items()
    }
