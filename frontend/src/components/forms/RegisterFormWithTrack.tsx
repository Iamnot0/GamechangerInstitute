"use client";

import { useSearchParams } from "next/navigation";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { enquiryKinds, type EnquiryKind } from "@/lib/enquiry";

const isKind = (value: string | null): value is EnquiryKind => enquiryKinds.includes(value as EnquiryKind);

export function RegisterFormWithTrack() {
  const track = useSearchParams().get("track");
  const kind = isKind(track) ? track : "individual";
  return <RegisterForm key={kind} initialKind={kind} />;
}
