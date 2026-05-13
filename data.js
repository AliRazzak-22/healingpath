// ملف data.js
// هنا تضع بياناتك اليومية. النظام سيقوم بحساب "صافي الدخل اليومي" والجمع الشهري تلقائياً.

const pharmacyData = {
    // شهر 5 لعام 2026
    "2026/5": {
        "1": { sales: 27000, profit: 6000, expenses: 17000, details: "عشر الف عشاء وسبع الف ماسحة تنظيف" },
        "2": { sales: 22000, profit: 5000, expenses: 0, details: "-" },
        "3": { sales: 51250, profit: 15000, expenses: 35000, details: "اشتراك انترنيت" },
        "4": { sales: 139750, profit: 38000, expenses: 15000, details: "نقص غير معروف في الانكم" },
        "5": { sales: 45500, profit: 12500, expenses: 0, details: "-" },
        "6": { sales: 78000, profit: 14500, expenses: 0, details: "-" },
        "7": { sales: 73000, profit: 16500, expenses: 58000, details: "50 الف اسبوعية سكرتير " },
        "8": { sales: 12500, profit: 2250, expenses: 0, details: "-" },
        "9": { sales: 6000, profit: 2000, expenses: 0, details: "-" },
        "10": { sales: 91000, profit: 23500, expenses: 195000, details: "مولدة" },
        "11": { sales: 30000, profit: 11000, expenses: 0, details: "-" },
        "12": { sales: 55250, profit: 4000, expenses: 0, details: "-" },
        "13": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "14": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "15": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "16": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "17": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "18": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "19": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "20": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "21": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "22": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "23": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "24": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "25": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "26": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "27": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "28": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "29": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "30": { sales: 0, profit: 0, expenses: 0, details: "-" },
        "31": { sales: 0, profit: 0, expenses: 0, details: "-" },
        
        // يمكنك إضافة باقي الأيام هنا بنفس الطريقة...
        // اليوم الذي لا تكتبه سيظهر كخلايا فارغة أو أصفار تلقائياً في الجدول
    },
    
    // شهر 6 لعام 2026
    "2026/6": {
        "1": { sales: 400000, profit: 150000, expenses: 10000, details: "ضيافة" }
    }
    // يمكنك إضافة أشهر جديدة مستقبلاً بنفس النمط
};
