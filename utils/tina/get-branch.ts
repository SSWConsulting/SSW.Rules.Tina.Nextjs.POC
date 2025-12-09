import { cookies } from "next/headers";

export const getBranch = async (isAdmin?: boolean) => {
  try {
    // If not admin, always return "main" branch
    if (isAdmin === false) {
      return "main";
    }

    const cookieStore = await cookies();
    return cookieStore.get("x-branch")?.value || "";
  } catch (error) {
    // During build time or when cookies are not available, return empty string
    // This is safe because cookies() may not be available during static generation
    return "";
  }
};

export const getFetchOptions = async (isAdmin?: boolean) => {
  const branch = await getBranch(isAdmin);
  return branch
    ? {
        fetchOptions: {
          headers: {
            "x-branch": branch,
          },
        },
      }
    : undefined;
};
