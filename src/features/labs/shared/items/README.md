# Thư viện item dùng chung

`SharedLabItem` định nghĩa metadata và cách hiển thị một loại dụng cụ. Thêm item khi hai bàn cùng cần hiển thị nó. Giữ `id` loại ổn định. Các vật thể cụ thể trên từng bàn vẫn dùng ID của config.

## Item hiện có

| ID | Component | Bàn truyền vào | Điểm gắn |
|---|---|---|---|
| `beaker` | `Beaker3D` (`beaker.tsx`) | `radius`, `height`, `fill` (0–1), `liquid` (màu), `graduations`, `children` | `base`, `inside`, `mouth` qua `beakerAnchors(size)` |
| `digital-scale` | `DigitalScale3D` (`digital-scale.tsx`) | `reading` (chuỗi đã định dạng, kèm đơn vị); `children` là vật trên đĩa, vẽ tại `pan` với y = 0 là mặt đĩa; `onTare` (tùy chọn) hiện phím trừ bì | `base`, `pan`, `display` |

`glass.tsx` chứa vật liệu thủy tinh và `LiquidColumn`, dùng cho item chung và cho đồ thủy tinh riêng của bàn (ống nghiệm, bình tam giác).

## File

- `catalog.ts`: ID và metadata, không có code hiển thị. Danh sách item (`listKitItems`) và routing chỉ import file này.
- `index.ts`: `SHARED_LAB_ITEMS`, kèm component 3D. Chỉ import trong cảnh 3D.
- `item.ts`: kiểu `SharedLabItem`, `LabItemMetadata`, `LabItemAnchor`.

## Quy ước

- Điểm gắn là tọa độ `[x, y, z]` trong hệ tọa độ cục bộ của component 3D, trước khi bàn đặt vị trí hoặc scale. Dùng tên theo chức năng, như `mouth` (miệng), `inside` (lòng chứa), `base` (đáy) hoặc `pan` (đĩa cân). Khai báo các điểm mà cảnh thật sự sử dụng. Item đổi kích thước theo props thì có hàm trả điểm gắn theo kích thước.
- Bàn truyền kích thước, mức chất lỏng hay số đọc vào component qua props. Engine của bàn quyết định giá trị vật lý và trạng thái mô phỏng. Item không tính thể tích, khối lượng hay đơn vị.
- Thứ nằm trong hoặc trên item (kết tủa, chất rắn, bọt khí, đầu đo, vùng bấm) là của bàn, truyền qua `children`.
- Bàn dùng đơn vị khác thì bọc item trong `<group scale>`.
- Component 2D là tùy chọn. Các bàn có thể dùng component 3D chung và giữ phần hiển thị hoặc tương tác riêng của mình.
- Người phụ trách pilot Kit Hóa học duyệt thay đổi trong thư mục này. Tách PR thêm item chung khỏi PR triển khai bàn.
- Bước A của pilot K2 thêm cốc và cân. Bước B kiểm chứng cảnh thứ hai dùng lại chúng.
