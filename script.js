const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwvhMa3h_97CBlRFf2oxnprX2soJ3LasDwb6QdxCQ0GIkAEiQUMdDrkbj5V_sFhoPhyww/exec";

let products = [];
let cart = [];
let transactions = JSON.parse(localStorage.getItem('pos_transactions')) || [];

window.onload = async () => {
    await fetchProductsFromSheet();
    updateDashboard();
    renderHistoryTable();
    
    // Inisialisasi Jam & Tanggal Real-Time di Dashboard
    updateRealtimeClock();
    setInterval(updateRealtimeClock, 1000);
};

function updateRealtimeClock() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('id-ID', options);
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dashDateEl = document.getElementById('dash-date');
    if (dashDateEl) {
        dashDateEl.innerHTML = `<i class="fa-regular fa-clock mr-1.5 text-red-500"></i>${dateStr} - <span class="text-white font-black">${timeStr} WIB</span>`;
    }
}

async function refreshApp() {
    const icon = document.getElementById('refresh-icon');
    icon.classList.add('fa-spin');
    
    await fetchProductsFromSheet();
    updateDashboard();
    renderHistoryTable();
    switchTab('dashboard');

    setTimeout(() => {
        icon.classList.remove('fa-spin');
    }, 500);
}

async function autoSyncToCloud() {
    if (!WEB_APP_URL || WEB_APP_URL.includes("ISI_DENGAN_URL")) return;
    const payload = {
        products: products,
        transactions: transactions
    };
    try {
        await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error("Auto-sync background error:", error);
    }
}

async function fetchProductsFromSheet() {
    if (!WEB_APP_URL || WEB_APP_URL.includes("ISI_DENGAN_URL")) return;
    try {
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();
        if (Array.isArray(data)) {
            products = data;
            localStorage.setItem('pos_products', JSON.stringify(products));
            renderProducts();
            renderProductTable();
            updateDashboard();
        }
    } catch (error) {
        console.error("Gagal mengambil data produk dari database:", error);
        const localProducts = localStorage.getItem('pos_products');
        if (localProducts) {
            products = JSON.parse(localProducts);
            renderProducts();
            renderProductTable();
        }
    }
}

function updateDashboard() {
    let totalRevenue = transactions.reduce((sum, t) => sum + (t.total || t.totalAmount || 0), 0);
    let lowStockCount = products.filter(p => Number(p.stock) <= 5).length;

    document.getElementById('stat-revenue').innerText = formatIDR(totalRevenue);
    document.getElementById('stat-trx-count').innerText = transactions.length;
    document.getElementById('stat-prod-count').innerText = products.length;
    document.getElementById('stat-low-stock').innerText = lowStockCount;
}

function switchTab(tabId) {
    ['dashboard', 'pos', 'products', 'history'].forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        const btn = document.getElementById(`btn-tab-${t}`);
        if(el) el.classList.add('hidden');
        if(btn) btn.className = "px-4 py-2 text-slate-400 hover:text-white font-semibold rounded-xl text-xs tracking-wide transition-all flex items-center space-x-2";
    });
    
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    document.getElementById(`btn-tab-${tabId}`).className = "px-4 py-2 bg-red-600 text-white font-extrabold rounded-xl text-xs tracking-wide transition-all shadow-md shadow-red-600/25 flex items-center space-x-2";
    
    if(tabId === 'dashboard') {
        updateDashboard();
    }
}

function formatIDR(num) {
    return "Rp " + Number(num).toLocaleString("id-ID");
}

function renderProducts(filteredList = products) {
    const grid = document.getElementById('pos-product-grid');
    grid.innerHTML = '';
    if (filteredList.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-16 text-slate-500 space-y-2"><i class="fa-solid fa-box-open text-3xl"></i><p class="text-xs">Produk tidak ditemukan</p></div>`;
        return;
    }
    filteredList.forEach(p => {
        grid.innerHTML += `
            <div onclick="addToCart('${p.id}')" class="bg-slate-900 border border-slate-800 hover:border-red-600/60 p-4 rounded-3xl cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3 shadow-lg group">
                <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-600/10 px-2.5 py-1 rounded-full border border-red-600/20">${p.category}</span>
                    <h3 class="font-bold text-sm text-slate-200 mt-2 line-clamp-1 group-hover:text-white">${p.name}</h3>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span class="text-red-400 font-black text-xs font-mono">${formatIDR(p.price)}</span>
                    <span class="text-[11px] text-slate-400 font-semibold bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">Stok: ${p.stock}</span>
                </div>
            </div>
        `;
    });
}

