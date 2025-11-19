import express from "express";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { Telegraf } from 'telegraf';

// === Load Environment Variables ===
dotenv.config();
const app = express();
app.use(express.json());

// === Groq Client ===
const groqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY || "your_groq_key_here"
});

// === Telegram Bot ===
const bot = new Telegraf(process.env.BOT_TOKEN || "your_bot_token_here");

// === API Routes ===
app.get("/", (req, res) => {
    res.json({ 
        message: "🚀 TopPrix-DZ API is running!",
        version: "1.0.0",
        status: "active"
    });
});

app.post("/search", async (req, res) => {
    try {
        const { product } = req.body;
        
        const response = await groqClient.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                { 
                    role: "user", 
                    content: `اعطني أسعار ${product} في الأسواق الجزائرية مع أماكن البيع في تيك توك، فيسبوك، وانستقرام. قدم النتائج بتنسيق منظم للعرض في بوت تيليجرام.`
                }
            ],
        });

        res.json({
            success: true,
            product: product,
            prices: response.choices[0].message.content
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "فشل في جلب البيانات"
        });
    }
});

// === Bot Commands ===
bot.start((ctx) => {
    ctx.replyWithMarkdown(`
🛍️ *مرحباً بك في TopPrix-DZ* 🇩🇿

أنا بوت مساعد لأجد لك أفضل الأسعار في الجزائر من:
• 📱 تيك توك
• 👥 فيسبوك
• 📸 انستقرام

*كيفية الاستخدام:*
 فقط اكتب اسم المنتج الذي تبحث عنه!

*أمثلة:*
قهوة, لابتوب, هاتف, حليب, دراعة...
    `);
});

bot.help((ctx) => {
    ctx.reply("💡 ببساطة اكتب اسم المنتج الذي تريد معرفة سعره!");
});

bot.on('text', async (ctx) => {
    const productName = ctx.message.text.trim();
    if (productName.startsWith('/')) return;

    const waitingMsg = await ctx.reply(`🔍 _جاري البحث عن "${productName}"..._`, {
        parse_mode: 'Markdown'
    });

    try {
        // نتائج تجريبية للبدء
        const sampleResults = `
📦 *نتائج البحث عن "${productName}"*

🏪 *من تيك توك:*
🛒 متجر التقنية - 1500 دج ⭐⭐⭐⭐⭐
🛒 سوق الجملة - 1600 دج ⭐⭐⭐⭐

🏪 *من فيسبوك:*
🛒 بائع معتمد - 1450 دج ⭐⭐⭐⭐⭐

💎 *أفضل عرض:* 1450 دج
📞 للاستفسار: 0550xxxxxx

🕒 ${new Date().toLocaleString()}
        `;

        await ctx.reply(sampleResults, {
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });

    } catch (error) {
        await ctx.reply("❌ حدث خطأ في البحث، حاول مرة أخرى");
    } finally {
        try {
            await ctx.deleteMessage(waitingMsg.message_id);
        } catch (e) {
            console.log("Cannot delete message");
        }
    }
});

// === Start Servers ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 TopPrix-DZ API running on port ${PORT}`);
});

// Start bot only if token exists
if (process.env.BOT_TOKEN && process.env.BOT_TOKEN !== "your_bot_token_here") {
    bot.launch().then(() => {
        console.log("🤖 TopPrix-DZ Bot is running!");
    });
} else {
    console.log("⚠️  Bot token not found - Running API only");
}

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
