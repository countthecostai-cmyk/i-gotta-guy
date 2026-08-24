import Link from "next/link";
import { Clock3, HandHeart, LifeBuoy, ShieldAlert, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";

export function PendingReviewCard() {
  return (
    <Card className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand-dark">
        <Clock3 className="h-7 w-7" />
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">Your application is under review</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          Thanks for applying to be a Guy. Our team is reviewing your details — this usually takes a day or two.
          We&apos;ll notify you as soon as a decision is made. In the meantime, finish setting up your profile so
          you&apos;re ready to go the moment you&apos;re approved.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Link href="/guy/profile">
          <Button variant="primary" size="md">Finish your profile</Button>
        </Link>
        <Link href="/guy/support">
          <Button variant="outline" size="md">Contact support</Button>
        </Link>
      </div>
    </Card>
  );
}

export function RejectedCard() {
  return (
    <Card className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-light text-danger">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">Your application wasn&apos;t approved</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          We weren&apos;t able to approve your Guy application at this time. If you think this was a mistake or you&apos;d
          like more information, reach out to our support team.
        </p>
      </div>
      <Link href="/guy/support">
        <Button variant="outline" size="md">
          <LifeBuoy className="h-4 w-4" />
          Contact support
        </Button>
      </Link>
    </Card>
  );
}

export function SuspendedCard() {
  return (
    <Card className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-light text-danger">
        <ShieldOff className="h-7 w-7" />
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">Your account is suspended</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          Your Guy account has been temporarily suspended and you can&apos;t accept new jobs right now. Contact
          support for details on how to resolve this.
        </p>
      </div>
      <Link href="/guy/support">
        <Button variant="outline" size="md">
          <LifeBuoy className="h-4 w-4" />
          Contact support
        </Button>
      </Link>
    </Card>
  );
}

export function ApplyPromptCard() {
  return (
    <Card className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-trust-light text-trust-dark">
        <HandHeart className="h-7 w-7" />
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">Become a Guy</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          Turn your skills into income. Set your own schedule, pick the jobs you want, and get paid fast for the
          work you do in your neighborhood.
        </p>
      </div>
      <Link href="/guy/apply">
        <Button variant="primary" size="lg">Apply now</Button>
      </Link>
    </Card>
  );
}
