v11 — FIX DUPLICATE SWIPE

Nguyên nhân:
- main.js cũ có listener "birthday:start" -> storyController.next().
- hero.js cũng dispatch "birthday:start" khi nút "Vuốt sang trái..." nhận click.
- Một swipe bắt đầu trên nút có thể tạo pointerup + synthetic click,
  khiến cùng một gesture chuyển section 2 lần.

Sửa:
1. Xóa hoàn toàn listener "birthday:start" khỏi main.js.
2. hero.js không dispatch "birthday:start" nữa.
3. Global pointer swipe là nguồn navigation DUY NHẤT.
4. Một gesture thành công khóa navigation 900ms trước khi gọi next/prev.
5. Animation Section 1 không bị thay đổi.
6. hero.enter()/playPage1() không bị thay đổi trong bản này.

Kết quả:
- Bấm Bắt đầu -> Section 1 animation chạy.
- Section 1 -> vuốt trái 1 lần -> Section 2.
- Section 2 -> vuốt phải 1 lần -> Section 1.
- Không còn click của nút Hero tự gọi next().