function filterProducts() {
    const keyword = document.getElementById('search-product').value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(keyword) || (p.barcode && p.barcode.toLowerCase().includes(keyword)));
    renderProducts(filtered);
}

function renderProductTable() {
    const tbody = document.getElementById('product-table-body');
    tbody.innerHTML = '';
    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-12 text-center text-slate-500 text-xs">Belum ada data produk di katalog.</td></tr>`;
        return;
    }
    products.forEach((p) => {
        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/30 transition-colors">
                <td class="p-4 font-mono text-xs text-slate-400">${p.id}</td>
                <td class="p-4 font-mono text-xs">${p.barcode || '-'}</td>
                <td class="p-4 font-bold text-white">${p.name}</td>
                <td class="p-4 text-slate-400 text-xs">${p.category}</td>
                <td class="p-4 text-red-400 font-bold font-mono text-xs">${formatIDR(p.price)}</td>
                <td class="p-4 text-xs"><span class="bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300 font-bold">${p.stock}</span></td>
                <td class="p-4 text-center space-x-2">
                    <button onclick="openEditProductModal('${p.id}')" class="bg-slate-800 hover:bg-slate-700 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteProduct('${p.id}')" class="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    });
}

function openAddProductModal() {
    document.getElementById('new-p-id').value = 'SRC-' + Math.floor(100 + Math.random() * 900);
    document.getElementById('add-product-modal').classList.remove('hidden');
}
function closeAddProductModal() { document.getElementById('add-product-modal').classList.add('hidden'); }

function saveNewProduct() {
    const id = document.getElementById('new-p-id').value.trim();
    const barcode = document.getElementById('new-p-barcode').value.trim();
    const name = document.getElementById('new-p-name').value.trim();
    const category = document.getElementById('new-p-category').value.trim();
    const price = Number(document.getElementById('new-p-price').value);
    const stock = Number(document.getElementById('new-p-stock').value);

    if (!id || !name || !category || isNaN(price) || isNaN(stock)) {
        alert("Mohon lengkapi seluruh data produk dengan benar!");
        return;
    }

    products.push({ id, barcode, name, category, price, stock });
    localStorage.setItem('pos_products', JSON.stringify(products));
    renderProducts();
    renderProductTable();
    updateDashboard();
    closeAddProductModal();
    autoSyncToCloud();
}

function openEditProductModal(id) {
    const p = products.find(item => item.id === id);
    if (!p) return;
    document.getElementById('edit-p-id').value = p.id;
    document.getElementById('edit-p-barcode').value = p.barcode || '';
    document.getElementById('edit-p-category').value = p.category || '';
    document.getElementById('edit-p-name').value = p.name || '';
    document.getElementById('edit-p-price').value = p.price || 0;
    document.getElementById('edit-p-stock').value = p.stock || 0;
    document.getElementById('edit-product-modal').classList.remove('hidden');
}
function closeEditProductModal() { document.getElementById('edit-product-modal').classList.add('hidden'); }

function updateProduct() {
    const id = document.getElementById('edit-p-id').value;
    const barcode = document.getElementById('edit-p-barcode').value.trim();
    const category = document.getElementById('edit-p-category').value.trim();
    const name = document.getElementById('edit-p-name').value.trim();
    const price = Number(document.getElementById('edit-p-price').value);
    const stock = Number(document.getElementById('edit-p-stock').value);

    const index = products.findIndex(item => item.id === id);
    if (index !== -1) {
        products[index] = { id, barcode, name, category, price, stock };
        localStorage.setItem('pos_products', JSON.stringify(products));
        renderProducts();
        renderProductTable();
        updateDashboard();
        closeEditProductModal();
        autoSyncToCloud();
    }
}

function deleteProduct(id) {
    if (confirm("Hapus produk ini dari katalog?")) {
        products = products.filter(item => item.id !== id);
        localStorage.setItem('pos_products', JSON.stringify(products));
        renderProducts();
        renderProductTable();
        updateDashboard();
        autoSyncToCloud();
    }
}

function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product || product.stock <= 0) {
        alert("Stok barang habis!");
        return;
    }
    const item = cart.find(i => i.id === id);
    if (item) {
        if (item.qty < product.stock) item.qty++;
        else alert("Stok tidak mencukupi!");
    } else {
        cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    }
    renderCart();
}

