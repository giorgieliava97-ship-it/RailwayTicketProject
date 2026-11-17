"""
ვაგონების სტრუქტურისა და ადგილების მატრიცის გენერაციის უტილიტები.
უზრუნველყოფს გაშლილ, სიმეტრიულ და ჰორიზონტალურ განლაგებას ყველა ვაგონში.
"""

"""
ვაგონების სტრუქტურისა და ადგილების მატრიცის გენერაციის უტილიტები.
"""

def generate_wagon_layout(train, wagon_number=1, booked_seats=None):
    if booked_seats is None:
        booked_seats = set()

    train_num = str(train.train_number).strip()
    is_express = train_num in ['801', '802', '803', '804']

    if is_express:
        floors = _generate_2_story_express_layout(wagon_number)
    else:
        floors = _generate_1_story_standard_layout(wagon_number)

    layout_data = {
        "wagon_number": wagon_number,
        "layout": {
            "floors": floors
        }
    }

    return _apply_booked_status(layout_data, booked_seats)


def _generate_2_story_express_layout(wagon_number):
    if wagon_number == 1:
        upper_rows = [
            [
                {"type": "element", "name": "luggage", "label": "ბარგი"},
                {"type": "element", "name": "food", "label": "საკვები"},
                {"type": "seat", "number": 1, "class": "BUSINESS", "status": "available"},
                {"type": "seat", "number": 2, "class": "BUSINESS", "status": "available"},
                {"type": "empty"},
                {"type": "seat", "number": 3, "class": "BUSINESS", "status": "available"},
                {"type": "seat", "number": 4, "class": "BUSINESS", "status": "available"},
            ],
            [
                {"type": "empty"}, {"type": "empty"},
                {"type": "seat", "number": 5, "class": "BUSINESS", "status": "available"},
                {"type": "seat", "number": 6, "class": "BUSINESS", "status": "available"},
                {"type": "empty"},
                {"type": "seat", "number": 7, "class": "BUSINESS", "status": "available"},
                {"type": "seat", "number": 8, "class": "BUSINESS", "status": "available"},
            ],
            [
                {"type": "empty"}, {"type": "empty"},
                {"type": "seat", "number": 9, "class": "BUSINESS", "status": "available"},
                {"type": "seat", "number": 10, "class": "BUSINESS", "status": "available"},
                {"type": "empty"},
                {"type": "seat", "number": 11, "class": "BUSINESS", "status": "available"},
                {"type": "seat", "number": 12, "class": "BUSINESS", "status": "available"},
            ],
            [
                {"type": "empty"}, {"type": "empty"},
                {"type": "seat", "number": 13, "class": "BUSINESS", "status": "available"},
                {"type": "seat", "number": 14, "class": "BUSINESS", "status": "available"},
                {"type": "empty"},
                {"type": "seat", "number": 15, "class": "BUSINESS", "status": "available"},
                {"type": "seat", "number": 16, "class": "BUSINESS", "status": "available"},
            ],
            [
                {"type": "empty"}, {"type": "empty"},
                {"type": "seat", "number": 17, "class": "BUSINESS", "status": "available"},
                {"type": "seat", "number": 18, "class": "BUSINESS", "status": "available"},
                {"type": "empty"},
                {"type": "seat", "number": 19, "class": "BUSINESS", "status": "available"},
                {"type": "seat", "number": 20, "class": "BUSINESS", "status": "available"},
            ],
            [
                {"type": "empty"}, {"type": "empty"},
                {"type": "seat", "number": 21, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 22, "class": "FIRST", "status": "available"},
                {"type": "empty"},
                {"type": "seat", "number": 23, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 24, "class": "FIRST", "status": "available"},
            ],
            [
                {"type": "empty"}, {"type": "empty"},
                {"type": "seat", "number": 25, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 26, "class": "FIRST", "status": "available"},
                {"type": "empty"},
                {"type": "seat", "number": 27, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 28, "class": "FIRST", "status": "available"},
            ]
        ]
        lower_rows = [
            [
                {"type": "empty"}, {"type": "empty"},
                {"type": "seat", "number": 29, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 30, "class": "FIRST", "status": "available"},
                {"type": "empty"},
                {"type": "seat", "number": 31, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 32, "class": "FIRST", "status": "available"},
            ],
            [
                {"type": "empty"}, {"type": "empty"},
                {"type": "seat", "number": 33, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 34, "class": "FIRST", "status": "available"},
                {"type": "empty"},
                {"type": "seat", "number": 35, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 36, "class": "FIRST", "status": "available"},
            ],
            [
                {"type": "empty"}, {"type": "empty"},
                {"type": "seat", "number": 37, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 38, "class": "FIRST", "status": "available"},
                {"type": "empty"},
                {"type": "seat", "number": 39, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 40, "class": "FIRST", "status": "available"},
            ],
            [
                {"type": "empty"}, {"type": "empty"},
                {"type": "seat", "number": 41, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 42, "class": "FIRST", "status": "available"},
                {"type": "empty"},
                {"type": "seat", "number": 43, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 44, "class": "FIRST", "status": "available"},
            ],
            [
                {"type": "empty"}, {"type": "empty"},
                {"type": "seat", "number": 45, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 46, "class": "FIRST", "status": "available"},
                {"type": "empty"},
                {"type": "seat", "number": 47, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 48, "class": "FIRST", "status": "available"},
            ],
            [
                {"type": "empty"}, {"type": "empty"},
                {"type": "seat", "number": 49, "class": "FIRST", "status": "available"},
                {"type": "seat", "number": 50, "class": "FIRST", "status": "available"},
                {"type": "empty"},
                {"type": "element", "name": "stairs", "label": "კიბე"},
                {"type": "element", "name": "wc", "label": "ტუალეტი"},
            ]
        ]
        return [
            {"floor_name": "upper", "floor_label": "I სართული", "rows": upper_rows},
            {"floor_name": "lower", "floor_label": "II სართული", "rows": lower_rows}
        ]
    else:
        start_seat = (wagon_number - 1) * 50 + 1
        upper_rows = []
        lower_rows = []
        current = start_seat
        for r in range(7):
            row_seats = []
            for c in range(4):
                if current < start_seat + 25:
                    row_seats.append({"type": "seat", "number": current, "class": "SECOND", "status": "available"})
                    current += 1
                else:
                    row_seats.append({"type": "empty"})
            upper_rows.append([
                row_seats[0], row_seats[1], {"type": "empty"}, row_seats[2], row_seats[3]
            ])
        for r in range(7):
            row_seats = []
            for c in range(4):
                if current < start_seat + 50:
                    row_seats.append({"type": "seat", "number": current, "class": "SECOND", "status": "available"})
                    current += 1
                else:
                    row_seats.append({"type": "empty"})
            lower_rows.append([
                row_seats[0], row_seats[1], {"type": "empty"}, row_seats[2], row_seats[3]
            ])
        return [
            {"floor_name": "upper", "floor_label": "I სართული", "rows": upper_rows},
            {"floor_name": "lower", "floor_label": "II სართული", "rows": lower_rows}
        ]


