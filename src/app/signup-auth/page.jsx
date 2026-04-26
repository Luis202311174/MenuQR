"use client";

import { Suspense } from "react";
import SignupAuthPageClient from "./SignupAuthPageClient";

export default function SignupAuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupAuthPageClient />
    </Suspense>
  );
}