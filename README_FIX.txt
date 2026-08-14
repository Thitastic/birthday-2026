v12 — ONE SWIPE = ONE SECTION

Đã xử lý từ gốc:
- Xóa mọi listener birthday:start -> storyController.next() trong main.js.
- hero.js không còn dispatch birthday:start khi nút Hero nhận click.
- Swipe là nguồn điều hướng duy nhất.
- pointerup chỉ điều hướng một lần cho mỗi gesture.
- Khóa 1000ms và chặn synthetic click phát sinh sau swipe.
- Không thay đổi animation Section 1.

Kiểm tra:
Section 1 -- vuốt trái 1 lần -> Section 2.
Section 2 -- vuốt phải 1 lần -> Section 1.
Section 2 -- vuốt trái 1 lần -> Section 3.
