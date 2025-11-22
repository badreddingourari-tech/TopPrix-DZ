import express from "express";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import cors from "cors";
import { bot } from './src/bots/mainBot.js';
import { IntentDetector, buildContext } from './src/services/intentDetector.js';

// === تحميل الإعدادات ===
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// === Middleware ===
app.use(cors());
app.use(express.json());

// === عميل Groq ===
let groqClient;
if (process.env.GROQ_API_KEY) {
    groqClient = new Groq({
        apiKey: process.env.GROQ_API_KEY,
    });
} else {
    console.log("⚠️  GROQ_API_KEY غير موجود - ميزة AI غير مفعلة");
}

// === مسارات API ===

// الصفحة الرئيسية
app.get("/", (req, res) => {
    res.json({
        status: "✅ Active",
        project: "TopPrix-DZ",
        message: "API is running successfully! 🚀",
        endpoints: {
            agent: "POST /agent - الدردشة مع AI",
            search: "POST /api/search - البحث عن المنتجات",
            health: "GET /health - حالة النظام"
        }
    });
});

// مسار الـ Agent المحسن
app.post("/agent", async (req, res) => {
    try {
        // إذا لم يكن Groq مفعلاً
        if (!groqClient) {
            return res.json({
                success: true,
                response: "مرحباً! أنا بوت TopPrix-DZ. حالياً ميزة AI غير مفعلة. يمكنك استخدام /api/search للبحث عن المنتجات.",
                context: {
                    intent: "greeting",
                    product: null,
                    isPriceComparison: false
                }
            });
        }

        const userMessage = req.body.message;

        if (!userMessage) {
            return res.status(400).json({ error: "الرسالة مطلوبة" });
        }

        // استخدام intent detection محسن
        const context = buildContext(userMessage);

        const response = await groqClient.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content: `أنت مساعد متخصص في الأسواق والأسعار الجزائرية. 

معلومات السياق:
- نية المستخدم: ${context.intent}
- المنتج المطلوب: ${context.product || 'غير محدد'}
- نوع الطلب: ${context.isPriceComparison ? 'مقارنة أسعار' : 'بحث عادي'}

قم بمساعدة المستخدم في:
• البحث عن أسعار المنتجات في الجزائر
• مقارنة الأسعار بين المتاجر
• تقديم نصائح شراء ذكية
• الرد على استفسارات السوق الجزائري

كن دقيقاً ومفيداً في إجاباتك.`
                },
                {
                    role: "user",
                    content: userMessage
                }
            ],
            temperature: 0.7,
            max_tokens: 1024
        });

        const aiResponse = response.choices[0]?.message?.content || "عذراً، لم أستطع معالجة طلبك.";

        res.json({ 
            success: true,
            response: aiResponse,
            context: {
                intent: context.intent,
                product: context.product,
                isPriceComparison: context.isPriceComparison
            }
        });

    } catch (error) {
        console.error("Groq API error:", error);
        res.status(500).json({ 
            error: "فشل في معالجة الطلب",
            details: error.message 
        });
    }
});

// مسار البحث عن المنتجات
app.post('/api/search', async (req, res) => {
    try {
        const { query, userId } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: '⛔ يرجى إدخال كلمة البحث'
            });
        }

        // استخدام intent detection لتحديد نوع البحث
        const intent = IntentDetector.detect(query);
        const product = IntentDetector.extractProduct(query);

        console.log(`🔍 بحث جديد: "${query}" | النية: ${intent} | المنتج: ${product}`);

        // محاكاة نتائج البحث (سيتم استبدالها بالخدمات الفعلية)
        const mockResults = [
            {
                title: `${product || query} - سوق واد كنيس`,
                price: "2500 دج",
                source: "OuedKniss",
                location: "الجزائر العاصمة",
                rating: "4.2/5"
            },
            {
                title: `${product || query} - متجر إلكتروني`,
                price: "2700 دج",
                source: "Jumia",
                location: "عبر الإنترنت",
                rating: "4.5/5"
            },
            {
                title: `${product || query} - سوق محلي`,
                price: "2300 دج",
                source: "السوق المحلي",
                location: "باب الواد",
                rating: "4.0/5"
            }
        ];

        res.json({
            success: true,
            query: query,
            intent: intent,
            product: product,
            results: mockResults,
            totalResults: mockResults.length,
            message: "سيتم تحسين النتائج قريباً مع إضافة المزيد من المصادر"
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في الخادم الداخلي' 
        });
    }
});

// مسار الصحة
app.get('/health', (req, res) => {
    res.json({ 
        status: '✅ Active', 
        project: 'TopPrix-DZ',
        version: '2.0',
        timestamp: new Date().toISOString(),
        features: [
            "AI Assistant with Groq",
            "Intent Detection", 
            "Product Search",
            "Price Comparison"
        ]
    });
});

// معلومات النظام
app.get('/info', (req, res) => {
    res.json({
        name: "TopPrix-DZ",
        description: "بوت ذكي لمقارنة الأسعار في الجزائر",
        version: "2.0",
        author: "TopPrix Team",
        endpoints: [
            "GET / - الصفحة الرئيسية",
            "POST /agent - الدردشة الذكية",
            "POST /api/search - البحث عن المنتجات", 
            "GET /health - حالة النظام",
            "GET /info - معلومات المشروع"
        ]
    });
});

// === تشغيل السيرفر ===
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║           🚀 TopPrix-DZ             ║
║      Algerian Price Bot v2.0        ║
║                                     ║
║  🌐 http://localhost:${PORT}           ║
║  ✅ Server is running successfully! ║
╚══════════════════════════════════════╝
    `);
});

// === تشغيل بوت التلغرام ===
const BOT_TOKEN = process.env.BOT_TOKEN;
if (BOT_TOKEN && BOT_TOKEN !== "ضع توكين البوت هنا") {
    bot.launch().then(() => {
        console.log("🤖 بوت التلغرام يعمل بنجاح ✅");
    }).catch(error => {
        console.error("❌ فشل في تشغيل البوت:", error);
    });
} else {
    console.log("⚠️  لم يتم وضع التوكن - البوت غير نشط");
}

// === إدارة إيقاف البوت ===
process.once('SIGINT', () => {
    console.log("🛑 إيقاف البوت...");
    bot.stop('SIGINT');
    process.exit(0);
});

process.once('SIGTERM', () => {
    console.log("🛑 إيقاف البوت...");
    bot.stop('SIGTERM');
    process.exit(0);
});

// معالجة الأخطاء غير المتوقعة
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});
