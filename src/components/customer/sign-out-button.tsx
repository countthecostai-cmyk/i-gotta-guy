"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="outline"
      className="w-full text-danger hover:bg-danger-light"
      disabled={pending}
      onClick={() => {
        setPending(true);
        signOut();
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Sign out
    </Button>
  );
}
