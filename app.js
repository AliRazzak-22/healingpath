// app.js

// ---------------------------------------------------------
// 1. إعدادات Firebase (ضع الكود الخاص بك هنا)
// ---------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyCtz6MiAPW5I1BDNqJXMe-q8CgOrsEFc1O",
    authDomain: "healingpath-51637.firebaseapp.com",
    databaseURL: "https://healingpath-51637-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "healingpath-51637",
    storageBucket: "healingpath-51637.firebasestorage.app",
    messagingSenderId: "247914857779",
    appId: "1:247914857779:web:1c0e49c02d3ce6f109aa46",
    measurementId: "G-J9RBTGLVV2"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ---------------------------------------------------------
// المتغيرات العامة والحالة
// ---------------------------------------------------------
const daysInArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
let currentSystem = 'portal';
let currentFinMonth = '';

// حالة الداتا السحابية
let cloudFinancialData = {};
let cloudInvoices = [];
let paidInvoices = [];
let cartsHistory = [];
let cart = [];

// ---------------------------------------------------------
// مزامنة حية من Firebase (Real-time Sync)
// ---------------------------------------------------------
db.ref('financial_records').on('value', snap => {
    cloudFinancialData = snap.val() || {};
    if (currentSystem === 'financial') {
        if (!currentFinMonth) renderMonthsView();
        else openMonthReport(currentFinMonth.split('/')[0], currentFinMonth.split('/')[1]);
    }
});

db.ref('dues_invoices').on('value', snap => {
    const data = snap.val() || {};
    cloudInvoices = Object.keys(data).map(key => data[key]);
    if (currentSystem === 'dues') renderInvoices();
});

db.ref('dues_system').on('value', snap => {
    const data = snap.val() || {};
    paidInvoices = data.paidInvoices || [];
    cartsHistory = data.cartsHistory || [];
    if (currentSystem === 'dues') { renderInvoices(); renderCart(); }
});

// ---------------------------------------------------------
// إدارة الواجهات العلوية
// ---------------------------------------------------------
function openSystem(sys) {
    currentSystem = sys;
    document.getElementById('portal-screen').classList.replace('active-screen', 'hidden-screen');
    document.getElementById('financial-system').classList.replace('active-screen', 'hidden-screen');
    document.getElementById('dues-system').classList.replace('active-screen', 'hidden-screen');

    if (sys === 'portal') document.getElementById('portal-screen').classList.replace('hidden-screen', 'active-screen');
    else if (sys === 'financial') {
        document.getElementById('financial-system').classList.replace('hidden-screen', 'active-screen');
        currentFinMonth = '';
        renderMonthsView();
    }
    else if (sys === 'dues') {
        document.getElementById('dues-system').classList.replace('hidden-screen', 'active-screen');
        populateFilters();
        renderInvoices();
    }
}

// أداة إظهار التنبيهات (Toast)
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = "toast show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

// إدارة النوافذ المنبثقة
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function formatMoney(num) { return Number(num).toLocaleString('en-US'); }

// ---------------------------------------------------------
// النظام المالي: المنطق والدمج
// ---------------------------------------------------------
function getAvailableMonths() {
    const monthsSet = new Set();
    // 1. قراءة الأشهر القديمة من الذاكرة المحلية (تجنب الشاشة البيضاء)
    if (typeof pharmacyData !== 'undefined') {
        Object.keys(pharmacyData).forEach(key => monthsSet.add(key));
    }
    // 2. قراءة الأشهر الجديدة من السحابة
    Object.keys(cloudFinancialData).forEach(key => monthsSet.add(key.replace('_', '/')));

    // ترتيب الأشهر زمنياً
    return Array.from(monthsSet).map(m => {
        const [y, mm] = m.split('/').map(Number);
        return { year: y, month: mm, key: m };
    }).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
}

