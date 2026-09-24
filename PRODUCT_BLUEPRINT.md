# 🌾 Chakki Mitra: Product Blueprint & Feature Roadmap

**Version:** 2.0 (Monetization & Growth Update)  
**Last Updated:** September 24, 2026  
**Status:** Ready for Local Beta Testing (4-5 Shops)

---

## 🎯 1. Project Vision & Core Value
**Chakki Mitra** ek offline-first, lightweight digital khata app hai jo khaas taur par local Aata Chakki (Flour Mill) owners ke liye design kiya gaya hai. 
- **Core Problem Solved**: Kagaz ke bahi khate ka kho jana, udhaar bhool jana, aur customers ko yaad dilane mein sharam aana.
- **Unique Advantage**: **Zero Server Cost for SMS**. App user ke phone ke apne SIM (`BackgroundSms` native plugin) se SMS bhejta hai, jisse backend ka kharcha ₹0 hai aur 100% profit margin possible hai.

---

## 🚀 2. Go-To-Market (GTM) Strategy
1. **Direct APK Distribution**: Google Play Store ki strict SMS permission policy se bachne ke liye, shuruwat mein app ko direct APK (via Vercel landing page or WhatsApp) ke through distribute kiya jayega.
2. **Ground-Level Onboarding**: Founder physically 4-5 local chakki owners ke paas jayega.
   - *Pitch*: "Bhaiya, hisaab kabhi nahi bhulenge aur customer ko automatic SMS chala jayega. Main abhi aapke phone mein free mein set up karke deta hoon."
   - *Action*: Founder khud pehla customer add karega aur ek live test SMS bhej kar demo dega.

---

## ✨ 3. Feature Breakdown

### A. Core Features (Already Implemented)
- ⚡ **Quick Entry**: 10-second billing (Atta/Dalia toggle, weight → auto amount).
- 📒 **KhataBook**: Dues-wise sorted list, per-customer summary, payment modal.
- 📴 **Offline-First**: Bina internet ke full app functionality, auto-sync on reconnect.
- 📱 **Native SMS**: Custom Java plugin for background SMS without server API costs.

### B. 🪙 New: Token & Credit System (Monetization)
- **Free Tier**: Har naye user ko sign-up par **50 Free SMS Tokens** milenge.
- **Pro Tier (₹99/month or ₹499/year)**: **Unlimited SMS Tokens** + WhatsApp Bill Sharing + Advanced Sales Reports.
- **Micro Top-up**: Agar tokens khatam ho jayein, toh user Razorpay UPI ke through ₹10-₹20 mein 50 tokens khareed sakta hai.

### C. 🤝 New: Referral System
- Har user ko ek unique `Referral Code` milega (e.g., `RAMCHAKKI88`).
- **Reward**: Jab koi naya user is code ke saath sign-up karega, toh **Referrer aur Referee dono ko 20 Free SMS Tokens** milenge.
- **Goal**: Local chakki owners ke tight network ka fayda uthakar organic, zero-cost user acquisition.

---

## 🛠️ 4. Technical Implementation Details

### A. Database Schema Updates (Supabase / PostgreSQL)
`shops` ya `users` table mein ye naye columns add karne hain:
```sql
-- Add SMS Credit System
ALTER TABLE shops ADD COLUMN sms_credits INTEGER DEFAULT 50;

-- Add Referral System
ALTER TABLE shops ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE shops ADD COLUMN referred_by TEXT; -- Stores the referrer's shop_id or phone
```

### B. SMS Sending Logic Flow
1. User "Send SMS" button dabata hai.
2. Backend check karta hai: `SELECT sms_credits FROM shops WHERE id = current_user`.
3. **IF `sms_credits > 0`**:
   - Credit ko 1 se kam karo (`UPDATE shops SET sms_credits = sms_credits - 1`).
   - Capacitor `BackgroundSms` plugin trigger karo.
   - Success toast dikhao: "SMS bheja gaya! (Shesh Credits: X)".
4. **IF `sms_credits == 0`**:
   - SMS block karo.
   - Ek Modal/Popup dikhao: *"Aapke free SMS credits khatam ho gaye hain! Pro plan lein (Unlimited) ya dost ko invite karke 20 free credits paayein."*

### C. UI/UX Requirements & Disclaimers
Kyunki SMS user ke mobile balance se kat raha hai, transparency bahut zaroori hai. Har SMS screen ke niche ye disclaimer hona chahiye:
> ⚠️ **ध्यान दें:** यह SMS आपके मोबाइल के मुख्य बैलेंस (₹1/SMS) से कटेगा। कृपया अपना प्रीपेड बैलेंस चेक करें। यह ऐप सर्वर से SMS नहीं भेजता।

---

## ⚠️ 5. Rules & Constraints
1. **No Play Store (Initially)**: Custom background SMS plugins are heavily restricted by Google Play. Rely on direct APK sharing until the user base is large enough to apply for special SMS permission grants, or pivot to WhatsApp-first sharing.
2. **Transparency**: Never hide the fact that the SMS cost is borne by the user's SIM card. This builds long-term trust.
3. **Simplicity**: The referral and top-up UI must be in simple Hindi, with large buttons, suitable for non-tech-savvy shop owners.

---

## ✅ 6. Next Action Steps (For Developer)
- [ ] Run the SQL migrations to add `sms_credits`, `referral_code`, and `referred_by` columns.
- [ ] Create a "Refer & Earn" screen in the app showing the user's unique code and current credit balance.
- [ ] Implement the credit-check logic before triggering the native `BackgroundSms` plugin.
- [ ] Add the Hindi disclaimer UI component to the billing/SMS screen.
- [ ] Build a simple "Upgrade to Pro" modal that triggers when credits hit 0.
- [ ] **Field Test**: Install the updated APK on 4-5 local shops and observe their interaction with the credit/referral system.

---
*🌾 Chakki Mitra — Har pisai ka hisaab, har grahak ka vishwaas.*
