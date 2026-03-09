import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/services/auth";

export const getAuthSession = cache(async () => getServerSession(authOptions));
