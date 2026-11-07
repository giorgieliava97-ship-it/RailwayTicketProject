# Railway Ticket Booking System — Backend Documentation

## 1. პროექტის მიმოხილვა (System Overview)
* **პროექტის დასახელება:** მატარებლის ბილეთების ონლაინ დაჯავშნისა და ყიდვის სისტემა
* **ტექნოლოგიური სტეკი:** Python (3.x), Django Framework, Django REST Framework (DRF), PostgreSQL
* **დროის ზონა:** `Asia/Tbilisi`
* **მონაცემთა ბაზის დასახელება:** `railway_db`
* **მთავარი აუთენტიფიკაციის მოდელი:** `user.CustomUser`

---

## 2. ბიზნეს ლოგიკა და ობიექტების კავშირი (ERD & Architecture)

სისტემა შედგება 4 ძირითადი აპლიკაციისაგან:
1. `user`: მომხმარებლების მართვა და აუთენტიფიკაცია.
2. `tickets`: სადგურები, მატარებლები, რეისები და ბილეთები.
3. `payments`: გადახდების ტრანზაქციების დაფიქსირება.
4. `railway_core`: პროექტის ცენტრალური პარამეტრები და მარშრუტიზაცია.

### მოდელების ურთიერთკავშირის სქემა:
```text
[CustomUser]  <---+
                  | (1:N)
[Trip] ---------> [Ticket] <======= (1:1) =======> [Payment]
  |
  +-- (N:1) --> [Train]
  +-- (N:1) --> [Station (Departure)]
  +-- (N:1) --> [Station (Arrival)]
```

---

## 3. მონაცემთა ბაზის სტრუქტურა (Data Models & Schema)

### 3.1. `user` აპლიკაცია

####  `CustomUser` (მომხმარებელი)
აფართოებს Django-ს სტანდარტულ `AbstractUser` კლასს.

| ველის დასახელება | მონაცემთა ტიპი | შეზღუდვები / აღწერა               |
|:-----------------|:---------------|:----------------------------------|
| `id`             | BigAutoField   | Primary Key                       |
| `username`       | CharField(150) | Unique, მომხმარებლის სახელი       |
| `email`          | EmailField     | Email მისამართი                   |
| `phone_number`   | CharField(20)  | ტელეფონის ნომერი (არასავალდებულო) |
| `personal_id`    | CharField(11)  | პირადი ნომერი (არასავალდებულო)    |
| `is_staff`       | BooleanField   | ადმინისტრატორის სტატუსი           |
| `is_active`      | BooleanField   | აქტიური მომხმარებლის სტატუსი      |

---

### 3.2. `tickets` აპლიკაცია

####  `Station` (სადგური / ქალაქი)
ინახავს ინფორმაციას რკინიგზის სადგურების შესახებ.

| ველის დასახელება | მონაცემთა ტიპი | შეზღუდვები / აღწერა                                 |
|:-----------------|:---------------|:----------------------------------------------------|
| `id`             | BigAutoField   | Primary Key                                         |
| `name`           | CharField(100) | Unique, სადგურის დასახელება (მაგ: თბილისი ცენტრალი) |
| `code`           | CharField(20)  | Unique, სადგურის მოკლე კოდი (მაგ: TBS, BTM)         |
| `city`           | CharField(100) | ქალაქი (არასავალდებულო)                             |

####  `Train` (მატარებელი)
ინახავს მატარებლების ტექნიკურ მონაცემებს.

| ველის დასახელება | მონაცემთა ტიპი       | შეზღუდვები / აღწერა                      |
|:-----------------|:---------------------|:-----------------------------------------|
| `id`             | BigAutoField         | Primary Key                              |
| `train_number`   | CharField(50)        | Unique, მატარებლის ნომერი (მაგ: 802)     |
| `train_type`     | CharField(50)        | ტიპი (Default: "ჩქაროსნული")             |
| `total_seats`    | PositiveIntegerField | ადგილების საერთო ტევადობა (Default: 100) | 

####  `Trip` (რეისი / განრიგი)
აკავშირებს მარშრუტს, მატარებელს, დროებსა და ფასს.

| ველის დასახელება    | მონაცემთა ტიპი       | შეზღუდვები / აღწერა                                      |
|:--------------------|:---------------------|:---------------------------------------------------------|
| `id`                | BigAutoField         | Primary Key                                              |
| `train`             | ForeignKey           | `Train` (on_delete=CASCADE, related_name="trips")        |
| `departure_station` | ForeignKey           | `Station` (on_delete=CASCADE, related_name="departures") |
| `arrival_station`   | ForeignKey           | `Station` (on_delete=CASCADE, related_name="arrivals")   |
| `departure_time`    | DateTimeField        | გამგზავრების თარიღი და დრო                               |
| `arrival_time`      | DateTimeField        | ჩასვლის თარიღი და დრო                                    |
| `price`             | DecimalField(8,2)    | ბილეთის ღირებულება ლარში                                 |
| `available_seats`   | PositiveIntegerField | დარჩენილი თავისუფალი ადგილები                            |

####  `Ticket` (ბილეთი)
წარმოადგენს მომხმარებლის მიერ დაჯავშნილ/ნაყიდ ბილეთს.

| ველის დასახელება | მონაცემთა ტიპი       | შეზღუდვები / აღწერა                                                          |
|:-----------------|:---------------------|:-----------------------------------------------------------------------------|
| `id`             | BigAutoField         | Primary Key                                                                  |
| `user`           | ForeignKey           | `CustomUser` (on_delete=CASCADE, related_name="tickets")                     |
| `trip`           | ForeignKey           | `Trip` (on_delete=CASCADE, related_name="tickets")                           |
| `seat_number`    | PositiveIntegerField | ადგილის ნომერი                                                               |
| `purchase_date`  | DateTimeField        | auto_now_add=True (შექმნის დრო)                                              |
| `status`         | CharField(20)        | Choices: `ACTIVE` (აქტიური), `USED` (გამოყენებული), `CANCELLED` (გაუქმებული) |

---

### 3.3. `payments` აპლიკაცია

####  `Payment` (გადახდა)
ინახავს ბილეთთან დაკავშირებულ ტრანზაქციებს.

| ველის დასახელება | მონაცემთა ტიპი    | შეზღუდვები / აღწერა                                                              |
|:-----------------|:------------------|:---------------------------------------------------------------------------------|
| `id`             | BigAutoField      | Primary Key                                                                      |
| `ticket`         | OneToOneField     | `Ticket` (on_delete=CASCADE, related_name="payment")                             |
| `amount`         | DecimalField(8,2) | გადახდილი თანხა                                                                  |
| `status`         | CharField(20)     | Choices: `PENDING` (მოლოდინში), `SUCCESS` (წარმატებული), `FAILED` (წარუმატებელი) |
| `transaction_id` | CharField(100)    | Unique, null=True, blank=True (საბანკო ტრანზაქციის ID)                           |
| `created_at`     | DateTimeField     | auto_now_add=True (გადახდის წამოწყების დრო)                                      |

---

## 4. შემდეგი ეტაპები (Next Steps)
- [x] პროექტის არქიტექტურის გაწერა
- [x] მონაცემთა ბაზის მოდელების შექმნა და მიგრაციები
- [ ] DRF Serializer-ების აწყობა (`User`, `Trip`, `Ticket`, `Payment`)
- [ ] API View-ების და Route-ების გამართვა
- [ ] ავთენტიფიკაციის (JWT / Token) ინტეგრაცია