function renderCart() {
    const list = document.getElementById('cart-list');
    list.innerHTML = '';
    let totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
    document.getElementById('cart-item-count').innerText = `${totalItems} item`;

    if (cart.length === 0) {
        list.innerHTML = `<div class="text-center py-12 text-slate-600 space-y-2"><i class="fa-solid fa-basket-shopping text-3xl"></i><p class="text-xs">Keranjang masih kosong</p></div>`;
        document.getElementById('cart-total').innerText = formatIDR(0);
        return;
    }

    let total = 0;
    cart.forEach((item, index) => {
        let subtotal = item.price * item.qty;
        total += subtotal;
        list.innerHTML += `
            <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-white text-xs line-clamp-1">${item.name}</h4>
                        <span class="text-[10px] text-slate-400 font-mono">@ ${formatIDR(item.price)}</span>
                    </div>
                    <button onclick="cart.splice(${index},1);renderCart()" class="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"><i class="fa-solid fa-trash-can text-xs"></i></button>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-slate-800">
                    <div class="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <button onclick="cart[${index}].qty > 1 ? cart[${index}].qty-- : cart.splice(${index},1); renderCart()" class="bg-slate-800 w-6 h-6 rounded-lg text-white font-bold text-xs cursor-pointer">-</button>
                        <span class="font-mono font-bold text-xs px-2 text-white">${item.qty}</span>
                        <button onclick="cart[${index}].qty++; renderCart()" class="bg-slate-800 w-6 h-6 rounded-lg text-white font-bold text-xs cursor-pointer">+</button>
                    </div>
                    <span class="font-mono font-black text-red-400 text-xs">${formatIDR(subtotal)}</span>
                </div>
            </div>
        `;
    });
    document.getElementById('cart-total').innerText = formatIDR(total);
}

function openCheckoutModal() {
    if (cart.length === 0) { alert("Keranjang kosong!"); return; }
    let total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    document.getElementById('modal-total').innerText = formatIDR(total);
    document.getElementById('cash-input').value = '';
    document.getElementById('modal-change').innerText = formatIDR(0);
    document.getElementById('checkout-modal').classList.remove('hidden');
}
function closeCheckoutModal() { document.getElementById('checkout-modal').classList.add('hidden'); }

function calculateChange() {
    let total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let cash = Number(document.getElementById('cash-input').value) || 0;
    let change = cash - total;
    let modalChange = document.getElementById('modal-change');
    if (change >= 0) {
        modalChange.innerText = formatIDR(change);
        modalChange.className = "font-black text-red-400 text-sm font-mono";
    } else {
        modalChange.innerText = "Kurang " + formatIDR(Math.abs(change));
        modalChange.className = "font-black text-rose-500 text-sm font-mono";
    }
}

function processPayment() {
    let total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let cash = Number(document.getElementById('cash-input').value) || 0;
    if (cash < total) { alert("Uang tunai kurang!"); return; }
    let change = cash - total;

    const now = new Date();
    const timeString = now.toLocaleString('id-ID', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
    }).replace(/\./g, ':');

    const newTransaction = {
        id: "TRX-" + Date.now(),
        time: timeString,
        total: total,
        cash: cash,
        change: change,
        items: [...cart]
    };

    transactions.unshift(newTransaction);
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));

    cart.forEach(c => {
        let p = products.find(prod => prod.id === c.id);
        if (p) p.stock = Math.max(0, p.stock - c.qty);
    });
    localStorage.setItem('pos_products', JSON.stringify(products));

    showReceiptModal(newTransaction);
    cart = [];
    renderCart();
    renderProducts();
    renderProductTable();
    updateDashboard();
    renderHistoryTable();
    closeCheckoutModal();
    autoSyncToCloud();
}