function renderMonthsView() {
    document.getElementById('table-view').classList.add('hidden');
    const container = document.getElementById('months-view');
    container.style.display = 'grid';
    container.innerHTML = '';
    
    const months = getAvailableMonths();
    months.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'month-btn';
        btn.textContent = `${item.month} - ${item.year}`;
        btn.onclick = () => { currentFinMonth = item.key; openMonthReport(item.year, item.month); };
        container.appendChild(btn);
    });
}

function showMonthsView() {
    currentFinMonth = '';
    document.getElementById('table-view').classList.add('hidden');
    document.getElementById('months-view').style.display = 'grid';
}

function openMonthReport(year, month) {
    document.getElementById('months-view').style.display = 'none';
    document.getElementById('table-view').classList.remove('hidden');
    document.getElementById('current-month-title').textContent = `تقرير شهر ${month} - ${year}`;

    const tbody = document.getElementById('table-body');
    tbody.innerHTML = ''; 

    let mSales = 0, mProfit = 0, mExpenses = 0, mNet = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // دمج ذكي: جلب الداتا القديمة أولاً إن وجدت
    const legacyMonthKey = `${year}/${month}`;
    const legacyMonthData = (typeof pharmacyData !== 'undefined' && pharmacyData[legacyMonthKey]) ? pharmacyData[legacyMonthKey] : {};
    // جلب الداتا السحابية
    const cloudMonthKey = `${year}_${month}`;
    const cloudMonthData = cloudFinancialData[cloudMonthKey] || {};

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month - 1, day);
        const dayName = daysInArabic[dateObj.getDay()];
        
        // الأولوية للداتا السحابية، ثم القديمة، ثم أصفار
        const dayRecord = cloudMonthData[day] || legacyMonthData[day] || { sales: 0, profit: 0, expenses: 0, details: "-" };
        
        // لا نعرض الأيام المستقبلية الفارغة بالكامل
        if(dayRecord.sales === 0 && dayRecord.expenses === 0 && new Date() < dateObj) continue;

        const netDaily = dayRecord.sales - dayRecord.expenses;
        mSales += dayRecord.sales; mProfit += dayRecord.profit; 
        mExpenses += dayRecord.expenses; mNet += netDaily;
        
        const editSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
        const delSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

        tbody.innerHTML += `<tr>
            <td>${dayName}</td><td>${year}/${month}/${day}</td>
            <td>${formatMoney(dayRecord.sales)}</td><td>${formatMoney(dayRecord.profit)}</td>
            <td>${formatMoney(dayRecord.expenses)}</td><td>${dayRecord.details || '-'}</td>
            <td class="highlight-net">${formatMoney(netDaily)}</td>
            <td>
                <div class="actions-cell">
                    <button class="icon-btn icon-edit" onclick="editFinRecord('${year}_${month}', ${day}, ${dayRecord.sales}, ${dayRecord.profit}, ${dayRecord.expenses}, '${dayRecord.details || ''}')">${editSvg}</button>
                    <button class="icon-btn icon-delete" onclick="deleteFinRecord('${year}_${month}', ${day})">${delSvg}</button>
                </div>
            </td>
        </tr>`;
    }

    document.getElementById('total-sales').textContent = formatMoney(mSales);
    document.getElementById('total-profit').textContent = formatMoney(mProfit); 
    document.getElementById('total-profit-percent').textContent = (mSales > 0 ? (mProfit/mSales)*100 : 0).toFixed(2) + '%';
    document.getElementById('total-expenses').textContent = formatMoney(mExpenses);
    document.getElementById('total-net').textContent = formatMoney(mNet);
}

        const netDaily = dayRecord.sales - dayRecord.expenses;
        mSales += dayRecord.sales; mProfit += dayRecord.profit; 
        mExpenses += dayRecord.expenses; mNet += netDaily;

        tbody.innerHTML += `<tr>
            <td>${dayName}</td><td>${year}/${month}/${day}</td>
            <td>${formatMoney(dayRecord.sales)}</td><td>${formatMoney(dayRecord.profit)}</td>
            <td>${formatMoney(dayRecord.expenses)}</td><td>${dayRecord.details || '-'}</td>
            <td class="highlight-net">${formatMoney(netDaily)}</td>
        </tr>`;
    }

    document.getElementById('total-sales').textContent = formatMoney(mSales);
    document.getElementById('total-profit').textContent = formatMoney(mProfit); 
    document.getElementById('total-profit-percent').textContent = (mSales > 0 ? (mProfit/mSales)*100 : 0).toFixed(2) + '%';
    document.getElementById('total-expenses').textContent = formatMoney(mExpenses);
    document.getElementById('total-net').textContent = formatMoney(mNet);
}

