document.addEventListener('DOMContentLoaded', () => {
  // ตรวจจับหน้าปัจจุบันจาก element ที่มีใน DOM
  if (document.getElementById('product-list')) {
    initProductPage();
  } else if (document.getElementById('orderForm')) {
    initOrderPage();
  } else if (document.querySelector('#ordersTable tbody')) {
    initAdminPage();
  }
});

/* ==========================================
   1. ส่วนจัดการหน้า product.html
   ========================================== */
function initProductPage() {
  const productList = document.getElementById('product-list');
  const filterBar = document.getElementById('filter-bar');
  let productsData = [];

  // อ่าน URL Parameter ?mood=xxx
  const urlParams = new URLSearchParams(window.location.search);
  const initialMood = urlParams.get('mood') || 'ทั้งหมด';

  // ดึงข้อมูลสินค้าจาก products.json
  fetch('products.json')
    .then(response => {
      if (!response.ok) throw new Error('ไม่สามารถโหลด products.json ได้');
      return response.json();
    })
    .then(data => {
      productsData = data;
      renderFilterButtons(initialMood);
      renderProducts(initialMood);
    })
    .catch(err => {
      console.error(err);
      productList.innerHTML = '<p class="error">ไม่สามารถโหลดข้อมูลสินค้าได้ในขณะนี้</p>';
    });

  // สร้างปุ่มกรองตาม Mood
  function renderFilterButtons(activeMood) {
    if (!filterBar) return;
    const moods = ['ทั้งหมด', 'Fresh', 'Relax', 'Focus', 'Romance'];
    filterBar.innerHTML = '';

    moods.forEach(mood => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = mood;
      btn.className = (mood.toLowerCase() === activeMood.toLowerCase()) ? 'active' : '';

      btn.addEventListener('click', () => {
        // อัปเดตสถานะปุ่ม active
        filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProducts(mood);
      });

      filterBar.appendChild(btn);
    });
  }

  // แสดงผลการ์ดสินค้า
  function renderProducts(selectedMood) {
    productList.innerHTML = '';

    const filtered = (selectedMood === 'ทั้งหมด')
      ? productsData
      : productsData.filter(p => p.mood && p.mood.toLowerCase() === selectedMood.toLowerCase());

    if (filtered.length === 0) {
      productList.innerHTML = '<p class="no-data">ไม่พบสินค้าในหมวดหมู่นี้</p>';
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'product-card';

      // พารามิเตอร์สำหรับส่งไปหน้า order.html
      const orderParams = new URLSearchParams({
        item: `${item.name} ${item.size || ''}`.trim(),
        price: item.price
      });

      card.innerHTML = `
        <img src="${item.image || ''}" alt="${item.name}">
        <div class="product-info">
          <h3>${item.name}</h3>
          <p class="size">ขนาด: ${item.size || '-'}</p>
          <p class="price">฿${Number(item.price).toLocaleString()}</p>
          <a href="order.html?${orderParams.toString()}" class="btn-order">สั่งซื้อ</a>
        </div>
      `;
      productList.appendChild(card);
    });
  }
}

/* ==========================================
   2. ส่วนจัดการหน้า order.html
   ========================================== */
function initOrderPage() {
  const form = document.getElementById('orderForm');
  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  // อ่านค่า item และ price จาก URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const itemParam = urlParams.get('item');
  const priceParam = urlParams.get('price');

  // เติมค่าลงช่องอัตโนมัติทันที
  if (itemsInput && itemParam) {
    itemsInput.value = itemParam;
  }
  if (totalInput && priceParam) {
    totalInput.value = priceParam;
  }

  // จัดการเมื่อกดปุ่ม Submit ฟอร์ม
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'กำลังส่งข้อมูล...';
    }

    // สร้าง payload ตาม id ที่กำหนด
    const payload = {
      customerName: document.getElementById('customerName')?.value || '',
      contact: document.getElementById('contact')?.value || '',
      items: document.getElementById('items')?.value || '',
      total: document.getElementById('total')?.value || '',
      note: document.getElementById('note')?.value || ''
    };

    // ส่งข้อมูลไปยัง Google Apps Script (ห้ามใส่ headers หรือ mode: no-cors ตามเงื่อนไข)
    fetch('https://script.google.com/macros/s/AKfycbyLDgjQVDlYS-TfGIGfJf1OpsapyFyVC88-7ZzeqUqz3u8W1ydDwqZBs_GXJSyYWGqv8g/exec', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => {
      window.location.href = 'thankyou.html';
    })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ยืนยันสั่งซื้อ';
      }
    });
  });
}

/* ==========================================
   3. ส่วนจัดการหน้า admin.html
   ========================================== */
function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');
  const sheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKYPnZdUWv0RXdK_78w8kWLv52eYx7EjxQa31S0kB4T70P4vA1XMMOqzZQ4NcI75LGtlI7q_FR176C/pub?gid=0&single=true&output=csv';

  fetch(sheetCsvUrl)
    .then(response => {
      if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูล Google Sheets ได้');
      return response.text();
    })
    .then(csvText => {
      const rows = parseCSV(csvText);
      if (rows.length <= 1) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">ยังไม่มีข้อมูลคำสั่งซื้อ</td></tr>';
        return;
      }

      // แถวแรกคือ Header ดึงเฉพาะส่วนข้อมูล (Body rows)
      const dataRows = rows.slice(1).filter(r => r.some(cell => cell.trim() !== ''));

      // เรียงลำดับจากรายการล่าสุดขึ้นก่อน (Reverse order)
      dataRows.reverse();

      tbody.innerHTML = '';
      dataRows.forEach(row => {
        const tr = document.createElement('tr');
        // แสดง: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
        tr.innerHTML = `
          <td>${escapeHtml(row[0] || '')}</td>
          <td>${escapeHtml(row[1] || '')}</td>
          <td>${escapeHtml(row[2] || '')}</td>
          <td>${escapeHtml(row[3] || '')}</td>
          <td>${escapeHtml(row[4] || '')}</td>
          <td>${escapeHtml(row[5] || '')}</td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(err => {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">โหลดข้อมูลไม่สำเร็จ</td></tr>';
    });
}

/**
 * ฟังก์ชัน Parse CSV แบบไม่พึ่ง Library ภายนอก
 * รองรับ Multi-line, เครื่องหมาย Quotes ("") และ Comma ในข้อความ
 */
function parseCSV(text) {
  const result = [];
  let row = [''];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // ข้าม escape double quotes
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push('');
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // ข้ามคู่ \r\n
      }
      result.push(row);
      row = [''];
    } else {
      row[row.length - 1] += char;
    }
  }

  // ดันแถวสุดท้ายเข้าถ้ายังมีข้อมูลค้างอยู่
  if (row.length > 1 || row[0] !== '') {
    result.push(row);
  }

  return result;
}

/**
 * ป้องกัน XSS Injection สำหรับข้อมูลที่ดึงมาแสดงบนตาราง
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}