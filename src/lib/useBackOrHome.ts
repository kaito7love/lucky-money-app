"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/SessionContext";

/** Back-button handler: go to the home screen when signed in (a reliable
 * destination regardless of how the page was reached), otherwise fall back
 * to browser history. */
export function useBackOrHome(): () => void {
    const router = useRouter();
    const { user } = useSession();

    return () => {
        if (user) {
            router.push("/");
        } else {
            window.history.back();
        }
    };
}
