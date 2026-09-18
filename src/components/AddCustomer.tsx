"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
}

interface AddCustomerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: { name: string; phone: string; address: string }) => void;
  initial?: Customer;
}

export default function AddCustomer({
  isOpen,
  onClose,
  onSave,
  initial,
}: AddCustomerProps) {
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; phone?: string } = {};
    if (!name.trim()) newErrors.name = "नाम जरूरी है";
    if (!phone.trim()) newErrors.phone = "मोबाइल नंबर जरूरी है";
    if (phone.trim() && phone.length < 10) newErrors.phone = "नंबर 10 अंक का हो";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onSave({ name: name.trim(), phone: phone.trim(), address: address.trim() });
    setName("");
    setPhone("");
    setAddress("");
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {initial ? "ग्राहक संपादित करें" : "नया ग्राहक जोड़ें"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ग्राहक का नाम *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="जैसे: रामू लाल"
              className={`w-full px-3 py-2.5 rounded-lg border text-base ${
                errors.name ? "border-red-400 bg-red-50" : "border-gray-300"
              } focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              मोबाइल नंबर *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="जैसे: 9876543210"
              className={`w-full px-3 py-2.5 rounded-lg border text-base ${
                errors.phone ? "border-red-400 bg-red-50" : "border-gray-300"
              } focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none`}
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              पता (वैकल्पिक)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="जैसे: गाँव रामनगर"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-base focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-lg font-semibold text-base active:bg-orange-600 transition-colors"
          >
            <Check className="w-5 h-5" />
            {initial ? "संशोधन सेव करें" : "ग्राहक जोड़ें"}
          </button>
        </form>
      </div>
    </div>
  );
}
