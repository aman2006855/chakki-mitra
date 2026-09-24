"use client";

export default function SmsDisclaimer() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
      <p className="text-[11px] text-amber-800 leading-relaxed">
        ⚠️ <b>ध्यान दें:</b> यह SMS आपके मोबाइल के मुख्य बैलेंस (₹1/SMS) से कटेगा। कृपया अपना प्रीपेड बैलेंस चेक करें। यह ऐप सर्वर से SMS नहीं भेजता।
      </p>
    </div>
  );
}
