"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSelectRole = (role) => {
    setLoading(true);
    // Store the role in sessionStorage and localStorage
    sessionStorage.setItem("selectedRole", role);
    localStorage.setItem("signupRole", role);
    // Redirect to signup-auth with the role
    setTimeout(() => {
      router.push(`/signup-auth?role=${role}`);
    }, 100);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 px-4 z-50">
      {/* Modal */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full relative">
        {/* Close button */}
        <button
          onClick={() => router.push("/")}
          className="absolute top-6 right-6 text-white hover:text-gray-100 text-2xl font-semibold z-10"
        >
          ×
        </button>

        {/* Container */}
        <div className="grid md:grid-cols-2">
          {/* Left Side - Logo and Text */}
          <div className="bg-white p-12 flex flex-col items-center justify-center">
            <Image
              src="/hero-icon.png"
              alt="MenuQR Logo"
              width={300}
              height={240}
            />
          </div>

          {/* Right Side - Registration Options (Red Background) */}
          <div className="bg-[#E23838] p-12 flex flex-col justify-center">
            {/* Title */}
            <h2 className="text-center text-4xl font-bold text-white mb-10">
              Register as
            </h2>

            {/* Options Grid */}
            <div className="grid grid-cols-2 gap-6 mb-10">
              {/* Business Owner Option */}
              <button
                onClick={() => handleSelectRole("owner")}
                disabled={loading}
                className="flex flex-col items-center p-8 bg-gray-300 rounded-2xl hover:bg-gray-400 transition-all duration-300 hover:scale-105 group cursor-pointer"
              >
                {/* Icon */}
                <div className="mb-4 text-7xl">
                  🏪
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-bold text-[#111] text-center">
                  Business
                </h3>
              </button>

              {/* Menu Viewer Option */}
              <button
                onClick={() => handleSelectRole("user")}
                disabled={loading}
                className="flex flex-col items-center p-8 bg-gray-300 rounded-2xl hover:bg-gray-400 transition-all duration-300 hover:scale-105 group cursor-pointer"
              >
                {/* Icon */}
                <div className="mb-4 text-7xl">
                  👤
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-bold text-[#111] text-center">
                  User
                </h3>
              </button>
            </div>

            {/* Description */}
            <p className="text-center text-white text-base leading-relaxed">
              We offer two registration choices to ensure that both Business Owners get the management tools they need to update menus, and Customers get the personalized features needed to save and view their favorite spots.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
