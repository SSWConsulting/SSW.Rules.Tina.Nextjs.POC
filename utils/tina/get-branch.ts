import { cookies } from "next/headers";

export const getBranch = async () => {
  const cookieStore = await cookies();
  return cookieStore.get("x-branch")?.value || "";
};
