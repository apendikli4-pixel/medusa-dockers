import { logoutAction } from "@/actions/customer"

export default function LogoutButton({ countryCode }: { countryCode: string }) {
    return (
        <form action={logoutAction}>
            <input type="hidden" name="countryCode" value={countryCode} />
            <button type="submit" className="ag-link-button">
                Çıkış yap
            </button>
        </form>
    )
}
