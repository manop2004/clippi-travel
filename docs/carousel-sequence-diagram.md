# Carousel Component — End-to-End Sequence Diagram

อธิบาย flow การทำงานของ Carousel.tsx (T16) ที่ TrendingSpots.tsx (T17) เรียกใช้ ตั้งแต่โหลดข้อมูลจนถึงเปิดหน้ารายละเอียดร้าน

```mermaid
sequenceDiagram
    actor User
    participant TS as TrendingSpots.tsx
    participant DB as Supabase (century_shops)
    participant CA as Carousel.tsx
    participant EV as ExploreView.tsx
    participant PDM as PlaceDetailModal

    User->>TS: เปิดหน้า Explore (mount)
    TS->>DB: SELECT ... ORDER BY reviews_count, rating LIMIT 3
    DB-->>TS: คืนข้อมูล Top 3 ร้าน
    TS->>TS: setPlaces(data) + คำนวณ filteredPlaces
    TS->>CA: <Carousel items renderItem keyExtractor />
    CA-->>User: แสดงการ์ด + dot indicator (activeIndex=0)

    User->>CA: ปัดจอ (scroll)
    CA->>CA: onScroll -> handleScroll() -> setActiveIndex
    CA-->>User: dot indicator เปลี่ยนตำแหน่งตาม

    User->>CA: แตะที่การ์ด
    CA->>TS: เรียก renderItem's onClick (handlePlaceClick)
    TS->>EV: openPlace(place)
    EV->>PDM: render <PlaceDetailModal place={place} />
    PDM-->>User: แสดงรายละเอียดร้านเต็มรูปแบบ
```

## หมายเหตุสถาปัตยกรรม

- **Carousel.tsx** ไม่รู้จัก "สถานที่" หรือ "ร้าน" เลย — รับแค่ `items` ทั่วไปและฟังก์ชัน `renderItem` ทำให้ใช้ซ้ำกับ Banner (T06), Seasonal Hits (T04/T05/T07), New Stamps (T19) ได้โดยไม่ต้องแก้ Carousel.tsx เอง
- **การนำทางไปหน้ารายละเอียด** ไหลผ่าน prop `openPlace` ที่ส่งต่อกันจาก App.tsx -> ExploreView.tsx -> TrendingSpots.tsx (prop drilling แบบง่าย เพราะแอปนี้ไม่มีระบบ Routing)
