import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

export { authOptions };
export const auth = () => getServerSession(authOptions); 