function showReceiptModal(trx) {
    let html = `
        <div class="text-center font-black text-slate-900 text-sm mb-1">SRC RENDY</div>
        <div class="text-center text-[10px] text-slate-600 mb-2">--------------------------------</div>
        <div class="flex justify-between"><span>No. Transaksi</span><span class="font-bold">${trx.id}</span></div>
        <div class="flex justify-between mb-2"><span>Waktu</span><span>${trx.time}</span></div>
        <div class="text-center text-[10px] text-slate-600 mb-2">--------------------------------</div>
    `;
    trx.items.forEach(i => {
        html += `
            <div class="font-bold">${i.name}</div>
            <div class="flex justify-between text-slate-600 mb-1">
                <span>${i.qty} x ${formatIDR(i.price)}</span>
                <span class="font-mono">${formatIDR(i.qty * i.price)}</span>
            </div>
        `;
    });
    html += `
        <div class="text-center text-[10px] text-slate-600 my-2">--------------------------------</div>
        <div class="flex justify-between font-bold text-slate-900"><span>TOTAL</span><span class="font-mono">${formatIDR(trx.total)}</span></div>
        <div class="flex justify-between text-slate-600"><span>TUNAI</span><span class="font-mono">${formatIDR(trx.cash)}</span></div>
        <div class="flex justify-between text-slate-600"><span>KEMBALIAN</span><span class="font-mono">${formatIDR(trx.change)}</span></div>
        <div class="text-center text-[10px] text-slate-600 my-2">================================</div>
        <div class="text-center text-[10px] text-slate-500 font-sans tracking-wide">Terima Kasih Telah Berbelanja!</div>
    `;
    document.getElementById('receipt-details').innerHTML = html;
    document.getElementById('receipt-modal').classList.remove('hidden');
}

function closeReceiptModal() { document.getElementById('receipt-modal').classList.add('hidden'); }

function renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    const selectedDate = document.getElementById('filter-history-date').value; // Format: YYYY-MM-DD
    const selectedTime = document.getElementById('filter-history-time').value; // Format: HH:MM
    tbody.innerHTML = '';

    let filteredTransactions = transactions.filter(trx => {
        let matchDate = true;
        let matchTime = true;

        // Pisahkan string waktu transaksi (Contoh format: 06/08/2026, 19:06:23)
        let parts = trx.time.split(',');
        if (parts.length >= 2) {
            let datePart = parts[0].trim(); // DD/MM/YYYY
            let timePart = parts[1].trim(); // HH:MM:SS

            // Filter Tanggal
            if (selectedDate) {
                let dateSplits = datePart.split('/');
                if (dateSplits.length === 3) {
                    let formattedTrxDate = `${dateSplits[2]}-${dateSplits[1].padStart(2, '0')}-${dateSplits[0].padStart(2, '0')}`;
                    if (formattedTrxDate !== selectedDate) matchDate = false;
                }
            }

            // Filter Waktu (Jam/Menit)
            if (selectedTime && matchDate) {
                // Ambil jam dan menit saja dari waktu transaksi (HH:MM)
                let trxHourMinute = timePart.substring(0, 5);
                if (!trxHourMinute.startsWith(selectedTime)) {
                    matchTime = false;
                }
            }
        }
        return matchDate && matchTime;
    });

    if (filteredTransactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-12 text-center text-slate-500 text-xs">Belum ada transaksi yang sesuai dengan filter waktu tersebut.</td></tr>`;
        return;
    }

    filteredTransactions.forEach((trx) => {
        const originalIndex = transactions.indexOf(trx);
        const trxJson = JSON.stringify(trx).replace(/"/g, '&quot;');
        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/30 transition-colors">
                <td class="p-4 font-mono font-bold text-red-400 text-xs">${trx.id}</td>
                <td class="p-4 text-slate-300 text-xs font-mono font-semibold">${trx.time}</td>
                <td class="p-4 font-bold text-white text-xs font-mono">${formatIDR(trx.total)}</td>
                <td class="p-4 text-slate-300 text-xs font-mono">${formatIDR(trx.cash)}</td>
                <td class="p-4 text-red-400 font-bold text-xs font-mono">${formatIDR(trx.change)}</td>
                <td class="p-4 text-center space-x-2">
                    <button onclick='showReceiptModal(${trxJson})' class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer">Struk</button>
                    <button onclick='deleteTransaction(${originalIndex})' class="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer">Hapus</button>
                </td>
            </tr>
        `;
    });
}

function resetHistoryFilter() {
    document.getElementById('filter-history-date').value = '';
    document.getElementById('filter-history-time').value = '';
    renderHistoryTable();
}

function deleteTransaction(index) {
    if (confirm("Hapus riwayat transaksi ini?")) {
        transactions.splice(index, 1);
        localStorage.setItem('pos_transactions', JSON.stringify(transactions));
        renderHistoryTable();
        updateDashboard();
        autoSyncToCloud();
    }
}