function submitFinancialRecord(e) {
    e.preventDefault();
    const dateVal = document.getElementById('fin-date').value;
    if(!dateVal) return;
    
    const [yyyy, mm, dd] = dateVal.split('-');
    const monthKey = `${yyyy}_${parseInt(mm)}`;
    const dayKey = parseInt(dd);

    const record = {
        sales: parseFloat(document.getElementById('fin-sales').value),
        profit: parseFloat(document.getElementById('fin-profit').value),
        expenses: parseFloat(document.getElementById('fin-expenses').value),
        details: document.getElementById('fin-details').value || "-"
    };

    db.ref(`financial_records/${monthKey}/${dayKey}`).set(record)
        .then(() => {
            closeModal('fin-modal');
            document.getElementById('fin-form').reset();
            showToast("تم حفظ السجل اليومي بنجاح!");
        })
        .catch(err => alert("حدث خطأ أثناء الحفظ."));
}
function editFinRecord(monthKey, day, sales, profit, expenses, details) {
    const yyyy = monthKey.split('_')[0];
    const mm = String(monthKey.split('_')[1]).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    
    document.getElementById('fin-date').value = `${yyyy}-${mm}-${dd}`;
    document.getElementById('fin-sales').value = sales;
    document.getElementById('fin-profit').value = profit;
    document.getElementById('fin-expenses').value = expenses;
    document.getElementById('fin-details').value = details !== '-' ? details : '';
    document.getElementById('fin-modal-title').innerText = "تعديل السجل اليومي";
    openModal('fin-modal');
}

function deleteFinRecord(monthKey, day) {
    if(confirm("هل أنت متأكد من تصفير سجلات هذا اليوم؟")) {
        const record = { sales: 0, profit: 0, expenses: 0, details: "-" };
        db.ref(`financial_records/${monthKey}/${day}`).set(record).then(() => {
            showToast("تم تصفير السجل بنجاح!");
        });
    }
}
// ---------------------------------------------------------
// نظام إستحقاقات المذاخر: المنطق
// ---------------------------------------------------------
function switchDuesTab(tab) {
    document.getElementById('invoices-section').classList.toggle('hidden', tab !== 'invoices');
    document.getElementById('cart-section').classList.toggle('hidden', tab !== 'cart');
    document.getElementById('btn-tab-invoices').classList.toggle('active', tab === 'invoices');
    document.getElementById('btn-tab-cart').classList.toggle('active', tab === 'cart');
    if(tab === 'cart') renderCart();
}

