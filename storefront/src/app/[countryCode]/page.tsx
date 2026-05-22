import { sdk } from "@/lib/medusa-client"

export default async function Page({
  params,
}: {
  params: { countryCode: string }
}) {
  // Region bilgisini çek
  let regionId = ""
  try {
    const { regions } = await sdk.store.region.list()
    if (regions.length > 0) {
      regionId = regions[0].id
    }
  } catch (e) {
    console.error("Failed to fetch regions:", e)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block xl:inline">Ayna Genesis</span>{" "}
          <span className="block text-blue-600 xl:inline">Storefront</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Medusa v2 backend ile entegre, AI destekli e-ticaret altyapısı hazır. 
          Bu sayfa geçici bir yer tutucudur.
        </p>
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          <div className="rounded-md shadow">
            <a
              href="#"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
            >
              Ürünleri İncele
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
