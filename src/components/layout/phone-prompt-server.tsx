import { getAuthUser } from "@/lib/auth";
import { getUserHasPhone } from "@/lib/actions/team";
import { PhonePrompt } from "@/components/layout/phone-prompt";

/**
 * Server component that checks if the user has a phone number
 * and renders the prompt if they don't.
 */
export async function PhonePromptServer() {
  const user = await getAuthUser();
  if (!user) return null;

  const hasPhone = await getUserHasPhone(user.id);

  return <PhonePrompt userId={user.id} hasPhone={hasPhone} />;
}
