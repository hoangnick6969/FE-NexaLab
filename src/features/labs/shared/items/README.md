# Thư viện item dùng chung

`SharedLabItem` định nghĩa metadata và cách hiển thị một loại dụng cụ. Thêm item khi hai bàn cùng cần hiển thị nó. Giữ `id` loại ổn định. Các vật thể cụ thể trên từng bàn vẫn dùng ID của config.

- Điểm gắn là tọa độ `[x, y, z]` trong hệ tọa độ cục bộ của component 3D, trước khi bàn đặt vị trí hoặc scale. Dùng tên theo chức năng, như `mouth` (miệng), `inside` (lòng chứa), `base` (đáy) hoặc `pan` (đĩa cân). Khai báo các điểm mà cảnh thật sự sử dụng.
- Bàn truyền kích thước, mức chất lỏng hay số đọc vào component qua props. Engine của bàn quyết định giá trị vật lý và trạng thái mô phỏng.
- Component 2D là tùy chọn. Các bàn có thể dùng component 3D chung và giữ phần hiển thị hoặc tương tác riêng của mình.
- Người phụ trách pilot Kit Hóa học duyệt thay đổi trong thư mục này. Tách PR thêm item chung khỏi PR triển khai bàn.
- Bước A của pilot K2 thêm cốc và cân. Bước B kiểm chứng cảnh thứ hai dùng lại chúng.