function calculateStatus(dateStr, validDays) {
    const dueDate = new Date(dateStr);
    dueDate.setDate(dueDate.getDate() + parseInt(validDays));
    const today = new Date();
    today.setHours(0,0,0,0); dueDate.setHours(0,0,0,0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { category: 'red', text: 'تجاوز فترة الإستحقاق', days: diffDays };
    if (diffDays >= 0 && diffDays <= 10) return { category: 'orange', text: `مستحق التسديد (باقي ${diffDays} يوم)`, days: diffDays };
    if (diffDays > 10 && diffDays < 20) return { category: 'yellow', text: `تسديد إختياري (باقي ${diffDays} يوم)`, days: diffDays };
    return { category: 'yellowgreen', text: `تسديد إختياري (باقي ${diffDays} يوم)`, days: diffDays };
}

function processInvoices() {
    return cloudInvoices
        .filter(inv => !paidInvoices.includes(inv.id))
        .map(inv => ({ ...inv, status: calculateStatus(inv.date, inv.validDays) }))
        .sort((a, b) => a.status.days - b.status.days);
}

function populateFilters() {
    const wholesalers = [...new Set(cloudInvoices.map(inv => inv.wholesaler))];
    const select = document.getElementById('wholesaler-filter');
    select.innerHTML = '<option value="all">كل المذاخر</option>';
    wholesalers.forEach(w => select.innerHTML += `<option value="${w}">${w}</option>`);
}

function renderInvoices() {
    const tbody = document.getElementById('invoices-body');
    tbody.innerHTML = '';
    const wFilter = document.getElementById('wholesaler-filter').value;
    const sFilter = document.getElementById('status-filter').value;
    
    let invoices = processInvoices();
    if(wFilter !== 'all') invoices = invoices.filter(inv => inv.wholesaler === wFilter);
    if(sFilter !== 'all') invoices = invoices.filter(inv => inv.status.category === sFilter);

    const editSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    const delSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

    let count = 1;
    invoices.forEach(inv => {
        if(cart.some(c => c.id === inv.id)) return;
        const remainingText = inv.remainingAmount ? formatMoney(inv.remainingAmount) : ''; // يترك فارغاً إذا لم يكن هناك متبقي
        
        tbody.innerHTML += `
            <tr class="status-${inv.status.category}">
                <td>${count++}</td><td>${inv.wholesaler}</td><td>${inv.date}</td>
                <td>${formatMoney(inv.amount)}</td><td style="color: #dc2626; font-weight:bold;">${remainingText}</td><td>${inv.status.text}</td>
                <td>
                    <div class="actions-cell">
                        <button class="add-cart-btn" onclick="addToCart('${inv.id}')" style="margin-left: 5px;">+ سلة</button>
                        <button class="icon-btn icon-edit" onclick="editInvoice('${inv.id}')">${editSvg}</button>
                        <button class="icon-btn icon-delete" onclick="deleteInvoice('${inv.id}')">${delSvg}</button>
                    </div>
                </td>
            </tr>`;
    });
}

function renderCart() {
    const tbody = document.getElementById('cart-body');
    tbody.innerHTML = '';
    let total = 0;
    cart.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((inv, i) => {
        const status = calculateStatus(inv.date, inv.validDays);
        const effectiveAmount = inv.remainingAmount ? inv.remainingAmount : inv.amount;
        total += effectiveAmount;
        
        const remainingText = inv.remainingAmount ? formatMoney(inv.remainingAmount) : '';
        tbody.innerHTML += `
            <tr class="status-${status.category}">
                <td>${i + 1}</td><td>${inv.wholesaler}</td><td>${inv.date}</td>
                <td>${formatMoney(inv.amount)}</td><td style="color: #dc2626; font-weight:bold;">${remainingText}</td><td>${status.text}</td>
            </tr>`;
    });
    document.getElementById('cart-total-amount').innerText = formatMoney(total);
    document.getElementById('cart-wholesaler-name').innerText = cart.length > 0 ? cart[0].wholesaler : '---';
}

function openInvoiceModal() {
    document.getElementById('invoice-form').reset();
    document.getElementById('inv-edit-id').value = '';
    document.getElementById('inv-modal-title').innerText = "إضافة قائمة شراء جديدة";
    openModal('invoice-modal');
}

function editInvoice(id) {
    const inv = cloudInvoices.find(i => i.id === id);
    if(inv) {
        document.getElementById('inv-edit-id').value = inv.id;
        document.getElementById('inv-wholesaler').value = inv.wholesaler;
        document.getElementById('inv-date').value = inv.date;
        document.getElementById('inv-amount').value = inv.amount;
        document.getElementById('inv-remaining').value = inv.remainingAmount || '';
        document.getElementById('inv-days').value = inv.validDays;
        document.getElementById('inv-modal-title').innerText = "تعديل قائمة الشراء";
        openModal('invoice-modal');
    }
}

function deleteInvoice(id) {
    if(confirm("تحذير: هل أنت متأكد من حذف هذه القائمة بشكل نهائي؟")) {
        db.ref(`dues_invoices/${id}`).remove().then(() => showToast("تم حذف القائمة!"));
    }
}

function submitInvoiceRecord(e) {
    e.preventDefault();
    const editId = document.getElementById('inv-edit-id').value;
    const uniqueId = editId ? editId : 'INV-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 100);
    
    const remVal = document.getElementById('inv-remaining').value;
    const record = {
        id: uniqueId,
        wholesaler: document.getElementById('inv-wholesaler').value,
        date: document.getElementById('inv-date').value,
        amount: parseFloat(document.getElementById('inv-amount').value),
        validDays: parseInt(document.getElementById('inv-days').value)
    };
    if (remVal && parseFloat(remVal) > 0) record.remainingAmount = parseFloat(remVal);

    db.ref(`dues_invoices/${uniqueId}`).set(record).then(() => {
        closeModal('invoice-modal');
        document.getElementById('invoice-form').reset();
        populateFilters();
        showToast(editId ? "تم التعديل بنجاح!" : "تم إضافة القائمة بنجاح!");
    });
}

function addToCart(id) {
    const inv = cloudInvoices.find(i => i.id === id);
    if (cart.length > 0 && cart[0].wholesaler !== inv.wholesaler) {
        return alert("تنبيه: لا يمكن جمع قوائم من مذاخر مختلفة في سلة واحدة للتسديد.");
    }
    cart.push(inv);
    renderInvoices();
    if(!document.getElementById('cart-section').classList.contains('hidden')) renderCart();
    showToast(`تم إضافة قائمة ${inv.wholesaler} للسلة`);
}

function checkout() {
    if(cart.length === 0) return alert("سلة التسديد فارغة.");
    if(confirm("تأكيد العملية: هل أنت متأكد من تسديد هذه القوائم؟ سيتم أرشفة العملية سحابياً لجميع الأجهزة.")) {
        cart.forEach(inv => paidInvoices.push(inv.id));
        cartsHistory.push({
            datePaid: new Date().toLocaleDateString('en-GB'),
            wholesaler: cart[0].wholesaler,
            total: cart.reduce((sum, inv) => sum + inv.amount, 0)
        }); // تم إزالة تفاصيل القوائم من الهيستوري لتخفيف حجم الداتا المحفوظة مستقبلاً

        db.ref('dues_system').set({ paidInvoices, cartsHistory })
            .then(() => {
                cart = []; 
                switchDuesTab('invoices');
                showToast("تم التسديد وحفظ الأرشيف بنجاح!");
            })
            .catch(err => alert("حدث خطأ في الاتصال بالإنترنت."));
    }
}

function showHistory() {
    if(cartsHistory.length === 0) return alert("لا يوجد أرشيف للسلات السابقة.");
    let msg = "أرشيف التسديدات:\n\n";
    cartsHistory.forEach((h, i) => {
        msg += `تسديد رقم ${i+1} | المذخر: ${h.wholesaler} | التاريخ: ${h.datePaid} | المبلغ: ${formatMoney(h.total)}\n`;
    });
    alert(msg);
}
// ================= خوارزمية السداد التلقائي (Auto-Cart) =================
function openAutoCartModal() {
    const wholesalers = [...new Set(processInvoices().map(inv => inv.wholesaler))];
    const select = document.getElementById('auto-wholesaler');
    select.innerHTML = '';
    wholesalers.forEach(w => select.innerHTML += `<option value="${w}">${w}</option>`);
    
    document.getElementById('auto-cart-form').reset();
    document.getElementById('auto-total-power').innerText = "0 د.ع";
    openModal('auto-cart-modal');
}

function syncDiscount(changedField) {
    const payment = parseFloat(document.getElementById('auto-payment').value) || 0;
    const percentInput = document.getElementById('auto-discount-percent');
    const valInput = document.getElementById('auto-discount-val');
    
    if (changedField === 'percent') {
        const p = parseFloat(percentInput.value) || 0;
        valInput.value = payment > 0 ? ((payment * p) / 100).toFixed(0) : '';
    } else if (changedField === 'val') {
        const v = parseFloat(valInput.value) || 0;
        percentInput.value = payment > 0 ? ((v / payment) * 100).toFixed(2) : '';
    }
    
    const finalVal = parseFloat(valInput.value) || 0;
    document.getElementById('auto-total-power').innerText = formatMoney(payment + finalVal) + " د.ع";
}

function executeAutoCart(e) {
    e.preventDefault();
    const wholesaler = document.getElementById('auto-wholesaler').value;
    const payment = parseFloat(document.getElementById('auto-payment').value) || 0;
    const discount = parseFloat(document.getElementById('auto-discount-val').value) || 0;
    
    let buyingPower = payment + discount;
    if (buyingPower <= 0) return alert("مبلغ التسديد غير صالح!");
    
    // جلب قوائم المذخر المحدد فقط، وترتيبها من الأقدم للأحدث (FIFO)
    let targetInvoices = processInvoices()
        .filter(inv => inv.wholesaler === wholesaler)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
        
    if (targetInvoices.length === 0) return alert("لا توجد قوائم مستحقة لهذا المذخر.");

    let updates = {}; // لتحديث الفايربيس دفعة واحدة
    let localPaid = [...paidInvoices];
    let totalAssigned = 0;

    for (let i = 0; i < targetInvoices.length; i++) {
        if (buyingPower <= 0) break;
        
        let inv = targetInvoices[i];
        let debt = inv.remainingAmount ? inv.remainingAmount : inv.amount;
        
        if (buyingPower >= debt) {
            // تسديد القائمة بالكامل
            buyingPower -= debt;
            totalAssigned += debt;
            localPaid.push(inv.id);
            // إذا كان بها متبقي سابق، نزيله من الداتابيس لتنظيفها
            if(inv.remainingAmount) {
                let updatedInv = {...inv};
                delete updatedInv.remainingAmount;
                delete updatedInv.status; // لا نحفظ الحالة المحسوبة
                updates[`dues_invoices/${inv.id}`] = updatedInv;
            }
        } else {
            // تسديد جزئي للقائمة (نصل هنا والمبلغ يصفر بعدها)
            let newRemaining = debt - buyingPower;
            totalAssigned += buyingPower;
            buyingPower = 0;
            
            let updatedInv = {...inv, remainingAmount: newRemaining};
            delete updatedInv.status; // لا نحفظ الحالة المحسوبة في الداتابيس
            updates[`dues_invoices/${inv.id}`] = updatedInv;
        }
    }

    if (totalAssigned === 0) return;

    // أرشفة العملية
    cartsHistory.push({
        datePaid: new Date().toLocaleDateString('en-GB'),
        wholesaler: wholesaler,
        total: totalAssigned,
        type: "Auto-Cart"
    });

    // تحديث قاعدة البيانات دفعة واحدة لضمان الاستقرار
    db.ref().update({
        'dues_system/paidInvoices': localPaid,
        'dues_system/cartsHistory': cartsHistory,
        ...updates
    }).then(() => {
        closeModal('auto-cart-modal');
        showToast("تم تنفيذ السداد التلقائي وترحيل المبالغ بنجاح!");
    }).catch(err => alert("حدث خطأ في الشبكة."));
}