def _generate_1_story_standard_layout(wagon_number):
    start_seat = (wagon_number - 1) * 26 + 1
    rows = []
    current = start_seat

    for r in range(7):
        row_seats = []
        for c in range(4):
            if current <= start_seat + 25:
                seat_offset = current - start_seat

                if wagon_number == 1:
                    seat_class = "BUSINESS" if seat_offset < 10 else "FIRST"
                elif wagon_number == 2:
                    seat_class = "FIRST" if seat_offset < 13 else "SECOND"
                else:
                    seat_class = "SECOND"

                row_seats.append({"type": "seat", "number": current, "class": seat_class, "status": "available"})
                current += 1
            else:
                row_seats.append({"type": "empty"})

        formatted_row = [
            row_seats[0] if len(row_seats) > 0 else {"type": "empty"},
            row_seats[1] if len(row_seats) > 1 else {"type": "empty"},
            {"type": "empty"},
            row_seats[2] if len(row_seats) > 2 else {"type": "empty"},
            row_seats[3] if len(row_seats) > 3 else {"type": "empty"}
        ]
        rows.append(formatted_row)

    header_row = [
        {"type": "element", "name": "luggage", "label": "ბარგი"}
    ]
    if wagon_number == 1:
        header_row.append({"type": "element", "name": "food", "label": "საკვები"})

    footer_row = [
        {"type": "element", "name": "exit", "label": "გასასვლელი"},
        {"type": "element", "name": "wc", "label": "ტუალეტი"}
    ]

    final_rows = [header_row] + rows + [footer_row]

    return [
        {
            "floor_name": "single",
            "floor_label": "მთავარი სართული",
            "rows": final_rows
        }
    ]


def _apply_booked_status(layout_data, booked_seats):
    floors = layout_data.get("layout", {}).get("floors", [])
    for floor in floors:
        for row in floor.get("rows", []):
            for cell in row:
                if isinstance(cell, dict) and cell.get("type") == "seat":
                    if cell["number"] in booked_seats:
                        cell["status"] = "booked"
    return layout_data