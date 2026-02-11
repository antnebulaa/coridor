import { redirect } from "next/navigation";

interface AddContactPageProps {
    params: Promise<{
        code: string;
    }>;
}

export default async function AddContactPage({ params }: AddContactPageProps) {
    const { code } = await params;
    redirect(`/contacts?code=${code}`);
}
