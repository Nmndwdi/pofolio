import { Suspense } from "react";
import SignInForm from "./SignInForm";

/*
 * Server component wrapper. Suspense is required because the inner client
 * form calls useSearchParams() — Next can't prerender that without a
 * boundary. The fallback is the same shape so layout doesn't shift.
 */
export default function SignInPage() {
  return (
    <Suspense fallback={<div className="h-[420px]" />}>
      <SignInForm />
    </Suspense>
  );
}
